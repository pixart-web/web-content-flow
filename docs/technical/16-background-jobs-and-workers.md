# Background Jobs and Workers

> Current implementation: worker processes persist a privacy-safe heartbeat, renew active job leases, and use lease-scoped fenced mutations. Deployment supervision and alerting remain externally unverified.

The generation worker is a separate Node.js process using the durable PostgreSQL job model. Deploy at least one worker for generation; do not depend on web-request lifetime.

- Start: `pnpm worker`; single-cycle diagnostic: `pnpm worker:once`.
- Shutdown: `SIGTERM`/`SIGINT` stops new leases, allows the active bounded job to finish, then disconnects.
- Recovery: expired leases are reclaimable; idempotency and immutable versions prevent duplicate content.
- Health: monitor worker heartbeat logs, active/queued job age, terminal failure rate, and lease-expiry recovery.
- Concurrency: begin with one worker and the documented provider concurrency. Increase only with database and AI quota evidence.
- Maintenance: run `pnpm maintenance` independently to expire export payloads, reset tokens, reservations, rate buckets, and stale onboarding drafts.

Do not run maintenance or the infinite worker loop inside a request handler. See [Worker Operations](../operations/02-worker-operations.md).
