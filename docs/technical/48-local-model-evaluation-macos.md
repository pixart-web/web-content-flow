# Local model evaluation — macOS edition (C-05)

**Date:** 2026-11-14 · **Suite:** `pnpm eval:ai` 1.1.0 (round 1), 1.2.0 (round 2), 1.3.0 (round 3), 1.4.0 (Calendar) · **Hardware:** Apple M4, 32 GB unified memory (macOS edition test machine, ADR-079) · **Runtime:** Ollama 0.40.16 on `localhost` · **Samples:** 5 per case.

Raw reports stay in `eval-reports/` (git-ignored). This page is the reviewed summary.

## Round 1 — suite 1.1.0, prompt 1.0.0

| Model (Ollama tag) | Params / quant | Structured mode | Brand Profile | Marketing email | Product description | FAQ | Verdict |
|---|---|---|---|---|---|---|---|
| `gemma4:12b-it-qat` | 11.9B / Q4_0 | `native_schema` | ✅ 100% · 57 s / 70 s | ✅ 100% · 32 s / 49 s | ✅ 100% · 55 s / 70 s | ✅ 100% · 32 s / 46 s | **PASS**, no repairs |
| `qwen3.5:4b` | 4.5B / nvfp4 | `prompted` | ✅ 100% · 40 s / 56 s | ✅ 100% · 34 s / 36 s | ✅ 100% · 29 s / 31 s | ✅ 100% · 36 s / 39 s | **PASS** (an earlier run: 4/5 on Brand Profile) |
| `qwen3.5:9b` | 9.7B / nvfp4 | `prompted` | ✅ 100% · 61 s / 73 s | ✅ 100% · 24 s / 34 s | ❌ 0% first pass, 100% after repair · 52 s / 63 s | ✅ 100% · 30 s / 36 s | **FAIL** |

Cells: first-pass valid JSON · latency p50 / p95. Every case in every model had **0 prohibited-word hits and 0 unsupported-claim flags**. Average output+input ≈ 2,300–3,400 tokens per request.

## Round 2 — suite 1.2.0, prompt 1.1.0

Suite 1.2.0 adds detectors for URLs/domains and product attributes absent from the context; prompt 1.1.0 tells every module not to invent URLs, contact details, materials, technologies, features, prices or availability. Same hardware, same 5 samples per case; `qwen3.5:9b` was not rerun.

| Model | Brand Profile | Marketing email | Product description | FAQ | Verdict |
|---|---|---|---|---|---|
| `gemma4:12b-it-qat` (`native_schema`) | ✅ 100% · 54 s / 75 s | ✅ 100% · 32 s / 37 s | ⚠️ 100% valid, 1 flag (*durable*) · 39 s / 55 s | ✅ 100% · 33 s / 47 s | **FAIL** on 1 flag in 20 samples |
| `qwen3.5:4b` (`prompted`) | ❌ 80% (1 schema failure, repair also failed) · 39 s / 67 s | ✅ 100% · 29 s / 34 s | ❌ 10 flags (*durable*, *ergonomic*, *breathable*) · 29 s / 30 s | ❌ 3 flags (*breathable*, *durable*, *flexible soles*) · 28 s / 39 s | **FAIL** |

Every flag was checked against the fixture: none of these attributes appears in the UrbanStride context (it only states comfort, daily city use and considered design), so they are real inventions, not detector noise.

Before/after on the side-by-side samples (one email + one product description per model, prompt 1.0.0 re-scored with suite 1.2.0): `gemma4` 2 flags, `qwen3.5:4b` 5 flags including an invented store URL. With prompt 1.1.0:

- **No URL was invented in 40 samples** across both models.
- `gemma4` dropped to 1 flagged sample out of 20.
- `qwen3.5:4b` still invents shoe attributes in most product descriptions and some FAQs; the instruction alone does not hold a 4B model back.

## Round 3 — remaining modules, suite 1.3.0, prompt 1.1.0

`gemma4:12b-it-qat` (`native_schema`) on the four new cases, 3 samples each (`pnpm ai:health` confirmed the model first).

| Case | First-pass valid | Prohibited words | Claim flags | p50 / p95 | Avg tokens |
|---|---|---|---|---|---|
| `website.home` | ✅ 100% | 0 | 0 | 54 s / 83 s | 3,259 |
| `social.instagram_post` | ✅ 100% | 0 | 0 | 19 s / 56 s | 4,663 |
| `ads.meta_ad` | ✅ 100% | 0 | 0 | 53 s / 103 s | 6,892 |
| `video.reel_script` | ✅ 100% | 4 → **0** after the fix below | 2 (*durable*) | 108 s / 130 s | 8,200 |

