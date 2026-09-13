# Deployment and AI operations

> Current implementation: `start`, `worker`, `migrate:production`, and `maintenance` are the neutral production process contract. No hosting vendor is selected or operationally verified.

This Phase 5 runbook complements [Local Development](22-local-development.md) and [Deployment Environments](23-deployment-and-environments.md).

## Deployment sequence

1. Provision an isolated PostgreSQL database.
2. Configure authentication and AI environment values from [Configuration and secrets](15-configuration-and-secrets.md).
3. Run `pnpm prisma:generate`, then `pnpm prisma:migrate`.
4. Deploy the Next.js application and durable worker from the same commit.
5. Start in mock mode and complete the end-to-end suite.
6. Enable real generation in a non-production environment with a restricted provider key.
7. Run one synthetic Brand Profile and one item regeneration; verify usage, provenance, reservation reconciliation, and safe failure messages.
8. Enable production real generation only after quota and cost limits are approved.

## Operations

Monitor job terminal rates, safe provider error codes, latency, attempts, repair counts, reservations, tokens, and configured cost estimates. Never inspect raw briefs, prompts, or outputs through logs.

On provider degradation, leave durable jobs intact, disable real generation if necessary, and keep mock mode available for development. Rate-limit errors use bounded retries with backoff; authentication, quota, invalid structure after one repair, refusal, and oversized-context errors require configuration or user recovery.

Expired job leases are reclaimed by the existing worker. Expired usage reservations are marked expired during the next serialized reservation transaction. Repeated job execution uses job/idempotency and usage uniqueness constraints.

## Rollback

Application and worker may roll back to the previous compatible release. The Phase 5 database migration is additive and must not be manually reversed in production. Existing records are retained; real jobs must not be reclassified as mock.
