# Deployment Runbook

## Release evidence

| Field | Required value |
|---|---|
| Named deployment role | |
| Verification date | |
| Status / blocker | |
| Web command | `pnpm start` |
| Worker command | `pnpm worker` |
| Migration command | `pnpm migrate:production` |
| Maintenance command | `pnpm maintenance` |
| Release identifier | |
| Rollback action and artifact | |

## Before deployment

- Identify release commit, environment, operator, and incident channel.
- Confirm CI and [readiness checklist](../technical/26-production-readiness-checklist.md).
- Verify secrets without printing values: database/auth, public/auth URLs, rollout flags, email, AI, support, legal versions, limits.
- Confirm database backup and worker compatibility with the migration.

## Deploy

1. Install with the frozen lockfile and run `pnpm prisma:generate`.
2. Apply `pnpm prisma:migrate` once from a controlled release task.
3. Deploy web with Node.js runtime and deploy worker from the same commit.
4. Schedule `pnpm maintenance`; do not run production seed.
5. Verify `/health/live`, then `/health/ready`.
6. Run [production smoke tests](06-production-smoke-tests.md).

## Observe

For at least one normal generation window, watch request errors, readiness, database connections, queue age, worker leases, AI rate/quota errors, and export failures. Roll back or disable flags when thresholds are breached.

Never deploy with `EMAIL_PROVIDER=MOCK`, placeholder secrets, a shared non-production database, or unrestricted registration by accident.
