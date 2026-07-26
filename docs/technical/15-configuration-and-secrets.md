# Configuration and secrets

This document is authoritative for Phase 5 AI configuration. Export architecture remains in [15-export-architecture.md](15-export-architecture.md).

## Runtime contract

Real generation is disabled unless `AI_REAL_GENERATION_ENABLED=true`. `AI_PROVIDER_DEFAULT=OPENAI` selects the only approved real provider. `OPENAI_API_KEY` is required only for enabled real generation and is read by server and worker processes; it must never use a `NEXT_PUBLIC_` prefix, enter logs, or be persisted.

Model IDs, timeouts, concurrency, token budgets, and project/account quotas are server-controlled environment values documented in [.env.example](../../.env.example). Client requests select an outcome, not a provider or arbitrary model.

`AI_FAKE_OPENAI_ENABLED` is a deterministic CI/test transport and is rejected in production. `AI_PROMPT_DEBUG_ENABLED` is also rejected in production because customer context must not enter debug logs.

## Deployment secrets

Use the deployment platform’s encrypted secret store. Preview and production must use separate keys and databases. Rotate a compromised key at the provider, replace the deployment secret, redeploy server and worker, and review safe provider-error/usage metadata. Never paste keys into issues, fixtures, analytics, migrations, or screenshots.

## Startup validation

Zod validates all environment values and fails closed. Real generation without a key produces a configuration failure before a provider request. Mock mode remains fully usable without an AI key.

Related: [Security](18-security-and-privacy.md), [Deployment operations](22-deployment-and-operations.md), and [Phase 5 record](39-phase-5-real-ai-provider-implementation.md).
