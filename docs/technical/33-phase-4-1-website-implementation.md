# Phase 4.1 Website Content Module

## Scope and boundaries

Phase 4.1 implements structured Website copy only. It does not render HTML, build or publish websites, fetch reference URLs, generate images, or activate Social, Ads, Video, General Copy, Calendar, or export modules.

Canonical routes:

- `/app/projects/:projectId/content/website`
- `/app/projects/:projectId/content/website/:itemId`

All reads are scoped through the owning Project. Missing, cross-user, project-mismatched, module-mismatched, and type-mismatched resources resolve to the same unavailable response.

## Data and migration

Migration `20260726000000_phase_4_1_website` adds:

- `ProjectModule`, unique by Project and module, for Website settings and operational state.
- `ContentItem.identityKey`, unique by Project/module when present. Website pages use their stable page key.
- `WEBSITE` generation module.
- `MODULE` and `CONTENT_SECTION` job scopes.
- `PARTIAL` generation status.

An absent `ProjectModule` means not selected; persisted statuses are `READY`, `GENERATING`, `PARTIAL`, `COMPLETE`, and `FAILED`. Content bodies remain in immutable `ContentItemVersion.snapshot`, never in module settings.

## Contracts

`WebsiteGenerationRequestSchema` validates website objective/type, selected and custom pages, conversion action, SEO focus, notes, and deterministic mock scenario. It requires Home except for landing pages, rejects duplicates, and caps a request at ten pages.

`WebsitePageSnapshotSchema` is strict and bounded. It contains page identity, purpose, target audience, SEO, hero, an ordered discriminated section union, optional final CTA/notes, and exact provenance. Supported section structures are text, list, process, FAQ, and CTA variants. HTML and unknown fields are rejected.

The framework-neutral content registry registers `WEBSITE / WEBSITE_PAGE` with validation, title/search extraction, plain-text formatting, whole-page regeneration, and section regeneration. Field regeneration is deferred.

## Generation and partial completion

A module job captures the Brief revision, current Brand Profile version, validated settings, and idempotency key. The worker creates one child job per requested page. This preserves one-job/one-version provenance and permits independent retry and aggregation.

Each child validates its captured Brand Profile, produces deterministic mock content, validates the page schema, and atomically creates the `ContentItem`, initial immutable version, and explicit current pointer. The page key uniqueness constraint and job idempotency prevent duplicate pages.

The parent becomes:

- `COMPLETED` when every page completes;
- `PARTIAL` when valid pages coexist with failures;
- `FAILED` when no page completes.

Successful pages remain usable. A failed child never replaces existing content. The module lists failed page jobs and offers an owner-scoped bounded Retry action that queues only that child.

## Editing, regeneration, and versions

The Website editor uses labelled structured fields and explicit Save. It never uses `contenteditable` or generated HTML. Save captures the current version ID; a stale save returns a conflict and preserves the local draft. A successful save creates an immutable `MANUAL_EDIT` version.

Whole-page regeneration captures the current Brand Profile and expected page version, then creates a `REGENERATED` version only after schema validation. Section regeneration replaces one same-type section inside a complete page snapshot and also creates a full immutable version. Prior versions remain available. Restore continues to create a new `RESTORED` version rather than moving the pointer to history.

## UX integration

The Website module includes setup, mock scenario visibility, durable job status, page cards, provenance, and the explicit boundary: “Copy only — Web Content Flow does not build or publish the website.” Website appears in project navigation only after configuration or content exists. Overview provides the truthful add/open path. Library supports Website filtering and canonical Website page links.

Desktop uses the established application shell and a bounded editor column. At 320 px, setup, cards, editor fields, and actions stack; controls retain a 44 px minimum target. Fieldsets, labels, status text, live feedback, and keyboard-safe buttons follow the accessibility foundation.

## Security, privacy, and analytics

- Server services validate registry keys, ownership, project/module/item consistency, snapshots, and expected current pointers.
- Generated copy is untrusted plain text and is never rendered as HTML.
- Reference URLs are stored only in the Brief and are never fetched.
- Logs and analytics exclude Briefs, page names, SEO terms, headlines, bodies, CTAs, snapshots, and clipboard text.
- The event allowlist permits only IDs, enum/status values, page/section types, counts, mock state, safe error codes, and duration.

## Tests and CI

Schema tests cover bounded requests, duplicate pages, page validation, duplicate sections, strict objects, and schema versions. Registry tests cover Website registration and capabilities. Existing PostgreSQL integration, worker, component, build, and E2E suites remain in CI with no external AI, storage, or analytics dependency.

## Accepted ADRs

- ADR-019: Website pages are canonical content items with stable page-key identity.
- ADR-020: Website module generation uses a parent job and one child job per page.
- ADR-021: Section regeneration persists a complete new page snapshot.

## Deviations and unresolved items

- The setup UI supports one custom page; a multi-row custom-page repeater remains unresolved within the contract limit of three.
- Section add/remove/reorder controls are deferred; ordered persistence and section editing/regeneration are implemented.
- Field-level regeneration and full-site regeneration are deferred.
- Infrastructure and real AI provider decisions remain unresolved.

## Acceptance result

Implementation is accepted when the migration applies from Phase 3, seed remains synthetic, required checks pass, partial output is preserved, version pointers remain explicit, owner scoping is enforced, and no out-of-scope module or publishing behavior is present.
