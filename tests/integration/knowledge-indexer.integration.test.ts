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

// L6 (doc 53, B2): the worker-side indexer against a fake Ollama /api/embed.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
let server: Server;
let baseUrl = "";
const requests: { model: string; inputs: number }[] = [];

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    request.on("end", () => {
      const body = JSON.parse(raw) as { model: string; input: string[] };
      requests.push({ model: body.model, inputs: body.input.length });
      response.end(
        JSON.stringify({
          embeddings: body.input.map((text) =>
            Array.from({ length: 1024 }, (_, i) => ((text.length + i) % 7) + 1),
          ),
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  await prisma.user.upsert({
    where: { id: "indexer-owner" },
    update: {},
    create: { id: "indexer-owner", email: "indexer@test.invalid" },
  });
  await prisma.project.upsert({
    where: { id: "indexer-project" },
    update: {},
    create: {
      id: "indexer-project",
      userId: "indexer-owner",
      name: "p",
      brandName: "p",
      type: "E-commerce",
    },
  });
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { userId: "indexer-owner" } });
  await prisma.user.deleteMany({ where: { id: "indexer-owner" } });
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

describe("knowledge indexer (L6 B2)", () => {
  it("is off unless an embedding model and Ollama are configured", () => {
    expect(knowledgeIndexerConfig({})).toBeNull();
    expect(
      knowledgeIndexerConfig({ KNOWLEDGE_EMBEDDING_MODEL: "bge-m3" }),
    ).toBeNull();
    expect(
      knowledgeIndexerConfig({
        KNOWLEDGE_EMBEDDING_MODEL: "bge-m3",
        AI_OLLAMA_BASE_URL: baseUrl,
      }),
    ).toMatchObject({ model: { tag: "bge-m3", dims: 1024 } });
  });

  it("embeds pending chunks in batches, marks the document indexed and re-indexes on a model change", async () => {
    await prisma.knowledgeChunk.deleteMany({ where: { embedding: null } });
    const paragraph =
      "A sola é de borracha natural com padrão em espinha. ".repeat(20);
    const { id } = await addKnowledgeDocument(prisma, "indexer-project", {
      title: "Ficha",
      mediaType: "text/markdown",
      content: Array.from({ length: 30 }, () => paragraph).join("\n\n"),
    });
    const total = await prisma.knowledgeChunk.count({
      where: { documentId: id },
    });
    expect(total).toBeGreaterThan(16);
    const config = knowledgeIndexerConfig({
      KNOWLEDGE_EMBEDDING_MODEL: "bge-m3",
      AI_OLLAMA_BASE_URL: baseUrl,
    })!;

    let indexed = 0;
    for (let round = 0; round < 10; round += 1) {
      const count = await indexPendingKnowledge(prisma, config);
      if (count === 0) break;
      expect(count).toBeLessThanOrEqual(16);
      indexed += count;
    }
    expect(indexed).toBe(total);
    expect(requests.every((request) => request.model === "bge-m3")).toBe(true);
    const document = await prisma.knowledgeDocument.findUniqueOrThrow({
      where: { id },
    });
    expect(document.status).toBe("INDEXED");
    const chunk = await prisma.knowledgeChunk.findFirstOrThrow({
      where: { documentId: id },
    });
    expect(chunk).toMatchObject({
      embeddingModel: `bge-m3@${config.modelVersion}`,
      embeddingDims: 1024,
    });
    expect(chunk.embedding?.byteLength).toBe(1024 * 4);

    // Another model version: everything becomes pending again (R5).
    const next = { ...config, modelVersion: "000000000000" };
    expect(await indexPendingKnowledge(prisma, next)).toBe(16);
  });
});
