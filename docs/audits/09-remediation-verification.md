# Pre-Beta Remediation Verification

Audit baseline: `3b3778b0e75df1f643e5e09aedebd015cc2a10e7`. Original audit reports remain unchanged.

| Finding | Previous | Current | Closure | Evidence | Residual risk |
|---|---|---|---|---|---|
| AUD-001 | Confirmed High | Implemented and PostgreSQL-tested | PARTIALLY CLOSED | `job-lease.ts`; additive migration; two-owner, renewal, wrong-token and stale-writer tests; 13 worker tests | exhaustive crash-boundary matrix and deployed slow-provider observation remain |
| AUD-002 | Confirmed High | Durable bounded retry implemented | PARTIALLY CLOSED | fenced retry transition; bounded backoff/Retry-After unit tests | full per-attempt failed-usage and sibling retry matrix needs broader executable coverage |
| AUD-003 | Unverified High | deployable commands, heartbeat and restore verifier added | EXTERNAL VERIFICATION REQUIRED | worker DB heartbeat; restore verifier; operations evidence templates | no deployed worker, alert, backup, PITR, or completed restore |
| AUD-004 | Confirmed High | corrected | CLOSED | expected migration contract and readiness tests for complete/unfinished/failed/missing | release process must update the compiled constant with every migration |
| AUD-005 | Confirmed High | CI gates expanded | PARTIALLY CLOSED | health, lease, secret, licence, bundle, drift and axe gates | combined recovery/export/quota/interruption browser journeys remain incomplete |
| AUD-006 | Confirmed High | runtime registry resolution implemented | PARTIALLY CLOSED | executor resolves registered identity/instructions/message/model/budgets/repair policy | handler contexts still use a bounded generic registered input envelope; full all-module runtime assertions remain |
| AUD-007 | Confirmed/Unverified Medium | local origin and mock transport corrected | PARTIALLY CLOSED | localhost/127 tests; arbitrary HTTP rejected; neutral safe sender | live DNS, delivery, bounce monitoring remain unverified |
| AUD-009 | Confirmed Medium | corrected | CLOSED | security mutation commits before bounded notification; failures return/log separately without sensitive data | durable email outbox is deferred |

## Commands and results

- `pnpm install --frozen-lockfile`: passed during remediation dependency installation state.
- Prisma generation/migration/seed: passed with isolated PostgreSQL; 12 migrations.
- Unit: 70 passed.
- Integration: 8 passed.
- Worker: 13 passed.
- Restore verifier: passed; zero invalid current pointers.
- Prisma drift: no difference.
- Secret scan and production licence summary: passed.
- Provider: 7 passed; prompts/context: 2 passed; usage: 2 passed; email: 6 passed; export: 3 passed; security/health: 6 passed.
- Production build: passed; client-bundle scan: passed; `pnpm check`: passed; production dependency audit: no known vulnerabilities.
- Playwright: 48 passed, 18 intentionally viewport-gated skips. The new axe smoke ran on desktop and mobile.
- Licence inventory: reproducible production summary generated.

## Skipped tests

The 18 Playwright skips are paired viewport exclusions: desktop-only creation journeys are skipped in the mobile project, and mobile-specific equivalence tests are skipped in the desktop project. No newly added remediation test is marked skipped. Some requested combined journeys remain absent and are recorded as residual AUD-005 risk rather than reported as passes.

## Decision

The repository materially improves beta safety, but AUD-003 cannot be closed from source code. Private beta remains **NOT READY** until the evidence fields in the operations runbooks are completed. Controlled production and public launch remain **NOT READY**.
