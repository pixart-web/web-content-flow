# Phase 4.5 General Copy Implementation

## Status and scope

Phase 4.5 completes the MVP General Copy module on the shared content platform. It adds structured copy assets, durable deterministic mock generation, item/section/field regeneration, the Copy workspace, editor, versions, and Library discovery. It does not add OpenAI, email sending, publishing, URL fetching, Calendar, export, CRM, CMS, commerce, image, or video behavior.

Related authority: [MVP Scope](../06-mvp-scope.md), [General Copy UX](../ux/16-general-copy-module.md), [Generation Architecture](10-generation-job-architecture.md), [Versioning](14-versioning-and-provenance.md), and [Phase 3 shared platform](32-phase-3-implementation.md).

## Data and migration

No Prisma migration was required. General Copy reuses `ProjectModule`, `ContentItem`, `ContentItemVersion`, `GenerationJob`, and `GenerationJobStep`. `COPY` was already a stable module enum. Each asset is a canonical Content Item with an explicit current-version pointer; all snapshots remain immutable.

Snapshot provenance records the exact Brand Profile version, job, prompt/schema version, provider/model label, timestamp, and mock state. Tone, purpose, length preference, awareness level, campaign context, and type remain structured snapshot metadata.

## Contracts and registry

`src/domain/copy/copy-schemas.ts` defines closed, strict, bounded schemas for 15 Copy types:

- Marketing Email, Newsletter, Product Description, Service Description
- Blog Outline, Article Draft, Press Release, Announcement, FAQ Document
- Case Study Outline, Proposal Summary, Sales One-Pager
- Company Bio, Executive Bio, and Copy Block

The framework-neutral content registry resolves an exact snapshot schema, label, copy formatter, searchable text, and regeneration capability for every type. Unknown types, unknown fields, HTML-like text, invalid stable IDs, duplicate IDs, invalid order, and excessive strings are rejected.

## Generation and worker behavior

A `COPY_MODULE` parent job plans a bounded pack and creates one durable child job per asset. Child identity keys are deterministic from batch, type, and ordinal. The existing database lease, bounded attempts, reconciliation, polling, and ownership model is reused.

New-item jobs validate output before atomically creating the item and its first immutable version. Regeneration captures the current Brand Profile version and expected current Content Item version. The current pointer changes only after successful validation and persistence. Invalid, stale, timed-out, or failed work leaves current content unchanged.

Whole-item regeneration applies to every Copy type. Section regeneration is limited to email, newsletter, blog outline, article, press release, announcement, and FAQ structures with stable section IDs. Field regeneration uses the documented closed target enum; arbitrary JSON paths are not accepted. Retry queues a new bounded job and preserves completed siblings.

Mock generation is deterministic, uses only stored Brief/Brand Profile/module request context, performs no network request, emits no HTML, and supports controlled partial, invalid-output, timeout, and unsupported-claim scenarios.

## Application services and authorization

Focused services configure the module, queue a pack, add one asset, queue item/section/field regeneration, and retry failed child jobs. All Project, module, item, version, and job reads are owner-scoped through the authenticated Project. Client-supplied Project ownership, module, type, Brand Profile version, and registry keys are not trusted.

The item route verifies Project ownership, route module, Content Item module, registered type, snapshot discriminator, and schema. Missing and unauthorized resources use the same neutral unavailable response.

## User interface

The Copy route is `/app/projects/:projectId/content/copy`; canonical item routes remain `/app/projects/:projectId/content/copy/:itemId`.

The module screen provides bounded setup, type selection, purpose, tone, audience awareness, length, custom word target, language, deterministic mock scenarios, durable status, partial failure retry, add-one-asset, and type/purpose filters. It does not imply sending or publishing.

The structured editor renders labelled fields and ordered sections, never raw JSON or generated HTML. It supports read/edit modes, explicit save, dirty-leave protection, schema validation, clipboard feedback, whole-item/allowed targeted regeneration, version history, and restore-as-new-version. Save uses optimistic current-version conflict detection; conflicts preserve the local draft.

The Project Overview links to General Copy when a Brand Profile exists. Project navigation appears after the module or a non-proof Copy item exists. Library adds Copy type, purpose, campaign, status, and mock-compatible filtering through bounded URL parameters.

## Seed and fixtures

The guarded fictional UrbanStride seed adds Marketing Email, Product Description, Blog Outline, Article Draft, FAQ Document, Company Bio, and Sales One-Pager assets. The Marketing Email has two immutable versions with the second current. All content is synthetic and mock-marked; production seeding remains prohibited.

## Analytics and privacy

The vendor-neutral allowlist includes Copy operational events and safe enums/counts. It accepts Project ID, type, purpose, tone, length, counts, target category, job state, duration, mock flag, and safe error code. Titles, topics, briefs, audience text, fields, snapshots, generated copy, clipboard content, URLs, and prompt bodies are prohibited.

## Security

- Generated content is untrusted plain text; arbitrary HTML is never rendered.
- Snapshots and prompts are excluded from logs and analytics.
- URLs are stored only as validated text and are never fetched.
- Request and snapshot sizes, arrays, IDs, enums, and strings are bounded.
- Job idempotency and optimistic version checks prevent duplicate or silent overwrite.
- Unsupported factual claims produce a safe failure or review guidance; mock output does not invent customer proof.

## Tests and CI

Schema tests cover strict generation settings, custom length, HTML/unknown-field rejection, registry coverage, and formatters. Worker tests cover parent/child persistence and targeted regeneration while preserving history. Existing PostgreSQL authorization, shared versioning, lease recovery, build, component, and E2E suites remain part of CI. CI requires no AI, email, publishing, storage, or analytics provider.

## Accepted decisions

ADRs 035–038 record the shared-table strategy, durable fan-out, closed targeted regeneration, and editorial-only external boundary.

## Deviations and unresolved items

- No migration was created because the shared content/job tables and `COPY` module value already satisfy the model.
- Field transformations such as shorten, expand, and change tone remain deferred; they are not disguised as field regeneration.
- Search performance data, SEO APIs, link previewing, sending, publishing, and provider-backed generation remain unresolved future work.
- Calendar association and export remain later phases.

## Acceptance result

Implementation is limited to Phase 4.5. The following validation passed on 2026-07-26:

- Prisma generation and all eight existing migrations; no new migration was required
- guarded synthetic seed
- Prettier, ESLint with zero warnings, strict TypeScript, and design-token verification
- 40 unit/component tests, 7 PostgreSQL integration tests, and 10 durable worker tests
- optimized Next.js production build
- 42 Playwright tests with the durable worker active; 16 intentional device/scope skips
- aggregate `pnpm check`
- production dependency audit with no known vulnerabilities

The production build requires network access on a clean machine because the existing `next/font` configuration fetches Google font metadata at build time. No application runtime feature introduced in Phase 4.5 requires external network access.
