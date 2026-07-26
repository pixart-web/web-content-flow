# Phase 6 — Production Readiness and Controlled Launch

## Outcome

Phase 6 adds the bounded launch layer around the existing product: a truthful public entry point, resumable onboarding, password recovery, account/security settings, project exports, plan and usage visibility, rollout controls, health checks, rate limits, maintenance, and operational documentation. It does not add a content module, billing, collaboration, publishing, or media generation.

## Accepted decisions

- **Controlled rollout:** `ROLLOUT_STATE` is `PRIVATE`, `INVITE_ONLY`, `PUBLIC`, or `MAINTENANCE`. Public registration and exports have independent server-side flags.
- **Authentication:** credentials remain the MVP method. Reset tokens are random, stored only as SHA-256 digests, expire after 30 minutes, and are single-use. Reset invalidates all database sessions.
- **Email:** a provider-neutral interface supports deterministic local/test delivery and a minimal Resend HTTP adapter. Production refuses mock email. Email verification remains deferred and registration can be restricted until it is selected.
- **Plans:** `FREE` and `INTERNAL` are entitlements, not billing products. Enforcement occurs on the server. The public pricing page describes launch access without promising unavailable billing.
- **Exports:** current or explicitly selected immutable versions are rendered to text, Markdown, JSON, or calendar CSV. Project package is a bounded JSON package behind its own flag. Export bytes are stored temporarily in PostgreSQL and deleted by maintenance.
- **Operations:** the application and generation worker remain separate processes. Readiness includes database and migration checks; liveness does not. Maintenance is a separate bounded command.

## Persistence and migration

Migration `20260731120000_phase_6_launch` adds:

- user plan and onboarding progress;
- hashed password reset tokens;
- immutable export records with expiry, checksum, selection, and bounded payload;
- database rate-limit buckets.

No prior migration was rewritten. Export data and reset tokens cascade with their owner; expired payloads are cleared by maintenance.

## Implemented surfaces

- Public: `/`, `/pricing`, `/privacy`, `/terms`, `/security`, `/cookies`, `/help`, `/contact`, `/status`.
- Authentication: `/forgot-password`, `/reset-password`, hardened sign-in/sign-up.
- Product: `/app/onboarding`, `/app/settings/account`, `/app/settings/security`, `/app/settings/usage`, `/app/settings/privacy`, `/app/projects/[projectId]/export`.
- Operations: `/health/live`, `/health/ready`.

The privacy and terms pages are explicitly drafts requiring legal review. Contact is a support-email surface, not a silently non-functional form.

## Export security

Export selection is owner-scoped through Project. Requested item and version IDs must resolve inside that scope. The service validates snapshots through the production content registry, escapes Markdown angle brackets, prevents CSV formula execution, sanitizes filenames, applies record and byte bounds, and stores checksums. Downloads require the same owner, project, export, status, and expiry. No provider prompts, credentials, internal jobs, or hidden reasoning are exported.

## Security controls

- Server-side registration, plan, usage, export, and ownership enforcement.
- HMAC-hashed rate-limit subjects; raw email and IP dimensions are not persisted.
- CSP, clickjacking, MIME, referrer, permissions, opener, and resource-policy headers.
- Generated content remains text; no arbitrary HTML rendering or URL fetching.
- Safe user messages and request identifiers without payload logging.
- Password change requires the current password and invalidates sessions.

The CSP permits inline scripts/styles as a documented Next.js compatibility exception. Removing that exception requires nonce/hash support and is a post-launch hardening task.

## Testing and CI

Unit coverage includes email templates, token hashing, export safety, and rate-limit identities. Existing schema, provider, module, worker, authorization, integration, and browser suites remain part of CI. CI uses isolated PostgreSQL, applies committed migrations, runs the worker for E2E, and requires no production vendor secrets.

## Deviations and unresolved work

- Account deletion remains disabled. A safe cascading deletion/export-confirmation policy needs product and legal approval.
- Email verification is not required; production registration should remain controlled until deliverability and abuse controls are approved.
- Database exports are intentionally small and synchronous; object storage and asynchronous archive creation are deferred.
- There is no consent-management platform because no non-essential tracking is enabled.
- Stale project-draft deletion is disabled until a customer-data retention policy is approved.
- Vendor selection for hosting, database, email, monitoring, and backups remains unresolved.

## Acceptance

Code-level launch controls, recovery, exports, health checks, maintenance, and safe public pages are implemented.

Validation on an isolated PostgreSQL 16-compatible local instance:

- all 11 committed migrations applied from an empty database;
- synthetic seed completed;
- 60/60 unit/component tests, 8/8 integration tests, and 12/12 worker tests passed;
- Playwright: 46 passed and 18 intentionally breakpoint-gated/skipped;
- formatting, ESLint, strict TypeScript, design-token validation, and production build passed;
- production dependency audit reported no known vulnerabilities;
- maintenance completed successfully with bounded zero-result output.

Production launch remains **not ready** until the external gates in the [Production Readiness Checklist](26-production-readiness-checklist.md) are evidenced: legal approval, production email/DNS, managed backups and restore drill, monitoring/alert routing, production-domain configuration, and a production smoke test.

Related: [Deployment](23-deployment-and-environments.md), [Security](18-security-and-privacy.md), [Operations](../operations/01-deployment-runbook.md), [Security Review](../security/01-security-review.md).
