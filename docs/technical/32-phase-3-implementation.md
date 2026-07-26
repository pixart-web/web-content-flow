# Phase 3 Implementation Record

## Status and scope

Phase 3 implements the shared content platform: canonical project content items, immutable versions, structured editing, whole-item mock regeneration, restore-as-new-version, and project-scoped Library discovery. `COPY / FOUNDATION_COPY` is an internal proof type, not the complete Copy module. OpenAI, full modules, Calendar, export, publishing, collaboration, and media generation remain excluded.

## Migration and data model

Migration `20260725000000_phase_3_shared_content` adds the model and enums. Follow-up migration `20260725010000_content_source_job_idempotency` makes initial-item and generated-version source-job references unique so a restarted worker recognizes already-persisted output instead of duplicating it.

- `ContentItem`: project-owned logical identity, module/type/title/status, explicit current version, initial source job, source Brand Profile version, and timestamps.
- `ContentItemVersion`: immutable validated JSONB snapshot, increasing item-local version number, source, exact job and Brand Profile version, actor, mock marker, and provenance.
- stable `ContentModule`, `ContentStatus`, and `ContentItemVersionSource` enums;
- `CONTENT_ITEM` generation scope and `COPY` generation module;
- ownership, Library, job, profile, and version indexes.

`SCHEDULED` and `PUBLISHED` are planning metadata only and never imply publishing. Phase 3 leaves proof items in `DRAFT`.

## Current-pointer relation

The named `CurrentContentItemVersion` relation uses `ContentItem.currentVersionId` as a unique nullable foreign key and `ContentItemVersion.contentItemId` as the immutable ownership relation. Null is allowed only during the initial transaction before v1 is inserted. Application transactions lock the item, verify the expected current version, insert the next version, and update the pointer atomically. They never use mutable `isCurrent` flags.

The unique pointer prevents one version from being current for multiple items. Services additionally verify that historical and current versions belong to the same item. Project deletion cascades items and versions; current pointers use `SET NULL` to avoid dangling references during deletion.

## Production schemas and registry

Production contracts live in `src/domain/content`, not `architecture/`. They cover branded IDs, module/status/source enums, bounded provenance, item envelope, regeneration/restore requests, Library filters, and the strict proof snapshot.

The framework-neutral registry resolves `(module, type)` to:

- schema version;
- runtime Zod schema;
- serializable structured-field definitions;
- text formatter for whole-item copy.

Unknown module/type pairs and unknown snapshot keys are rejected. React consumes the field definitions but is not imported by the registry.

## Proof content type

`COPY / FOUNDATION_COPY` has structured fields: title, objective, headline, body, call to action, and optional notes. It is labelled “Foundation content · platform proof” throughout the UI. Output is project- and Brand-Profile-specific, deterministic mock text with no HTML or network request.

## Services and authorization

Focused services and repositories support:

- queue new proof content generation;
- queue idempotent whole-item regeneration;
- owner-scoped item/version reads;
- project Library listing and filtering;
- explicit manual version save with optimistic conflict detection;
- restore historical version as a new snapshot;
- compact owner-scoped job status through the existing endpoint.

`requireContentItemOwner` and `requireContentItemVersionOwner` traverse `ContentItem → Project → userId`. Route reads additionally require project ID and module agreement. Missing, cross-user, cross-project, and module-mismatched resources resolve through the same neutral unavailable state.

## Durable generation and regeneration

The Phase 2 worker dispatches `COPY` jobs to the content handler while retaining Brand Profile handling. Job requests capture kind, project, item when applicable, content type, expected current version, exact current Brand Profile version, prompt/schema versions, mock scenario, and idempotency key.

New-item generation validates output before atomically creating the item, v1, and pointer. Regeneration retains the canonical item and creates `REGENERATED` vN only if the expected current pointer still matches. Provider failure, invalid output, stale current pointer, or persistence failure leaves current content and all previous versions unchanged.

