# Pre-Launch Product and Technical Audit

**Audited commit:** `3b3778b0e75df1f643e5e09aedebd015cc2a10e7`  
**Audit date:** 2026-07-27  
**Role:** independent repository and runtime audit  
**Conclusion:** the implemented MVP is coherent and demonstrable, but is **not ready** for external beta or production under the stated acceptance gates.

## Executive summary

Web Content Flow has a credible full-stack MVP: owner-scoped projects, a structured Brief and Brand Profile, six content modules, immutable Content Item versions, durable database jobs, deterministic mock generation, an OpenAI adapter, quotas, project exports, onboarding, password recovery, and operational documentation. An empty PostgreSQL database accepted all 11 migrations; schema drift was not detected; unit, integration, worker, build, and browser suites passed.

No confirmed cross-user access, committed real secret, raw generated HTML execution, arbitrary URL fetching, or migration drift was found. Synthetic integrity queries found no orphaned jobs/usage, cross-item current pointers, content without versions, invalid export ownership, or expired active records.

Launch is blocked by six High findings:

1. worker leases are neither renewed nor fenced at persistence;
2. retryable provider failures are made terminal instead of being automatically retried;
3. no deployed worker, monitoring, alerting, managed backup, or restore evidence exists;
4. readiness reports a false-positive when a migration is pending;
5. Phase 5/6 critical journeys and several CI gates lack executable coverage;
6. the production AI path records prompt identifiers but does not resolve or execute the registered prompt definition.

The product is appropriate for continued local/staging validation. It must not be represented as externally production-ready.

## Scope and methodology

The audit covered repository structure, documentation, Next.js routes, auth/session code, Prisma schema and all migrations, repositories, jobs/workers, AI providers/prompts, module schemas/registry, exports, email, rate limiting, analytics allowlists, health checks, maintenance, CI, public/private UI, synthetic database integrity, runtime headers, responsive layout, and build artifacts.

Evidence methods:

- static source and documentation review;
- clean temporary PostgreSQL database on port 55434;
- migration deploy, seed, drift comparison, and read-only integrity SQL;
- all declared automated suites;
- production build and production runtime header/health probes;
- synthetic reset and export lifecycle probes;
- Chromium desktop/mobile E2E;
- five-width public-page overflow/label checks;
- repository and client-bundle secret-pattern scans;
- production dependency advisory audit.

No live OpenAI, Resend, production database, deployment platform, monitoring system, backup provider, DNS, or production domain was used.

## Repository state

- The audit began from a clean worktree at `3b3778b`.
- App Router entry points are under `src/app`.
- Server-only code is separated under `src/server`; durable handlers are under `src/workers`.
- Production schemas live under `src/domain`; `architecture/` remains reference-only.
- No Dockerfile, process manifest, hosting configuration, or infrastructure-as-code exists.
- The documentation file names in the Step 17 request differ from the actual Product Foundation names. The real index is authoritative.

## Architecture assessment

The monolithic Next.js application with PostgreSQL, Prisma, explicit repositories/services, module registry, immutable snapshots, and a separate worker remains proportionate for a solo-developer MVP. Module outputs reuse the same Content Item and versioning platform. The Calendar captures exact source versions rather than duplicating mutable source bodies.

Material exceptions:

- the lease token is returned but never used as a write fence;
- no lease heartbeat/renewal exists;
- provider retry semantics are not connected to queue state;
- the prompt registry is tested as an inventory but bypassed by generation execution;
- runtime health checks do not know the expected migration identity.

These are bounded corrections, not reasons for a rewrite.

## Product and scope assessment

Implemented and evidenced:

- credentials authentication, projects, Brief, Brand Profile;
- Website, Social, Ads & Creative, Video & Reels, General Copy, Calendar;
- Library, structured editing, immutable versions, restore, regeneration;
- mock and opt-in OpenAI paths;
- usage reservations/accounting and plan policy;
- TXT, Markdown, JSON, Calendar CSV, and gated JSON project package;
- onboarding, settings, reset, health, maintenance, public/legal surfaces.

No code was found for automatic publishing, external calendar sync, rendered image/video/audio, autonomous browsing, CRM/CMS, ad/social account connection, collaboration, SSO, or billing checkout. User-facing boundaries are generally truthful.

## Security assessment

Strengths:

- Argon2 passwords, random database sessions, secure production cookie attributes;
- digest-only, expiring, single-use reset tokens and session invalidation;
- safe internal return URLs;
- owner-scoped repositories and neutral item/project/export responses;
- strict Zod schemas and no `dangerouslySetInnerHTML`;
- parameterized raw SQL only for leasing/advisory locks/readiness;
- no arbitrary URL fetch from project content;
- HMAC-hashed rate-limit identities;
- CSV formula mitigation and safe export filenames;
- CSP, HSTS, MIME, referrer, permissions, opener/resource, and frame controls;
- no server secret names or audit secret sentinels found in `.next/static`.

