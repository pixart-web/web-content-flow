import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

vi.mock("server-only", () => ({}));

import { searchProjectKnowledge } from "../../src/server/knowledge/knowledge-index";
import {
  addKnowledgeDocument,
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
} from "../../src/server/knowledge/knowledge-service";
import { encodeVector, normalize } from "../../src/server/knowledge/vectors";

// L6 (doc 53, R1/R4/R5): two clients with near-identical documents; a search
// for one project must never return the other's text.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const MODEL = "test-embedding@1";

// Deterministic stand-in embedding: bag of words over a tiny vocabulary.
const vocabulary = [
  "sola",
  "borracha",
  "couro",
  "preço",
  "garantia",
  "café",
  "torra",
];
const embed = (text: string) =>
  normalize(
    vocabulary.map((word) => (text.toLowerCase().includes(word) ? 1 : 0.01)),
  );

async function indexAll(projectId: string) {
  const chunks = await prisma.knowledgeChunk.findMany({ where: { projectId } });
  for (const chunk of chunks)
    await prisma.knowledgeChunk.update({
      where: { id: chunk.id },
      data: {
        embedding: encodeVector(embed(chunk.text)),
        embeddingModel: MODEL,
        embeddingDims: vocabulary.length,
      },
    });
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: "knowledge-owner" },
    update: {},
    create: { id: "knowledge-owner", email: "knowledge@test.invalid" },
  });
  for (const id of ["knowledge-shoes", "knowledge-coffee"])
    await prisma.project.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId: "knowledge-owner",
        name: id,
        brandName: id,
        type: "E-commerce",
      },
    });
  await addKnowledgeDocument(prisma, "knowledge-shoes", {
    title: "Ficha técnica",
    mediaType: "text/markdown",
    content: "A sola é de borracha reciclada.\n\nA garantia é de dois anos.",
  });
  await addKnowledgeDocument(prisma, "knowledge-coffee", {
    title: "Catálogo de café",
    mediaType: "text/plain",
    content: "Café de torra média. A garantia de frescura é de três meses.",
  });
  await indexAll("knowledge-shoes");
  await indexAll("knowledge-coffee");
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { userId: "knowledge-owner" } });
  await prisma.user.deleteMany({ where: { id: "knowledge-owner" } });
  await prisma.$disconnect();
});

describe("client knowledge (L6)", () => {
  it("finds the relevant chunk inside the project", async () => {
    const [hit] = await searchProjectKnowledge(prisma, {
      projectId: "knowledge-shoes",
      embeddingModel: MODEL,
      query: embed("de que é feita a sola?"),
    });
    expect(hit).toMatchObject({ documentTitle: "Ficha técnica" });
    expect(hit!.text).toContain("borracha");
  });

  it("never returns another project's text, even for a shared word", async () => {
    for (const projectId of ["knowledge-shoes", "knowledge-coffee"]) {
      const hits = await searchProjectKnowledge(prisma, {
        projectId,
        embeddingModel: MODEL,
        query: embed("qual é a garantia?"),
        limit: 50,
      });
      expect(hits.length).toBeGreaterThan(0);
      const owners = await prisma.knowledgeChunk.findMany({
        where: { id: { in: hits.map((hit) => hit.chunkId) } },
        select: { projectId: true },
      });
      expect(new Set(owners.map((owner) => owner.projectId))).toEqual(
        new Set([projectId]),
      );
    }
  });

  it("ignores chunks embedded with another model or dimension", async () => {
    expect(
      await searchProjectKnowledge(prisma, {
        projectId: "knowledge-shoes",
        embeddingModel: "other-model@1",
        query: embed("sola"),
      }),
    ).toEqual([]);
  });

  it("deduplicates identical documents and removes chunks with the document", async () => {
    const again = await addKnowledgeDocument(prisma, "knowledge-shoes", {
      title: "Cópia",
      mediaType: "text/markdown",
      content: "A sola é de borracha reciclada.\n\nA garantia é de dois anos.",
    });
    expect(again.duplicate).toBe(true);
    const [listed] = await listKnowledgeDocuments(prisma, "knowledge-shoes");
    expect(listed).toMatchObject({
      title: "Ficha técnica",
      chunks: 1,
      indexedChunks: 1,
    });
    expect(
      await deleteKnowledgeDocument(prisma, "knowledge-coffee", listed!.id),
    ).toBe(false);
    expect(
      await deleteKnowledgeDocument(prisma, "knowledge-shoes", listed!.id),
    ).toBe(true);
    expect(
      await prisma.knowledgeChunk.count({
        where: { projectId: "knowledge-shoes" },
      }),
    ).toBe(0);
  });
});