The database lease, expiry reconciliation, bounded attempts, durable steps, and polling endpoint are reused rather than duplicated.

## Editor and conflict handling

The generic content route is:

```text
/app/projects/:projectId/content/:module/:itemId
```

Phase 3 accepts only the registered `copy / FOUNDATION_COPY` proof. The responsive editor uses labelled native fields and React Hook Form, explicit Save/Cancel, Zod validation, dirty-state unload protection, safe read rendering, field/whole-item clipboard actions, whole-item regeneration, provenance, and version history.

Save captures `currentVersionId`. A changed pointer returns `CONFLICT`; the draft remains in browser state and the user is told to reload latest or copy their changes. No merge or collaboration behavior was added.

Restore requires confirmation and creates a new `RESTORED` version. It never points directly to the historical row.

## Library and Overview

`/app/projects/:projectId/library` is project-scoped and lists current content with module, proof type, status, current version, mock marker, updated ordering, and Brand Profile version. Search/module/status/mock filters use bounded URL parameters. There are no folders, uploads, favorites, bulk asset tooling, or cross-project Library.

Project Overview shows the truthful shared-platform proof boundary, recent items, durable content job state, Library link, and a “Generate foundation copy” action only when the Brand Profile exists. No unfinished module appears as active navigation.

## Provenance and analytics

Every version stores the exact Brand Profile version used. Existing content remains unchanged after Brand Profile updates; regeneration captures the then-current profile.

The privacy-safe content event schema allowlists operational event names and enum/count/duration properties. It rejects titles, snapshots, clipboard text, and arbitrary properties. No analytics vendor or network transport was added.

## Tests and CI

- Schema/registry: bounds, unknown keys/types, schema version, formatter, safe analytics.
- Components: structured read/edit/cancel/copy, accessible labels, mock/version presentation.
- PostgreSQL integration: explicit current pointer, manual v2, optimistic conflict, immutability count, owner-scoped item/version/Library.
- Worker: initial generation, one canonical item, provenance, idempotent queue exhaustion, regeneration, previous-version retention, invalid-output preservation.
- E2E: generation through worker, read/copy/edit/save/regenerate/restore, Library/filtering, cross-user denial, and mobile editor/Library.

CI already runs Prisma generation/migrations, unit/component tests, integration tests, worker tests, build, and worker-backed Playwright with isolated PostgreSQL and no external service secrets.

## Dependencies and audit

No direct runtime dependency was added. Phase 3 uses the existing React Hook Form, Zod, Prisma, and worker stack. The final production audit identified vulnerable transitive PostCSS and `find-my-way` versions; narrow pnpm overrides were updated to patched releases and the repeated audit reported no known vulnerabilities.

## Security

Generated content is treated as untrusted text and rendered only through React text nodes/form values. There is no arbitrary HTML, URL fetching, command execution, snapshot logging, or client-trusted registry key. Snapshot and filter sizes are bounded. Ownership is enforced in database queries and service boundaries.

## Accepted ADRs

- canonical `ContentItem` plus immutable `ContentItemVersion`;
- unique explicit current-version pointer with transactional ownership checks;
- framework-neutral schema/editor registry;
- one internal proof content type before module breadth;
- Phase 2 durable worker/polling reused for content jobs;
- content status remains operational metadata, not a snapshot mutation.

See [Architecture Decision Records](27-architecture-decision-records.md).

## Deviations and unresolved items

- Field regeneration and Copy transformations are deferred to Phase 4.
- Status editing is not exposed; proof content remains `DRAFT`.
- Version preview uses current structured presentation and compact history rather than a diff.
- Analytics has an allowlisted abstraction but no vendor.
- Deployment worker host, managed PostgreSQL, and retention limits remain unresolved.

## Acceptance

Phase 3 proves one persistence, authorization, version, editor, regeneration, and Library pattern usable by future modules. Command evidence is reported in the implementation handoff.
