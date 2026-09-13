# Pre-Beta Remediation Implementation

## Scope

This record covers the focused remediation of AUD-001, AUD-002, AUD-003, AUD-004, AUD-005, AUD-006, AUD-007, and AUD-009. No product module or publishing capability was added.

## Implemented controls

- **Leases:** `GenerationJob` now records owner, token, expiry, and last heartbeat. Lease duration is the greater of 90 seconds or provider timeout plus 30 seconds. Renewal runs before one third of the lease. Worker mutations use a lease-scoped Prisma extension that asserts the token, owner, and unexpired database state before every mutation. Lost owners cannot persist or set terminal state.
- **Retries:** retryable provider errors are converted at the fenced terminal transition to `QUEUED`, with the lease released and `availableAt` set. Delays approximate 5s, 15s, 45s, and 120s with deterministic bounded jitter. `Retry-After` is clamped to 1–300 seconds. Non-retryable errors remain terminal.
- **Prompt authority:** real generation resolves the exact registered key/version, verifies job-module identity, validates registered input, uses registered instructions, message builder, model tier and token budgets, and observes the registered repair policy.
- **Repair:** one structural repair receives rejected output and validation issues when the provider exposes them. It does not receive authority to add facts.
- **Readiness:** the expected migration is compiled in `expected-migration.ts`. Readiness rejects missing, unfinished, logged-failed, or rolled-back migrations. Additional successfully completed migrations are allowed.
- **Email:** reset origins allow HTTPS plus explicit localhost/127.0.0.1 HTTP in non-production. Production requires HTTPS. Mock delivery is inspectable in tests. Password-change/reset notifications use a bounded two-attempt safe sender; post-commit failure is logged without email, password, or token and does not falsify mutation success.
- **Operations:** worker heartbeat records are stored without customer data. Production commands exist for web, worker, migration, maintenance, and restore verification.
- **CI:** schema drift, secret scan, production licence report, client-bundle secret scan, health tests, worker lease tests, and axe accessibility smoke are blocking.

## Migration

`20260801120000_pre_beta_job_leases` additively introduces lease ownership/heartbeat fields and `WorkerHeartbeat`. It applied from empty with all preceding migrations and produced no schema drift.

## Tests and evidence

Local evidence includes 70 unit tests, 8 PostgreSQL integration tests, 13 worker tests, migration from empty, seed, restore verification, and schema drift. The complete build/E2E matrix is recorded in [Remediation Verification](../audits/09-remediation-verification.md).

## External dependencies

Deployment platform, worker supervisor, alert destination, managed PostgreSQL backup/PITR, transactional-email DNS/delivery, and an isolated restore remain **EXTERNAL VERIFICATION REQUIRED**. Repository tooling does not constitute operational proof.

## Readiness recommendation

- Private beta: **NOT READY** until worker monitoring and backup evidence are supplied; after that evidence, it may move to ready with conditions.
- Controlled production: **NOT READY** pending external operational proof and complete failure-injection/E2E evidence.
- Public launch: **NOT READY**; P2 audit findings remain outside this remediation.
