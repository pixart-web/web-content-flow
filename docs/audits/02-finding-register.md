# Finding Register

Sorted by severity and launch impact. No Critical issue was confirmed; missing external infrastructure is marked **UNVERIFIED**, not silently treated as safe.

## High

### AUD-001 — Generation leases are not renewed or fenced

- **Severity / Area / Status:** HIGH / durable jobs / CONFIRMED
- **Evidence:** `leaseNextJob` grants 60 seconds. No code renews `leaseExpiresAt`; handlers update jobs/steps/content by ID and clear any lease without matching `leaseToken`. Provider timeout is also 60 seconds by default.
- **Affected:** `src/workers/generation-worker.ts`, all `src/workers/handlers/*`, `scripts/run-worker.ts`.
- **Verification:** `rg leaseToken src/workers src/server` shows acquisition and clearing only. Compare `AI_REQUEST_TIMEOUT_MS=60000` with lease duration.
- **Actual:** a second worker may reclaim a still-running job; the first continues and may call the provider or persist after losing ownership.
- **Expected:** active work renews its lease and all terminal/persistence writes are fenced by the current token.
- **Risk:** duplicate paid calls, conflicting job state, duplicate attempts, stale output, misleading usage.
- **Remediation / Size:** add heartbeat renewal, token-conditioned transitions, lost-lease abort, and slow/crash boundary tests / M.
- **Launch impact:** blocks private beta with real generation, controlled production, and public launch.

### AUD-002 — Retryable provider failures are terminal

- **Severity / Area / Status:** HIGH / AI reliability / CONFIRMED
- **Evidence:** adapters classify retryable errors, but handlers catch and set `status=FAILED`; no handler requeues using `availableAt`, attempt count, or `retryAfterMs`.
- **Affected:** `src/server/ai/providers/openai-provider.ts`, `src/server/ai/generation-executor.ts`, all generation handlers.
- **Verification:** inject fake timeout/rate-limit; inspect handler catch branches and `rg 'status: \"QUEUED\"'` (queueing is child creation, not provider retry).
- **Actual:** transient network, 429, timeout, or 5xx failures stop immediately.
- **Expected:** bounded automatic retry with backoff and provider Retry-After where available; refusals/invalid inputs remain terminal.
- **Risk:** frequent avoidable generation failure and mismatch with product/architecture claims.
- **Remediation / Size:** central retry transition, delay policy, usage/attempt accounting, tests / M.
- **Launch impact:** blocks controlled production and public launch; private mock-only beta may accept only if real mode is disabled.

### AUD-003 — Production worker, monitoring, backups, and restore are unverified

- **Severity / Area / Status:** HIGH / operations and recovery / UNVERIFIED
- **Evidence:** no hosting/process/IaC configuration; readiness checklist marks worker, monitoring, backups, restore, and smoke test blocked. No restore record, backup identifier, alert destination, or deployed worker evidence exists.
- **Affected:** deployment environment; `docs/operations/*`; `docs/technical/26-production-readiness-checklist.md`.
- **Verification:** repository mapping and operational-document review.
- **Actual:** code and runbooks exist, but no operator can demonstrate production queue processing, outage detection, backup age, or restoration.
- **Expected:** managed backup/PITR, successful isolated restore, deployed web/worker/maintenance, actionable alerts, production smoke evidence.
- **Risk:** undetected outage, stuck jobs, and inability to recover customer data.
- **Remediation / Size:** vendor selection/configuration/evidence / L.
- **Launch impact:** blocks all three readiness gates under the audit criteria.

### AUD-004 — Readiness accepts a pending migration

- **Severity / Area / Status:** HIGH / health and deployment / CONFIRMED
- **Evidence:** readiness orders `finished_at DESC NULLS LAST LIMIT 1` and checks only that one row is finished. With a synthetic unfinished migration row inserted, `/health/ready` still returned HTTP 200 and `migrations: ok`.
- **Affected:** `src/app/health/ready/route.ts`.
- **Reproduction:** insert an unfinished `_prisma_migrations` row, request `/health/ready`, then remove it.
- **Actual:** false-positive ready during failed/pending migration history.
- **Expected:** fail on unfinished/failed migrations and, preferably, verify the expected latest migration/release identifier.
- **Risk:** incompatible web/worker may receive traffic.
- **Remediation / Size:** explicit unfinished check plus expected migration contract and tests / S.
- **Launch impact:** blocks controlled production and public launch.

### AUD-005 — Critical Phase 5/6 and CI gates lack executable coverage

