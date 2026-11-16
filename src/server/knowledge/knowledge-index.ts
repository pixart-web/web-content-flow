import type { PrismaClient } from "@/generated/prisma/client";

import { decodeVector, dot } from "./vectors";

// L6 (doc 53, B3, R1/R5): search over ONE project's indexed chunks, embedded
// with ONE model. The project id is required by the signature and applied in
// the query, so a search can never return another client's text.

export type KnowledgeHit = Readonly<{
  chunkId: string;
  documentId: string;
  documentTitle: string;
  ordinal: number;
  text: string;
  score: number;
}>;

export async function searchProjectKnowledge(
  prisma: PrismaClient,
  input: {
    projectId: string;
    embeddingModel: string;
    query: Float32Array;
    limit?: number;
    minScore?: number;
  },
): Promise<KnowledgeHit[]> {
  if (!input.projectId) throw new Error("A project is required.");
  const rows = await prisma.knowledgeChunk.findMany({
    where: {
      projectId: input.projectId,
      embeddingModel: input.embeddingModel,
      embeddingDims: input.query.length,
      embedding: { not: null },
    },
    select: {
      id: true,
      documentId: true,
      ordinal: true,
      text: true,
      embedding: true,
      document: { select: { title: true } },
    },
  });
  return rows
    .map((row) => ({
      chunkId: row.id,
      documentId: row.documentId,
      documentTitle: row.document.title,
      ordinal: row.ordinal,
      text: row.text,
      score: dot(decodeVector(row.embedding!), input.query),
    }))
    .filter((hit) => hit.score >= (input.minScore ?? 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 5);
}
