# Development Handoff — continue on another machine

**Updated:** 2026-11-14 (after PR #24). Read this first when continuing the project on a new computer or in a new session.

## Where the work is

Everything is on `main` (through PR #24): audit, AI Gateway phases B and C (local runtime adapters, `pnpm ai:health`, the `pnpm eval:ai` suite covering all seven modules), SMTP email, deploy decisions and the macOS local-mode runbook. Start from `main`; the only open PR is #14 (`openai` 7), left open on purpose.

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

## Next step

- **Staging (A-05…A-09):** the product owner is provisioning Render staging; when they confirm, verify it with the [staging deployment checklist](13-staging-deployment-checklist.md).
- **Local models (C-05):** rounds 1–3 and Calendar are summarised in [48-local-model-evaluation-macos.md](../technical/48-local-model-evaluation-macos.md); `gemma4:12b-it-qat` is the primary candidate. Remaining: human review of generated text, ≥ 20 samples per case, peak memory measurement, and the ADR-070 enum step (irreversible, needs approval). Setup and commands: [17-local-mode-macos.md](17-local-mode-macos.md).
- Pass `pnpm` script arguments directly (no `--`), and don't use `pnpm -s`.

## Local setup (macOS)

```bash
brew install git gh node@24 postgresql@16 && npm install -g pnpm@11.9.0 && gh auth login
git clone https://github.com/pixart-web/web-content-flow.git && cd web-content-flow
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
- `AGENTS.md` (Next.js agent rules) is written by `next dev` and is committed; if `next dev` changes it, commit the update with your work.

## Still open for the product owner

Model prices in EUR (B-03), web-edition model hardware and a Windows test machine, root-domain hosting, monitoring vendor, branch protection on `main`, repository visibility (D-7), PR #14 (`openai` 7), what Kiko needs (D-6).