Residual concerns are detailed in the [Security Audit](04-security-audit.md), principally lease fencing, account enumeration at registration, CSP inline allowances, incomplete noindex behavior, absent operational detection, and unverified email/provider controls.

## Reliability and data integrity

All migrations applied from empty and the live migrated schema matched `schema.prisma`. Integrity probes returned zero for:

- Content Items without versions;
- cross-item current-version pointers;
- orphaned jobs and usage;
- expired active reservations;
- cross-owner exports;
- expired exports still marked complete.

The schema includes explicit current pointers, uniqueness for version numbers/source jobs/project idempotency, and useful queue/usage/export/reset indexes.

The primary reliability risk is execution ownership: a 60-second lease can expire during a provider call whose timeout is also 60 seconds, before validation and persistence. Another worker can reclaim the same job while the first worker continues. Handlers update by job ID and do not require the original lease token.

## AI-provider and prompt assessment

The OpenAI SDK is server-only, tools and browsing are absent, `store: false` is set, model IDs are server-resolved, output uses a strict Zod format, calls have AbortController timeouts, request IDs are hashed before usage persistence, and CI uses deterministic providers.

There are 42 registered prompt definitions at version `1.0.0`, all unique. However, the executor does not call `getPrompt`/`loadPromptCatalog`; it supplies a generic hard-coded system/user message while accepting prompt key/version from handler arguments. Registry authority, input/output budgets, repair policy, and immutable usage are therefore documentary rather than enforced.

The structural “repair” call receives the original context, not the invalid provider payload. It is a bounded second generation with repair wording, not a demonstrable repair of the rejected structure.

## Testing assessment

Passing evidence:

- 60 unit/component tests;
- 7 provider tests;
- 2 prompt/context tests;
- 2 pricing tests;
- 1 quota integration test;
- 3 email tests;
- 3 export formatter tests;
- 1 security test;
- 8 repository/integration tests;
- 12 worker tests;
- 46 Playwright passes.

Eighteen Playwright cases were skipped intentionally because each viewport project skips tests intended for the other viewport. There are no automated E2E journeys for password recovery, export, real-provider/quota blocking, worker interruption/restart, readiness migration mismatch, or Phase 6 settings. The `test:security` command runs one rate-limit test and no health test file.

## UX, accessibility, and responsive assessment

Core routes rendered and E2E navigation/editor interactions passed on desktop and mobile. Public routes had one `h1`, no horizontal overflow at 320/375/768/1024/1440 px, and visible form controls had accessible labels. Existing focus styles and 44 px primary controls are present.

Limitations:

- no axe or equivalent WCAG scan;
- no screen-reader session, 200% zoom, reduced-motion, or virtual-keyboard test;
- many mobile text links render below 44 px, with spacing not formally measured;
- password recovery, export, settings, legal/error states, and Calendar equivalence lack complete assistive-technology coverage.

## Performance assessment

Measured production artifacts:

- static assets: approximately 1.59 MB raw;
- JavaScript chunks: approximately 1.28 MB raw total;
- largest individual client chunk: approximately 283 KB raw;
- root HTML: approximately 32 KB;
- production compilation: approximately 2 seconds in the audit environment;
- full E2E suite: 19.5 seconds;
- liveness/readiness local responses: approximately 2.5/3.1 ms with healthy local DB.

Library/project queries are bounded (`take` 50/100); export selection is capped at 50 items and 2 MB by default. No authenticated query profiling, compressed bundle budget, Lighthouse run, Web Vitals, provider latency, or worker throughput measurement exists. The landing page depends on build-time Google Font retrieval.

## Operational and documentation assessment

Runbooks exist for deployment, workers, restore, incidents, rollback, and smoke tests. They correctly identify external blockers. They do not have named owners, review dates, actual deployment commands for a selected platform, monitoring destinations, backup identifiers, restore results, or release evidence.

Documentation drift:

- architecture says provider calls have a lease shorter than timeout plus heartbeat/renewal, but the lease equals the provider timeout and is not renewed;
- ADR-045 describes an immutable production prompt registry, but the executor bypasses it;
- readiness is documented as migration-aware but only checks that some finished migration exists;
- several early phase reports accurately describe history but contain statements that are now outdated if read as current capability;
- `docs/13-open-decisions.md` still says every decision is unresolved despite many accepted ADRs.

## Launch risks and recommendations

P0/P1 corrections should remain narrow:

1. implement renewable leases and lease-token fencing, then inject crash/slow-provider tests;
2. connect retryable provider errors to bounded queue retry with backoff/Retry-After and usage accounting;
3. deploy and prove web/worker/maintenance, monitoring, alerts, backups, and an isolated restore;
4. make readiness compare the expected migration/release contract and fail on unfinished/failed migrations;
5. make the prompt registry authoritative or remove claims that it is;
6. add executable Phase 5/6 security, auth recovery, export, quota, health, and interruption tests.

See [Finding Register](02-finding-register.md), [Remediation roadmap](08-launch-decision.md), and [Operations Audit](07-operations-and-recovery-audit.md).

