# Phase 22 — Product Media and Launch Readiness

## Executive summary

Phase 22 adds a guarded deterministic capture environment, the fictional Northstar Roasters demonstration project, authentic interface still capture, a typed product-media registry, poster-first media component, social source templates, legal-review inventory and an operator-ready staging package.

No final video was encoded, no external legal review occurred, and staging was not deployed.

## Synthetic demonstration project

Northstar Roasters is a fictional direct-to-consumer specialty-coffee brand. The guarded seed normalises the complete deterministic development workflow across Brief, Brand Profile, Website, Social, Ads, Video, General Copy, Calendar, Library, versions and Export-compatible content.

Capture uses normal authentication, a fixed synthetic account and an isolated local/test database.

## Capture safeguards

`MARKETING_CAPTURE_MODE` is false by default. Validation rejects capture mode outside local/test and rejects it when real AI, real email, public registration or indexing is enabled.

`DATABASE_ENVIRONMENT` explicitly labels local/test/staging/production databases. Staging and production startup reject a mismatched marker. Render explicitly sets staging.

The capture script provides no debug UI, impersonation or authorization bypass.

## Media created and pending

Created: eight authentic desktop stills, eight mobile stills, optimised WebP posters, typed media registry, poster-first media component, ten social template definitions, and eight video storyboards.

No WebM or MP4 file was produced. Video capture, editing, review and approval remain separate states. Raw capture must stay outside Git. The CSS Content Constellation remains the conceptual hero.

## Website integration

Authentic Brand Profile and module posters replace prototype frames on the homepage and product detail pages. The component renders intentional posters whenever video paths are absent.

## Performance and accessibility

Posters use lazy-loaded responsive images. Video adds no current runtime weight. Real Core Web Vitals and Lighthouse require a deployed representative URL. Staging targets remain Performance ≥85 and Accessibility/Best Practices/SEO ≥95; they are not results.

Posters have descriptive alternative text and adjacent transcripts. The component respects reduced motion, pauses video outside the viewport and exposes controls for non-autoplay explanatory video.

## Legal readiness

The package includes factual product/data inventory, proposed processor register, data-flow map, explicit legal-decision register, privacy/terms review outline and cookie inventory.

No lawyer reviewed or approved these documents. Legal entity, address, governing law, launch countries, minimum age, retention, deletion, IP allocation, provider roles and complaint processes remain unknown.

## Security-page reconciliation

| Public area | Classification |
|---|---|
| Database sessions and Argon2id | Implemented and locally verified |
| Owner-scoped authorization | Implemented and locally verified |
| Generated text treated as untrusted | Implemented and locally verified |
| Secret/client-bundle scans | Implemented and locally verified |
| Generation provenance | Implemented and locally verified |
| Health, leases and runbooks | Implemented; external operation unverified |
| Monitoring, backup/PITR and restore | Planned / not provisioned |

## Staging environment variable matrix

| Group | Variable | Class | Staging requirement |
|---|---|---|---|
| Shared | `NODE_VERSION`, `APP_ENV`, `APP_RELEASE` | Required/public | 24.14.0, staging, immutable SHA |
| Database | `DATABASE_URL` | Provider-supplied/secret | Staging PostgreSQL only |
| Database | `DATABASE_ENVIRONMENT` | Required/public | `staging` |
| Auth | `AUTH_URL` | Required/public | Staging HTTPS origin |
| Auth | `AUTH_SECRET` | Generated/secret | Unique staging value |
| Security | `RATE_LIMIT_SECRET` | Generated/secret | Unique staging value |
| Rollout | `ROLLOUT_STATE` | Required/public | `INVITE_ONLY` |
| Rollout | `PUBLIC_REGISTRATION_ENABLED` | Required/public | `false` |
| Marketing | `MARKETING_INDEXING_ENABLED` | Required/public | `false` |
| Marketing | `MARKETING_CAPTURE_MODE` | Required/public | `false` |
| Email | provider, key, sender | Required/secret mix | Staging-only Resend |
| AI | provider and real/fake flags | Required/public | MOCK / false / false |
| Monitoring | provider project/token | Provider-specific/secret | Separate staging project |

## Staging readiness

`render.yaml`, build, pre-deploy migration, web/worker/cron commands, health routes, release marker, noindex, closed registration and disabled real AI/capture are prepared.

Execution remains blocked by the absence of a Git remote, provider accounts, domain control and credentials. Every external evidence field remains NOT EXECUTED.

## Known limitations and external actions

1. Record and edit the eight video clips.
2. Obtain qualified legal review and resolve every explicit legal decision.
3. Create the private Git remote and provider accounts.
4. Deploy the exact approved commit to staging.
5. Capture monitoring, email, backup/PITR, restore, rollback and Lighthouse evidence.
6. Keep private beta, registration, indexing and real AI disabled until separately approved.

## Acceptance results

Validated locally on 27 July 2026:

- dependency install and Prisma generation: passed;
- formatting, lint, strict TypeScript and design-token checks: passed;
- unit tests: 80 passed across 30 files;
- PostgreSQL integration tests: 8 passed;
- durable-worker tests: 13 passed;
- Playwright: 62 passed and 18 intentional cross-viewport skips;
- production-mode staging build: passed for 44 routes;
- provider, prompt, usage, email, export, security and health suites: passed;
- secret scan: passed across 324 tracked files;
- client-bundle secret scan: passed;
- production dependency audit: no known vulnerabilities;
- 16 PNG capture sources and 16 WebP posters verified at 390×844 or
  1600×900; WebP size range 13,668–46,898 bytes.

The capture seed produced one Calendar item, five Social items, three Website
items, five Video items, five Ads items and eight Copy items. Visual review
confirmed the fictional Northstar Roasters identity and no visible account
email. These are local results only.

Not executed: staging deployment, DNS/TLS, external email, monitoring,
backup/PITR, restore, rollback, Lighthouse, real AI, qualified legal review and
final video recording/editing.

## Final recommendation

Repository-ready for controlled staging operator handoff; **not ready for private beta or public launch** until external operational and legal gates close.
