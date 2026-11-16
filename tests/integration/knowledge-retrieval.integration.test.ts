import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  indexPendingKnowledge,
  knowledgeIndexerConfig,
} from "../../src/server/knowledge/indexer";
import { addKnowledgeDocument } from "../../src/server/knowledge/knowledge-service";
import {
  knowledgeQueryText,
  retrieveKnowledgeForGeneration,
} from "../../src/server/knowledge/retrieval";

// L6 B5: passages for a generation — off by default, scoped to the project,
// within the token budget, and never failing the generation.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
let server: Server;
let baseUrl = "";
let failing = false;

// Embedding stand-in: 1024 dims, one bucket per keyword.
const keywords = ["sola", "borracha", "garantia", "café", "envio"];
const fakeEmbedding = (text: string) =>
  Array.from({ length: 1024 }, (_, i) =>
    i < keywords.length && text.toLowerCase().includes(keywords[i]!)
      ? 1
      : 0.001,
  );

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    request.on("end", () => {
      if (failing) {
        response.writeHead(500).end();
        return;
      }
      const body = JSON.parse(raw) as { input: string[] };
      response.end(
        JSON.stringify({ embeddings: body.input.map(fakeEmbedding) }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  await prisma.user.upsert({
    where: { id: "retrieval-owner" },
    update: {},
    create: { id: "retrieval-owner", email: "retrieval@test.invalid" },
  });
  for (const id of ["retrieval-shoes", "retrieval-coffee"])
    await prisma.project.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId: "retrieval-owner",
        name: id,
        brandName: id,
        type: "E-commerce",
      },
    });
  await addKnowledgeDocument(prisma, "retrieval-shoes", {
    title: "Ficha técnica",
    mediaType: "text/plain",
    content:
      "A sola é de borracha natural.\n\n" +
      "Texto de enchimento sem relação. ".repeat(60),
  });
  await addKnowledgeDocument(prisma, "retrieval-coffee", {
    title: "Café",
    mediaType: "text/plain",
    content: "A sola do pacote de café é de borracha. Envio em 2 dias.",
  });
  const config = knowledgeIndexerConfig({
    KNOWLEDGE_EMBEDDING_MODEL: "bge-m3",
    AI_OLLAMA_BASE_URL: baseUrl,
  })!;
  while ((await indexPendingKnowledge(prisma, config)) > 0);
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { userId: "retrieval-owner" } });
  await prisma.user.deleteMany({ where: { id: "retrieval-owner" } });
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

const env = (overrides: Record<string, unknown> = {}) => ({
  KNOWLEDGE_IN_GENERATION_ENABLED: true,
  KNOWLEDGE_MAX_CONTEXT_TOKENS: 1_500,
  KNOWLEDGE_EMBEDDING_MODEL: "bge-m3" as const,
  AI_OLLAMA_BASE_URL: baseUrl,
  ...overrides,
});
const context = {
  request: { topic: "Que sola tem o sapato?", kind: "COPY_ITEM_NEW" },
};

describe("knowledge retrieval for generation (L6 B5)", () => {
  it("builds the query from human text only", () => {
    expect(
      knowledgeQueryText({
        request: {
          kind: "COPY_ITEM_NEW",
          topic: "Sola de borracha",
          contentType: "PRODUCT_DESCRIPTION",
        },
        provenance: { model: "x" },
      }),
    ).toBe("Sola de borracha");
  });

  it("is off unless enabled", async () => {
    expect(
      await retrieveKnowledgeForGeneration(prisma, {
        projectId: "retrieval-shoes",
        context,
        env: env({ KNOWLEDGE_IN_GENERATION_ENABLED: false }),
      }),
    ).toBeNull();
  });

  it("returns only the project's passages, with their chunk ids", async () => {
    const knowledge = await retrieveKnowledgeForGeneration(prisma, {
      projectId: "retrieval-shoes",
      context,
      env: env(),
    });
    expect(knowledge?.excerpts[0]).toMatchObject({ source: "Ficha técnica" });
    const owners = await prisma.knowledgeChunk.findMany({
      where: { id: { in: [...knowledge!.chunkIds] } },
      select: { projectId: true },
    });
    expect(new Set(owners.map((owner) => owner.projectId))).toEqual(
      new Set(["retrieval-shoes"]),
    );
  });

  it("respects the token budget", async () => {
    const knowledge = await retrieveKnowledgeForGeneration(prisma, {
      projectId: "retrieval-shoes",
      context,
      env: env({ KNOWLEDGE_MAX_CONTEXT_TOKENS: 200 }),
    });
    const tokens = (knowledge?.excerpts ?? []).reduce(
      (total, e) => total + Math.ceil(e.text.length / 4),
      0,
    );
    expect(tokens).toBeLessThanOrEqual(200);
  });

  it("generates without knowledge when Ollama fails", async () => {
    failing = true;
    const events: unknown[] = [];
    expect(
      await retrieveKnowledgeForGeneration(prisma, {
        projectId: "retrieval-shoes",
        context,
        env: env(),
        log: (event) => events.push(event),
      }),
    ).toBeNull();
    expect(events).toEqual([{ event: "knowledge.retrieval_failed" }]);
    failing = false;
  });
});
