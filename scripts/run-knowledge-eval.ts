import "./local-node-env";

import { parseArgs } from "node:util";

import {
  RETRIEVAL_DOCUMENTS,
  RETRIEVAL_QUESTIONS,
  RETRIEVAL_SET_VERSION,
} from "../src/server/knowledge/evaluation/retrieval-set";
import {
  EMBEDDING_MODELS,
  embedTexts,
} from "../src/server/knowledge/ollama-embedder";
import { dot } from "../src/server/knowledge/vectors";

// L6 (doc 53, B4): retrieval quality of local embedding models on the fixed
// PT/EN set. Passages are paragraphs (a harder test than production chunks).
// Usage: pnpm eval:knowledge [--models bge-m3,nomic-embed-text]

const { values } = parseArgs({
  options: {
    models: { type: "string" },
    "base-url": { type: "string", default: "http://127.0.0.1:11434" },
  },
});

const passages = RETRIEVAL_DOCUMENTS.flatMap((document) =>
  document.content
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ title: document.title, text })),
);

async function main() {
  const models = values.models?.split(",") ?? Object.keys(EMBEDDING_MODELS);
  console.warn(
    `Retrieval set ${RETRIEVAL_SET_VERSION}: ${passages.length} passages, ${RETRIEVAL_QUESTIONS.length} questions.`,
  );
  console.warn(
    "| Model | Recall@1 | Recall@3 | PT @1 | EN @1 | Cross @1 | Index (ms) | Query (ms) |",
  );
  console.warn("|---|---|---|---|---|---|---|---|");
  for (const name of models) {
    const model = EMBEDDING_MODELS[name];
    if (!model) throw new Error(`Unknown model ${name}`);
    const baseUrl = values["base-url"]!;
    // Warm-up so model loading is not counted.
    await embedTexts({ baseUrl, model, texts: ["warm up"], kind: "query" });
    let started = performance.now();
    const passageVectors = await embedTexts({
      baseUrl,
      model,
      texts: passages.map((passage) => passage.text),
      kind: "document",
    });
    const indexMs = performance.now() - started;
    started = performance.now();
    const questionVectors = await embedTexts({
      baseUrl,
      model,
      texts: RETRIEVAL_QUESTIONS.map((question) => question.question),
      kind: "query",
    });
    const queryMs = (performance.now() - started) / RETRIEVAL_QUESTIONS.length;
    const results = RETRIEVAL_QUESTIONS.map((question, index) => {
      const ranked = passageVectors
        .map((vector, passage) => ({
          passage,
          score: dot(vector, questionVectors[index]!),
        }))
        .sort((a, b) => b.score - a.score);
      const position = ranked.findIndex(({ passage }) =>
        passages[passage]!.text.includes(question.expect),
      );
      return { language: question.language, position };
    });
    const rate = (
      filter: (r: (typeof results)[number]) => boolean,
      k: number,
    ) => {
      const subset = results.filter(filter);
      return `${Math.round((subset.filter((r) => r.position >= 0 && r.position < k).length / subset.length) * 100)}%`;
    };
    console.warn(
      `| ${name} | ${rate(() => true, 1)} | ${rate(() => true, 3)} | ${rate((r) => r.language === "pt", 1)} | ${rate((r) => r.language === "en", 1)} | ${rate((r) => r.language === "cross", 1)} | ${Math.round(indexMs)} | ${queryMs.toFixed(0)} |`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
