import type { PrismaClient } from "@/generated/prisma/client";

import { estimateTokens } from "./chunking";
import { knowledgeIndexerConfig } from "./indexer";
import { searchProjectKnowledge } from "./knowledge-index";
import { embedTexts } from "./ollama-embedder";

// L6 (doc 53, B5): picks the client's own passages for a generation. The
// result is DATA for the prompt (clientKnowledge), never instructions (R6),
// bounded by a token budget (R7) and recorded in provenance (R4). Any
// failure (Ollama down, nothing indexed) means generating without it.

export type ClientKnowledge = Readonly<{
  excerpts: readonly { source: string; text: string }[];
  chunkIds: readonly string[];
}>;

// Human text of the generation context, used as the search query.
export function knowledgeQueryText(context: unknown, maxChars = 2_000) {
  const parts: string[] = [];
  const skip = new Set([
    "provenance",
    "itemKey",
    "brandProfileVersionId",
    "kind",
    "schemaVersion",
  ]);
  const visit = (value: unknown, key?: string) => {
    if (parts.join(" ").length >= maxChars || (key && skip.has(key))) return;
    if (typeof value === "string") {
      if (value.length > 2 && !/^[A-Z0-9_]+$/.test(value)) parts.push(value);
    } else if (Array.isArray(value)) value.forEach((item) => visit(item));
    else if (value && typeof value === "object")
      for (const [childKey, child] of Object.entries(value))
        visit(child, childKey);
  };
  visit(context);
  return parts.join(" ").slice(0, maxChars);
}

export async function retrieveKnowledgeForGeneration(
  prisma: PrismaClient,
  input: {
    projectId: string;
    context: unknown;
    env: {
      KNOWLEDGE_IN_GENERATION_ENABLED: boolean;
      KNOWLEDGE_MAX_CONTEXT_TOKENS: number;
      KNOWLEDGE_EMBEDDING_MODEL?: "bge-m3" | undefined;
      AI_OLLAMA_BASE_URL?: string | undefined;
    };
    log?: (event: Record<string, unknown>) => void;
    fetchImpl?: typeof fetch;
  },
): Promise<ClientKnowledge | null> {
  if (!input.env.KNOWLEDGE_IN_GENERATION_ENABLED) return null;
  const config = knowledgeIndexerConfig(input.env);
  if (!config) return null;
  const modelRef = `${config.model.tag}@${config.modelVersion}`;
  const indexed = await prisma.knowledgeChunk.count({
    where: { projectId: input.projectId, embeddingModel: modelRef },
  });
  if (indexed === 0) return null;
  const query = knowledgeQueryText(input.context);
  if (!query) return null;
  try {
    const [vector] = await embedTexts({
      baseUrl: config.baseUrl,
      model: config.model,
      texts: [query],
      kind: "query",
      timeoutMs: 30_000,
      ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    });
    const hits = await searchProjectKnowledge(prisma, {
      projectId: input.projectId,
      embeddingModel: modelRef,
      query: vector!,
      limit: 8,
      minScore: 0.3,
    });
    const excerpts: { source: string; text: string }[] = [];
    const chunkIds: string[] = [];
    let tokens = 0;
    for (const hit of hits) {
      const cost = estimateTokens(hit.text);
      if (tokens + cost > input.env.KNOWLEDGE_MAX_CONTEXT_TOKENS) continue;
      tokens += cost;
      excerpts.push({ source: hit.documentTitle, text: hit.text });
      chunkIds.push(hit.chunkId);
    }
    if (excerpts.length === 0) return null;
    input.log?.({
      event: "knowledge.retrieved",
      excerpts: excerpts.length,
      tokens,
    });
    return { excerpts, chunkIds };
  } catch {
    input.log?.({ event: "knowledge.retrieval_failed" });
    return null;
  }
}
