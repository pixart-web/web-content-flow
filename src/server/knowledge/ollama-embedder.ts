import { normalize } from "./vectors";

// L6 (doc 53, B2/B4): local embeddings through Ollama's /api/embed. Some
// models expect task prefixes for queries and documents; they are part of
// the model's configuration so indexing and search always agree.

export type EmbeddingModelConfig = Readonly<{
  tag: string;
  dims: number;
  queryPrefix: string;
  documentPrefix: string;
}>;

export const EMBEDDING_MODELS: Readonly<Record<string, EmbeddingModelConfig>> =
  {
    "nomic-embed-text": {
      tag: "nomic-embed-text",
      dims: 768,
      queryPrefix: "search_query: ",
      documentPrefix: "search_document: ",
    },
    "bge-m3": {
      tag: "bge-m3",
      dims: 1024,
      queryPrefix: "",
      documentPrefix: "",
    },
    "qwen3-embedding:0.6b": {
      tag: "qwen3-embedding:0.6b",
      dims: 1024,
      queryPrefix:
        "Instruct: Given a question, retrieve passages that answer it\nQuery: ",
      documentPrefix: "",
    },
  };

const withSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

export async function embedTexts(input: {
  baseUrl: string;
  model: EmbeddingModelConfig;
  texts: readonly string[];
  kind: "query" | "document";
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<Float32Array[]> {
  if (input.texts.length === 0) return [];
  const prefix =
    input.kind === "query"
      ? input.model.queryPrefix
      : input.model.documentPrefix;
  const response = await (input.fetchImpl ?? fetch)(
    new URL("api/embed", withSlash(input.baseUrl)),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model.tag,
        input: input.texts.map((text) => `${prefix}${text}`),
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 120_000),
    },
  );
  if (!response.ok)
    throw new Error(`Ollama /api/embed: HTTP ${response.status}`);
  const body = (await response.json()) as { embeddings?: number[][] };
  const embeddings = body.embeddings ?? [];
  if (embeddings.length !== input.texts.length)
    throw new Error("Ollama returned a different number of embeddings.");
  return embeddings.map((vector) => {
    if (vector.length !== input.model.dims)
      throw new Error(
        `Expected ${input.model.dims} dimensions from ${input.model.tag}, got ${vector.length}.`,
      );
    return normalize(vector);
  });
}

// B4 result (doc 53, retrieval set 1.0.0, Apple M4): bge-m3 recall@1 75%,
// recall@3 92%, cross-lingual 67%; nomic-embed-text 0% cross-lingual;
// qwen3-embedding ships no licence text in its Ollama artifact, so it is not
// eligible. The approved model is pinned by digest like text models.
export const APPROVED_EMBEDDING_MODEL = {
  id: "bge-m3",
  config: EMBEDDING_MODELS["bge-m3"]!,
  digest: "7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab",
  license: "MIT",
  licenseVerifiedAt: "2026-11-16",
  sizeBytes: 1_157_672_605,
} as const;