- **Severity / Area / Status:** HIGH / testing and CI / CONFIRMED
- **Evidence:** no E2E for password recovery, exports, quota/provider suppression, settings, worker restart, or onboarding-to-export; no health test file; CI has no secret scan, migration drift, licence check, or accessibility scan.
- **Affected:** `.github/workflows/ci.yml`, `tests/`, `src/app/health`.
- **Verification:** test inventory: 108 declared tests, 46 E2E passes, 18 viewport-gated skips.
- **Actual:** many launch-critical controls are supported only by narrow unit tests or manual audit probes.
- **Expected:** isolated database/provider/email test flows and blocking CI gates.
- **Risk:** regressions in recovery, authorization, expiry, readiness, or real generation reach release.
- **Remediation / Size:** add integration/E2E/failure-injection tests and CI gates / L.
- **Launch impact:** blocks public launch; controlled production requires at least recovery/export/quota/health/interruption coverage.

### AUD-006 — Prompt registry is not authoritative at runtime

- **Severity / Area / Status:** HIGH / AI governance and provenance / CONFIRMED
- **Evidence:** 42 prompts are registered and tested, but production execution never calls `getPrompt` or `loadPromptCatalog`. It uses generic hard-coded instructions and accepts handler-supplied prompt key/version.
- **Affected:** `src/ai/prompts/*`, `src/server/ai/generation-executor.ts`, handlers.
- **Verification:** `rg 'getPrompt|loadPromptCatalog' src`; results are registry/test definitions only.
- **Actual:** registry budgets, system instructions, repair policy, key/version existence, and input schema are not enforced.
- **Expected:** resolve exact key/version, validate input, use registered instructions/message/budgets, reject unknown entries, record resolved identity.
- **Risk:** inaccurate reproducibility/provenance, drift between tested prompts and sent prompts, arbitrary internal key claims.
- **Remediation / Size:** integrate registry into executor and add path coverage / M.
- **Launch impact:** blocks public real-AI launch and should be fixed before controlled real-provider use.

## Medium

### AUD-007 — Password recovery origin and delivery are incompletely verified

- **Severity / Area / Status:** MEDIUM / authentication / CONFIRMED + UNVERIFIED
- **Evidence:** `http://127.0.0.1` reset URLs fail template validation although Playwright uses that origin. Synthetic `localhost` flow proved digest, single use, 30-minute expiry metadata, and session invalidation. Resend/DNS/delivery were not tested.
- **Affected:** `src/server/email/templates.ts`, Playwright/env conventions, production email.
- **Reproduction:** call `requestPasswordReset` with `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`; Zod rejects.
- **Actual:** neutral UI masks local delivery failure; production delivery remains unverified.
- **Expected:** consistent allowlisted local origins and production sender verification/delivery tests.
- **Risk:** users see success but receive no reset.
- **Remediation / Size:** normalize allowed origins; integration/E2E mock mail sink; production DNS/delivery proof / S+Ops.
- **Launch impact:** blocks controlled production until delivery is evidenced.

### AUD-008 — Registration reveals likely account existence

- **Severity / Area / Status:** MEDIUM / authentication privacy / CONFIRMED
- **Evidence:** duplicate signup returns “Try signing in,” while an unused address creates an account.
- **Affected:** `src/features/auth/auth-actions.ts`.
- **Verification:** submit a known and unknown email to sign-up.
- **Actual:** response distinguishes an existing account.
- **Expected:** neutral duplicate registration behavior or verified-email ownership flow.
- **Risk:** account enumeration.
- **Remediation / Size:** neutral response and audit/rate-limit test / XS.
- **Launch impact:** should be fixed before public registration.

### AUD-009 — Password change commits before email delivery

- **Severity / Area / Status:** MEDIUM / account recovery / CONFIRMED
- **Evidence:** password and sessions are changed transactionally; notification email is sent afterward without normalization/catch.
- **Affected:** `src/features/settings/settings-actions.ts`.
- **Verification:** inject email provider failure.
- **Actual:** mutation succeeds, action errors before redirect, and the user may not know the password changed.
- **Expected:** mutation result remains truthful; notification failure is separately observable/retriable without reversing security state.
- **Risk:** support load and temporary lockout/confusion.
- **Remediation / Size:** safe post-commit outcome and durable/observable notification policy / S.
- **Launch impact:** fix before controlled production.

### AUD-010 — Production CSP permits inline scripts and styles

- **Severity / Area / Status:** MEDIUM / XSS hardening / ACCEPTED RISK
- **Evidence:** actual production header includes `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'`; other CSP directives are restrictive.
- **Affected:** `next.config.ts`.
- **Verification:** production `curl -D - /`.
- **Actual:** CSP offers less mitigation for inline injection.
- **Expected:** nonce/hash-based script policy when compatible with Next.js deployment; document any remaining style exception.
- **Risk:** higher impact if a future HTML/script injection is introduced.
- **Remediation / Size:** nonce/hash evaluation and regression tests / M.
- **Launch impact:** may be accepted for private beta; explicit security acceptance needed for public launch.

