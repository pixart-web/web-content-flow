import { createHash } from "node:crypto";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";

import { chunkText } from "./chunking";

// L6 (doc 53, B2): adding and removing a project's documents. Version 1
// accepts plain text and Markdown (decision 3); embeddings are added later by
// the worker, so adding a document never waits for the model.

export const KNOWLEDGE_MEDIA_TYPES = ["text/plain", "text/markdown"] as const;
export const KNOWLEDGE_MAX_BYTES = 2_000_000;

export const KnowledgeDocumentInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    mediaType: z.enum(KNOWLEDGE_MEDIA_TYPES),
    content: z
      .string()
      .min(1)
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= KNOWLEDGE_MAX_BYTES,
        "Documents are limited to 2 MB of text.",
      ),
  })
  .strict();

export async function addKnowledgeDocument(
  prisma: PrismaClient,
  projectId: string,
  input: z.input<typeof KnowledgeDocumentInputSchema>,
) {
  const data = KnowledgeDocumentInputSchema.parse(input);
  const contentSha256 = createHash("sha256").update(data.content).digest("hex");
  const existing = await prisma.knowledgeDocument.findUnique({
    where: { projectId_contentSha256: { projectId, contentSha256 } },
    select: { id: true },
  });
  if (existing) return { id: existing.id, duplicate: true as const };
  const chunks = chunkText(data.content);
  if (chunks.length === 0) throw new Error("The document has no text.");
  const document = await prisma.knowledgeDocument.create({
    data: {
      projectId,
      title: data.title,
      mediaType: data.mediaType,
      content: data.content,
      byteSize: Buffer.byteLength(data.content, "utf8"),
      contentSha256,
      chunks: {
        create: chunks.map((chunk) => ({ ...chunk, projectId })),
      },
    },
    select: { id: true },
  });
  return { id: document.id, duplicate: false as const };
}

// Removing a document removes its chunks (cascade) — R4.
export async function deleteKnowledgeDocument(
  prisma: PrismaClient,
  projectId: string,
  documentId: string,
) {
  const result = await prisma.knowledgeDocument.deleteMany({
    where: { id: documentId, projectId },
  });
  return result.count === 1;
}

export async function listKnowledgeDocuments(
  prisma: PrismaClient,
  projectId: string,
) {
  const documents = await prisma.knowledgeDocument.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      mediaType: true,
      byteSize: true,
      status: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });
  const indexed = await prisma.knowledgeChunk.groupBy({
    by: ["documentId"],
    where: { projectId, embedding: { not: null } },
    _count: { _all: true },
  });
  const indexedBy = new Map(
    indexed.map((row) => [row.documentId, row._count._all]),
  );
  return documents.map((document) => ({
    ...document,
    chunks: document._count.chunks,
    indexedChunks: indexedBy.get(document.id) ?? 0,
  }));
}