- **Structure holds in every module:** 12/12 first-pass valid, no repairs.
- **Video prohibited words were a scoring false positive.** A re-generated sample shows *magic* and *revolutionary* inside `productionNotes`, where the model restates the brand rule ("avoid words like …"). Internal production notes (`productionNotes`, `editingNotes`) and visual `avoid` lists are no longer scored, like `notes` since suite 1.1.0.
- **The *durable* claim in Video is real** — the same invented attribute seen in product descriptions.
- **Video is the slowest task** (p50 ≈ 1 min 50 s, ≈ 8k tokens): acceptable as a background job, but it sets the bar for the "interactive" expectation on the macOS edition.
- **Calendar (suite 1.4.0):** `calendar.editorial_week` plans one week from four fixed source items (one per module), as `calendar-handler` does. `gemma4:12b-it-qat`, 3 samples: ✅ 100% first-pass valid, 0 prohibited words, 0 flags, p50 120 s / p95 133 s, ≈ 3,000 tokens. Slow for its output size; the large entries schema dominates.

## Round 4 — Essential profile (LF-19), suite 1.6.0, 2026-11-24

Goal: a model for 16 GB Macs (Essential profile), so ≤ ~5 GB resident while macOS, PostgreSQL and the app also run. Same Apple M4 / 32 GB, 5 samples per case, `native_schema`, thinking off. `gemma4:12b-it-qat` was rerun on the same suite as the reference.

| Case | `ministral-3:3b` (Apache-2.0, 3.0 GB) | `gemma4:12b-it-qat` (reference) |
|---|---|---|
| `brand_profile` | ❌ 8 flags (*sustainable*, *ergonomic*, *cushioning*, *durable*) · 41 s / 57 s | ✅ 0 flags · 55 s / 72 s |
| `copy.marketing_email` | ❌ 5 flags · 17 s / 31 s | ✅ · 32 s / 51 s |
| `copy.product_description` | ❌ 25 flags (*durable*, *breathable*, *slip-resistant*…) · 21 s / 24 s | ✅ · 38 s / 55 s |
| `copy.faq_document` | ❌ 15 flags (*recycled*, *eco-friendly*…) · 21 s / 24 s | ✅ · 34 s / 55 s |
| `website.home` | ❌ 13 flags · 25 s / 28 s | ✅ · 52 s / 73 s |
| `social.instagram_post` | ✅ · 12 s / 25 s | ✅ · 19 s / 59 s |
| `ads.meta_ad` | ✅ · 19 s / 38 s | ✅ · 50 s / 107 s |
| `video.reel_script` | ❌ 60% valid (repair did not fix), 6 flags · 56 s / 92 s | ✅ · 89 s / 139 s |
| `calendar.editorial_week` | ✅ · 49 s / 60 s | ✅ · 108 s / 123 s |
| **Result** | **FAIL** — 72 flags in 45 samples | **PASS** — every case, 0 flags |

- **The suite is not stricter than before:** the reference passes everything on 1.6.0, so the flags are the small model's own inventions (attributes absent from the Brief), the same failure as `qwen3.5:4b` in round 2, only more often.
- **Memory fits the Essential budget:** `ministral-3:3b` runs at 2.6 GB of GPU memory (32k context) and ≈ 4.8 GB resident on this Mac.
- **Speed:** about half the latency of `gemma4` on most cases, on hardware stronger than the target.
- **Catalog:** added as `rejected`, so the app never offers it. `gemma4` now records suite 1.6.0.

### Round 4b — three more small models (2026-11-25)

Same suite 1.6.0, 5 samples per case, `native_schema`, thinking off, Apple M4. Memory is Ollama's own figure for the loaded model (`ollama ps`).

| Model | Licence | Size / loaded | First-pass valid | Invented-attribute flags | Result |
|---|---|---|---|---|---|
| `ministral-3:3b` | Apache-2.0 | 3.0 GB / 2.6 GB | 8 of 9 cases at 100%; Video 60% | **72** in 6 cases | FAIL |
| `gemma3:4b-it-qat` | Gemma Terms of Use | 4.0 GB / 3.7 GB | Calendar **20%** first pass (100% after repair) | **61** in 7 cases, including an invented `UrbanStride.com` | FAIL |
| `granite4:3b` | Apache-2.0 | 2.1 GB / 3.7 GB | Video 80% (repair did not fix) | **51** in 5 cases | FAIL |
| `phi4-mini:3.8b` | MIT | 2.5 GB / 5.1 GB | Brand Profile **20%**, FAQ 80%, Video 60% → 80% after repair | **10** in 3 cases | FAIL |
| `gemma4:12b-it-qat` (reference, Standard) | Apache-2.0 | 7.2 GB | 100% in every case | **0** | PASS |

