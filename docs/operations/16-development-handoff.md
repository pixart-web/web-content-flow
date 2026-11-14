# Development Handoff — continue on another machine

**Updated:** 2026-11-14. Read this first when continuing the project on a new computer or in a new session.

## Where the work is

| Branch / PR | Content | State |
|---|---|---|
| `main` | Everything through PR #20 (audit, AI Gateway phase B, SMTP email, deploy decisions) | merged |
| `feat/local-runtime-adapters` — PR #21 | Ollama + OpenAI-compatible adapters (C-02, C-03) | open, CI green |
| `feat/ai-evaluation-suite` — PR #22 (stacked on #21) | `pnpm eval:ai` evaluation suite (C-04) + ADR-079 (three editions) | open — **latest work; check this branch out** |

Merge order when ready: #21, then retarget #22 to `main` and merge it.

Authoritative context, in this order:

1. [Real project status](../audits/current-project-status.md) — blockers, decisions D-1…D-7.
2. [Execution plan and backlog](../technical/47-execution-plan-and-backlog.md) — phases A–F, test plan.
3. [AI Gateway architecture](../technical/46-ai-gateway-architecture.md) and ADR-069…079 in [27-architecture-decision-records.md](../technical/27-architecture-decision-records.md).
4. [Local mode on macOS](17-local-mode-macos.md) — Ollama, `pnpm ai:health`, `pnpm eval:ai`.
5. [Staging deployment checklist](13-staging-deployment-checklist.md) — the product owner is provisioning Render staging; verify it when they say it exists.

## Decisions to respect

- Editions: web, desktop Windows, desktop macOS (ADR-079). The macOS edition is tested on the product owner's Mac; record its chip and memory in the evaluation report (`--hardware`) and update ADR-079 if the test Mac changes.
- Staging/beta on Render (ADR-058); email through the domain's SMTP host (ADR-078); DNS stays with the current provider.
- Local/self-hosted models stay `status: "evaluation"` and are never routed to jobs until they pass the evaluation suite on the edition's hardware (ADR-077).
- Out of scope this phase: Experience Studio, premium templates, motion builder, HorizonX-inspired features.
- No destructive changes, irreversible migrations or production deploys without explicit approval. Merges to `main` only with the product owner's authorization and green CI.

## Next step: C-05 on the macOS test Mac (Apple M4, 32 GB)

```bash
ollama list   # confirm the models, e.g. qwen3.5:9b, gemma4:12b-it-qat, qwen3.5:4b
AI_OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_OLLAMA_MODEL=qwen3.5:9b pnpm eval:ai --runtime ollama --samples 5
```

- Pass arguments directly (no `--`; pnpm forwards them and a literal `--` reaches the script). Don't use `pnpm -s`.
- Verified 2026-11-14 on Ollama 0.40.16: `qwen3.5` rejects Ollama's `format` ("structured output is unavailable") — run it with `AI_OLLAMA_STRUCTURED_MODE=prompted`. Thinking is on by default for thinking models and exhausts the output budget; the adapter sends `think: false` unless `AI_OLLAMA_THINK=true`.
- Publish a short summary of each report (model, hardware, pass/fail per case, p95) in `docs/technical/`; raw reports stay in `eval-reports/` (git-ignored).

## Local setup (macOS)

```bash
brew install git gh node@24 postgresql@16 && npm install -g pnpm@11.9.0 && gh auth login
git clone https://github.com/pixart-web/web-content-flow.git && cd web-content-flow
git checkout feat/ai-evaluation-suite
pnpm install && pnpm prisma:generate
cp .env.example .env   # then set AUTH_SECRET (openssl rand -base64 32); the file parses as-is otherwise
brew services start postgresql@16
```

Then create a `web_content_flow` role/database matching `DATABASE_URL` in `.env`, run `pnpm prisma:migrate` and `SEED_DEMO_DATA=true pnpm prisma:seed` (demo login in the README). If port 3000 is taken, run the app on another port and set `NEXT_PUBLIC_APP_URL`/`AUTH_URL` to match.

## Gotchas learned so far

- `src/generated/` and `next-env.d.ts` are not committed: run `pnpm prisma:generate` after every checkout; `pnpm typecheck` runs `next typegen` itself.
- `test:integration`, `test:worker` and `test:quota` wipe tables: they refuse a database whose name lacks `test`. Use `TEST_DATABASE_URL=postgresql://…/web_content_flow_test` (create it and run migrations against it first).
- `pnpm worker` / `pnpm maintenance` default `NODE_ENV=development` only for local runs.
- To exercise the real-generation path locally without spending credit: `AI_PROVIDER_DEFAULT=OPENAI`, `AI_REAL_GENERATION_ENABLED=true`, `AI_FAKE_OPENAI_ENABLED=true`, restart dev, run `pnpm worker:once`; General Copy regeneration goes through the executor.
- `pnpm build` overwrites `.next`; restart the dev server (and clear `.next`) afterwards.
- `next dev` writes an untracked `AGENTS.md` (framework agent rules); whether to commit it is still the product owner's call.

## Still open for the product owner

Model prices in EUR (B-03), web-edition model hardware and a Windows test machine, root-domain hosting, monitoring vendor, branch protection on `main`, repository visibility (D-7), PR #14 (`openai` 7), what Kiko needs (D-6).
