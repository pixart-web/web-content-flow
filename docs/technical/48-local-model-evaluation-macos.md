# Local model evaluation — macOS edition (C-05, first round)

**Date:** 2026-11-14 · **Suite:** `pnpm eval:ai` 1.1.0 · **Hardware:** Apple M4, 32 GB unified memory (macOS edition test machine, ADR-079) · **Runtime:** Ollama 0.40.16 on `localhost` · **Samples:** 5 per case.

Raw reports stay in `eval-reports/` (git-ignored). This page is the reviewed summary.

## Results

| Model (Ollama tag) | Params / quant | Structured mode | Brand Profile | Marketing email | Product description | FAQ | Verdict |
|---|---|---|---|---|---|---|---|
| `gemma4:12b-it-qat` | 11.9B / Q4_0 | `native_schema` | ✅ 100% · 57 s / 70 s | ✅ 100% · 32 s / 49 s | ✅ 100% · 55 s / 70 s | ✅ 100% · 32 s / 46 s | **PASS**, no repairs |
| `qwen3.5:4b` | 4.5B / nvfp4 | `prompted` | ✅ 100% · 40 s / 56 s | ✅ 100% · 34 s / 36 s | ✅ 100% · 29 s / 31 s | ✅ 100% · 36 s / 39 s | **PASS** (an earlier run: 4/5 on Brand Profile) |
| `qwen3.5:9b` | 9.7B / nvfp4 | `prompted` | ✅ 100% · 61 s / 73 s | ✅ 100% · 24 s / 34 s | ❌ 0% first pass, 100% after repair · 52 s / 63 s | ✅ 100% · 30 s / 36 s | **FAIL** |

Cells: first-pass valid JSON · latency p50 / p95. Every case in every model had **0 prohibited-word hits and 0 unsupported-claim flags**. Average output+input ≈ 2,300–3,400 tokens per request.

## Findings

1. **`qwen3.5` cannot use Ollama's structured output** on this Ollama version: both a JSON Schema and `"json"` return `structured output is unavailable`. It works only in `prompted` mode (schema in the instructions, zod validation). `gemma4` accepts `format` with the JSON Schema, so the runtime enforces the structure.
2. **Thinking must be off for generation.** Thinking is on by default for these models and spent the whole output budget before the JSON (empty content at 400 tokens). The adapter now sends `think: false` unless `AI_OLLAMA_THINK=true`.
3. **`qwen3.5:9b` systematically exceeds `seoTitle` ≤ 70 characters** in product descriptions (5/5). Structural repair fixed every sample, doubling latency. The limit is in the JSON Schema it receives; making length limits explicit in the instructions is a possible prompt improvement.
4. **Prohibited-word false positives** in the first run came from the editorial `notes` field, where models restate the brand rule; notes are no longer scored (suite 1.1.0).
5. **Variance is visible with 5 samples:** `qwen3.5:4b` passed all Brand Profile samples in one run and 4/5 in another. Five samples indicate, they don't prove.

## Recommendation (for review, nothing promoted)

- **Primary candidate for the macOS edition: `gemma4:12b-it-qat`** — the only model that passed every case on the first attempt, because Ollama enforces the schema. Slowest of the three (p50 32–57 s), still interactive for background jobs.
- **Minimum-spec candidate: `qwen3.5:4b`** (≈ 4 GB) for Macs with 16 GB, in `prompted` mode; needs a larger sample to confirm Brand Profile reliability.
- **Drop `qwen3.5:9b`** for now: no quality or speed advantage over the others here, and a systematic schema miss.

All three stay `status: "evaluation"` (ADR-077). Before any becomes `active` for the macOS edition:

- [ ] Human review of generated text quality side by side (the suite checks rules, not writing quality).
- [ ] Larger runs (≥ 20 samples per case) for the chosen models.
- [ ] Evaluation cases for the remaining modules (Website, Social, Ads, Video, Calendar).
- [ ] Peak memory measurement while the app, PostgreSQL and the model run together.
- [ ] ADR-070 enum step so jobs can persist a local provider (requires approval for an irreversible `ALTER TYPE`).

## Reproduce

```bash
brew install ollama && brew services start ollama
ollama pull gemma4:12b-it-qat && ollama pull qwen3.5:4b && ollama pull qwen3.5:9b
AI_OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_OLLAMA_MODEL=gemma4:12b-it-qat AI_OLLAMA_STRUCTURED_MODE=native_schema pnpm eval:ai --runtime ollama --samples 5
AI_OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_OLLAMA_MODEL=qwen3.5:4b AI_OLLAMA_STRUCTURED_MODE=prompted pnpm eval:ai --runtime ollama --samples 5
```