- **No 3–4B model is usable for the Essential profile today.** Three of them invent product attributes in most text modules (51–72 flags in 45 samples), the same failure seen with `qwen3.5:4b`.
- **`phi4-mini` is the closest:** it invents far less (10 flags), but it cannot hold the Brand Profile schema, which every other module depends on. A prompt or schema adjustment for this one model might be worth one more round. It would not justify a production change on its own.
- **`gemma3` could not be offered even if it passed:** the catalog only accepts Apache-2.0 and MIT, so it is recorded here but not in the catalog.
- **Catalog:** `ministral-3:3b`, `phi4-mini:3.8b` and `granite4:3b` are `rejected` (never offered). `gemma4` records suite 1.6.0.

**Essential stays without an approved model.** 16 GB Macs keep mock mode, a private server or the `not_recommended` `qwen3.5:4b`. Routes worth trying next, in order:

1. A grounding change in the production prompt for attributes (list the allowed product facts explicitly), measured on `phi4-mini` and `granite4`.
2. Larger small models when they appear (≈ 7–8B at 4-bit, ≤ 5 GB loaded).
3. Revisiting the 16 GB budget with `gemma4:12b-it-qat`: it loads at ≈ 7 GB, which is tight but possibly workable with a smaller context. It needs a real 16 GB Mac to measure.

ADR-077 keeps human review mandatory either way.

## Findings

1. **`qwen3.5` cannot use Ollama's structured output** on this Ollama version: both a JSON Schema and `"json"` return `structured output is unavailable`. It works only in `prompted` mode (schema in the instructions, zod validation). `gemma4` accepts `format` with the JSON Schema, so the runtime enforces the structure.
2. **Thinking must be off for generation.** Thinking is on by default for these models and spent the whole output budget before the JSON (empty content at 400 tokens). The adapter now sends `think: false` unless `AI_OLLAMA_THINK=true`.
3. **`qwen3.5:9b` systematically exceeds `seoTitle` ≤ 70 characters** in product descriptions (5/5). Structural repair fixed every sample, doubling latency. The limit is in the JSON Schema it receives; making length limits explicit in the instructions is a possible prompt improvement.
4. **Prohibited-word false positives** in the first run came from the editorial `notes` field, where models restate the brand rule; notes are no longer scored (suite 1.1.0).
5. **Variance is visible with 5 samples:** `qwen3.5:4b` passed all Brand Profile samples in one run and 4/5 in two others. Five samples indicate, they don't prove.
6. **Invented product attributes are the main quality risk** for local models, more than structure. The suite now catches them; the production prompt reduces them but does not eliminate them.

## Recommendation (for review, nothing promoted)

- **Primary candidate for the macOS edition: `gemma4:12b-it-qat`** — the only model that passed every case on the first attempt, because Ollama enforces the schema. Slowest of the three (p50 32–57 s), still interactive for background jobs. One residual invented attribute in 20 samples after prompt 1.1.0, so human review stays mandatory.
- **Minimum-spec candidate: `qwen3.5:4b`** (≈ 4 GB) for Macs with 16 GB, in `prompted` mode — **not acceptable as is**: it invents product attributes in most product descriptions and fails Brand Profile 1 time in 5. Revisit with a newer small model, or only for modules without product claims.
- **Drop `qwen3.5:9b`** for now: no quality or speed advantage over the others here, and a systematic schema miss.

All three stay `status: "evaluation"` (ADR-077). Before any becomes `active` for the macOS edition:

- [ ] Human review of generated text quality side by side (the suite checks rules, not writing quality).
- [ ] Larger runs (≥ 20 samples per case) for the chosen models.
- [x] Evaluation cases for Website, Social, Ads and Video (suite 1.3.0).
- [x] Evaluation case for Calendar (suite 1.4.0) — all seven modules covered.
- [ ] Peak memory measurement while the app, PostgreSQL and the model run together.
- [ ] ADR-070 enum step so jobs can persist a local provider (requires approval for an irreversible `ALTER TYPE`).

## Reproduce

```bash
brew install ollama && brew services start ollama
ollama pull gemma4:12b-it-qat && ollama pull qwen3.5:4b && ollama pull qwen3.5:9b
AI_OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_OLLAMA_MODEL=gemma4:12b-it-qat pnpm ai:health   # server up and model pulled?
AI_OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_OLLAMA_MODEL=gemma4:12b-it-qat AI_OLLAMA_STRUCTURED_MODE=native_schema pnpm eval:ai --runtime ollama --samples 5
AI_OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_OLLAMA_MODEL=qwen3.5:4b AI_OLLAMA_STRUCTURED_MODE=prompted pnpm eval:ai --runtime ollama --samples 5
ollama pull ministral-3:3b && ollama pull gemma3:4b-it-qat && ollama pull phi4-mini:3.8b && ollama pull granite4:3b
AI_OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_OLLAMA_MODEL=phi4-mini:3.8b AI_OLLAMA_STRUCTURED_MODE=native_schema pnpm eval:ai --runtime ollama --samples 5   # same for each tag
```
