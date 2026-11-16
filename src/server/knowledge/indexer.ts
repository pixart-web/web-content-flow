import type { PrismaClient } from "@/generated/prisma/client";

import {
  APPROVED_EMBEDDING_MODEL,
  embedTexts,
  type EmbeddingModelConfig,
} from "./ollama-embedder";
import { encodeVector } from "./vectors";

// L6 (doc 53, B2): the worker indexes chunks while it has no generation job.
// A chunk is pending when it has no embedding or was embedded with another
// model (R5: changing the model re-indexes instead of mixing vectors).

export const INDEX_BATCH_SIZE = 16;

export async function indexPendingKnowledge(
  prisma: PrismaClient,
  input: {
    baseUrl: string;
    model: EmbeddingModelConfig;
    modelVersion: string;
    fetchImpl?: typeof fetch;
  },
): Promise<number> {
  const modelRef = `${input.model.tag}@${input.modelVersion}`;
  const pending = await prisma.knowledgeChunk.findMany({
    where: {
      OR: [{ embedding: null }, { embeddingModel: { not: modelRef } }],
    },
    orderBy: [{ createdAt: "asc" }, { ordinal: "asc" }],
    take: INDEX_BATCH_SIZE,
    select: { id: true, text: true, documentId: true },
  });
  if (pending.length === 0) return 0;
  const vectors = await embedTexts({
    baseUrl: input.baseUrl,
    model: input.model,
    texts: pending.map((chunk) => chunk.text),
    kind: "document",
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
  });
  await prisma.$transaction(
    pending.map((chunk, index) =>
      prisma.knowledgeChunk.update({
        where: { id: chunk.id },
        data: {
          embedding: encodeVector(vectors[index]!),
          embeddingModel: modelRef,
          embeddingDims: input.model.dims,
        },
      }),
    ),
  );
  // Documents whose chunks are all embedded with this model are INDEXED.
  for (const documentId of new Set(pending.map((chunk) => chunk.documentId))) {
    const left = await prisma.knowledgeChunk.count({
      where: {
        documentId,
        OR: [{ embedding: null }, { embeddingModel: { not: modelRef } }],
      },
    });
    if (left === 0)
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: "INDEXED" },
      });
  }
  return pending.length;
}

// The worker's indexing configuration, or null when knowledge is off.
export function knowledgeIndexerConfig(env: {
  KNOWLEDGE_EMBEDDING_MODEL?: "bge-m3" | undefined;
  AI_OLLAMA_BASE_URL?: string | undefined;
}) {
  if (!env.KNOWLEDGE_EMBEDDING_MODEL || !env.AI_OLLAMA_BASE_URL) return null;
  return {
    baseUrl: env.AI_OLLAMA_BASE_URL,
    model: APPROVED_EMBEDDING_MODEL.config,
    modelVersion: APPROVED_EMBEDDING_MODEL.digest.slice(0, 12),
  };
}
