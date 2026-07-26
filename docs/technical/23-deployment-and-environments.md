# Deployment and Environments

| Environment | Database/secrets | AI/jobs/analytics | Seeds |
|---|---|---|---|
| Local | local isolated | mock default; local worker; analytics no-op | UrbanStride allowed |
| Test | ephemeral isolated | deterministic mock worker | per-test synthetic |
| Preview | isolated branch/database preferred | mock default; worker required for flow | optional controlled synthetic |
| Staging (optional) | production-like separate | real AI only with explicit cap; nonproduction analytics | no automatic seed |
| Production | dedicated managed | real + mock capability; dedicated worker; monitoring | never automatic |

Secrets live in deployment secret stores, scoped per runtime/environment and rotated. App and worker deploy from same commit/schema contracts. Database region is primary; app/worker colocate where possible.

Deployment order: backup/check → apply reviewed forward migration once → deploy compatible app/worker → health/smoke checks. Prefer expand/contract migrations for rolling compatibility. Rollback code only if compatible with migrated schema; otherwise forward-fix/restore according to migration plan.

Health: app liveness, DB readiness, worker heartbeat/queue age; no paid AI call. Preview without worker must clearly disable/reject real generation rather than leave jobs stuck. Logs/analytics include environment and exclude sensitive content.