### AUD-011 — Auth/reset/health pages rely on robots.txt rather than noindex

- **Severity / Area / Status:** MEDIUM / privacy and SEO / CONFIRMED
- **Evidence:** only `/app` and `/api` receive `X-Robots-Tag`; auth layout has no robots metadata. `robots.txt` disallows reset/health, which does not guarantee de-indexing.
- **Affected:** `src/app/(auth)/layout.tsx`, `next.config.ts`, `src/app/robots.ts`.
- **Verification:** inspect production headers for `/forgot-password`, `/reset-password`, `/health/*`.
- **Actual:** sensitive utility URLs can be indexed if discovered.
- **Expected:** explicit `noindex,nofollow` metadata/header.
- **Risk:** tokenless reset/health pages in search; reset URLs should receive strongest handling.
- **Remediation / Size:** auth metadata and header rules / XS.
- **Launch impact:** fix before public launch.

### AUD-012 — Architecture and decision documentation overstates runtime controls

- **Severity / Area / Status:** MEDIUM / documentation / CONFIRMED
- **Evidence:** runtime docs claim heartbeat/lease renewal and prompt-registry authority; implementation lacks both. Technical index still says all baseline choices are Proposed. Open Decisions says every decision is unresolved despite accepted ADRs.
- **Affected:** technical architecture/runtime/ADR/index/open-decision documents.
- **Verification:** compare cited docs with `generation-worker.ts`, `generation-executor.ts`, ADR statuses.
- **Actual:** implementers/operators may rely on controls that do not exist.
- **Expected:** current-state documents distinguish implemented, proposed, and blocked behavior.
- **Risk:** unsafe deployment assumptions and maintenance errors.
- **Remediation / Size:** documentation reconciliation after technical decisions / S.
- **Launch impact:** blocks evidence-based public sign-off.

### AUD-013 — Legal approval and deletion process remain unresolved

- **Severity / Area / Status:** MEDIUM / privacy/product operations / CONFIRMED
- **Evidence:** Privacy and Terms visibly say draft; account deletion is disabled; no subprocessor inventory or approved retention matrix exists.
- **Affected:** public legal pages, settings, security/retention docs.
- **Verification:** inspect `/privacy`, `/terms`, settings, and readiness checklist.
- **Actual:** truthful placeholders, but no approved commercial/legal basis.
- **Expected:** jurisdiction-appropriate approval, support deletion workflow, subprocessor/retention inventory.
- **Risk:** non-compliant or misleading commercial launch.
- **Remediation / Size:** legal/product/engineering workflow / M.
- **Launch impact:** blocks public launch; controlled private use needs explicit agreement.

## Low

### AUD-014 — Prisma generation requires a database URL

- **Severity / Area / Status:** LOW / developer experience / CONFIRMED
- **Evidence:** bare `pnpm prisma:generate` failed with `Cannot resolve environment variable: DATABASE_URL`; it passed with a syntactically valid URL without connecting.
- **Affected:** `prisma.config.ts`, README command expectations.
- **Expected:** clearly document requirement or avoid resolving connection for generation where supported.
- **Remediation / Size:** documentation/config review / XS.
- **Launch impact:** none if CI/env contract is followed.

### AUD-015 — Licence inventory could not be produced

- **Severity / Area / Status:** LOW / dependency governance / UNVERIFIED
- **Evidence:** `pnpm licenses list --prod --json` failed with `ERR_PNPM_MISSING_PACKAGE_INDEX_FILE` after frozen install.
- **Affected:** dependency-review process.
- **Expected:** reproducible SBOM/licence report in CI.
- **Remediation / Size:** choose supported SBOM/licence tool / S.
- **Launch impact:** public commercial review condition.

### AUD-016 — Mobile text-link target sizes are not consistently 44 px

- **Severity / Area / Status:** LOW / accessibility / LIKELY
- **Evidence:** headless geometry at 320 px found several footer/auth/contact text links with 17–20 px height. Primary controls met 44 px; target-spacing equivalence was not formally calculated.
- **Affected:** public footer, auth helper links, legal/contact navigation.
- **Expected:** WCAG 2.2 target-size or spacing exception verified.
- **Remediation / Size:** enlarge hit areas or document spacing test / XS.
- **Launch impact:** accessibility review before public launch.

## Informational

### AUD-017 — Current synthetic relational integrity is clean

- **Severity / Area / Status:** INFORMATIONAL / database / CONFIRMED
- **Evidence:** zero invalid current pointers, versionless items, orphan jobs/usage, expired active reservations/exports, and cross-owner exports in the seeded audit DB; migration drift was empty.
- **Risk:** this is test evidence, not proof of future production data.
- **Recommendation / Size:** automate the queries as read-only release/restore checks / S.
- **Launch impact:** positive evidence only.

