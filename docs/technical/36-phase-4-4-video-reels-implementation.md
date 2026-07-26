# Phase 4.4 — Video & Reels Implementation

## Scope and outcome

Phase 4.4 adds structured video-production planning to the existing shared
content platform. It creates editable scripts, shot lists, voice-over scripts,
captions, and production briefs. It does not render, upload, play, edit, or
publish media.

The implementation reuses project ownership, immutable content versions,
explicit current-version pointers, durable database jobs, worker leasing,
polling, Library discovery, restore behavior, and mock provenance.

## Migration

Migration `20260729000000_phase_4_4_video_reels` adds `VIDEO` to
`GenerationModule`. No Video-specific content tables were added: Video assets
use `ContentItem`, `ContentItemVersion`, `ProjectModule`, `GenerationJob`, and
`GenerationJobStep`.

## Contracts

Production schemas are in `src/domain/video/video-schemas.ts` and are not
imported from the architecture references.

- Platforms, formats, objectives, presenter styles, duration ranges, content
  types, and mock scenarios are closed enums.
- Custom duration is limited to 5–180 seconds.
- A Video Script contains 2–20 scenes with explicit stable IDs and unique
  ordinals.
- Scene duration totals must remain within 70%–130% of target duration. This is
  a validation tolerance, not predicted playback timing.
- A Shot List contains 2–30 ordered shots with stable IDs.
- All snapshots are strict, bounded, plain-text Zod objects. HTML is rejected.
- Hashtags are stored without `#` and normalized during validation.

## Registry

The framework-neutral content registry now owns the five Video definitions,
schema versions, structured editor metadata, copy formatters, and regeneration
capabilities. Video types cannot fall back to arbitrary JSON editing.

## Generation model

`queueVideoGeneration` captures the configured request, Brief revision, current
Brand Profile version, and an idempotency key. One module parent job
deterministically creates `conceptCount × assetTypes.length` child jobs.

Each child:

1. reloads the owner-independent persisted job context;
2. validates the captured Brand Profile and request;
3. produces deterministic mock structured output without a network call;
4. validates the complete snapshot;
5. creates the canonical item and immutable initial version atomically; and
6. records the source job, Brand Profile version, mock marker, schema version,
   and provenance.

Sibling failures do not discard valid assets. Parent aggregation reports
complete, partial, or failed without invented percentages. Failed children can
be retried within the existing bounded-attempt model.

## Regeneration and versions

Whole-item regeneration is available for all Video types. Closed targeted
regeneration supports:

- a Video Script scene by stable scene ID;
- a Shot List shot by stable shot ID; and
- registered fields: hook, voice-over, on-screen text, caption, hashtags, call
  to action, visual direction, and editing direction.

Every successful regeneration validates and persists a complete immutable
snapshot. Scene and shot replacement retain their stable identity and order.
The current pointer changes only after successful validation and persistence.
Stale, failed, or invalid output leaves current content unchanged. Manual save
and restore continue to use the shared optimistic-version transaction; restore
creates a new `RESTORED` version.

## Routes and interface

- `/app/projects/:projectId/content/video`
- `/app/projects/:projectId/content/video/:itemId`

The module route provides bounded setup, durable status, partial-failure retry,
asset filters, mock state, and planning-only boundaries. The generic item route
validates owner, project, module, item, and registered type before exposing any
metadata.

The editor is a responsive structured form. It provides explicit edit/save/
cancel, dirty-navigation protection, copy field/item, targeted regeneration,
scene ordering, version history, restore confirmation, provenance, and a
persistent mock marker. It never uses `contenteditable`, arbitrary JSON, media
players, or generated HTML.

The project Overview exposes Video & Reels as an available outcome after a
Brand Profile exists. Project navigation becomes active only after Video
configuration or content exists. The project Library supports URL filters for
Video platform, format, type, campaign, status, mock mode, and title.

## Authorization and security

The existing owner-scoped project and content repositories remain the
authorization boundary. Services derive ownership from the authenticated user;
item routes require project/module/item consistency. Missing and unauthorized
resources are neutral.

Generated planning content is untrusted plain text. No external URLs are
fetched, no HTML is rendered, and no snapshot or customer text is logged or
sent to analytics. Provider keys, platform credentials, storage, and media
services are absent.

## Analytics boundary

The safe event schema now recognizes Video module/setup/generation, asset open
and copy, whole-item/scene/shot/field regeneration, retry, and Library filter
events. Allowed properties are bounded enums and operational counts/states.
Titles, topics, scripts, scenes, captions, prompts, and clipboard content are
prohibited.

No analytics vendor is integrated.

## Synthetic seed

The guarded UrbanStride seed adds five fictional mock assets:

- Video Script;
- Shot List;
- Voice-over Script;
- Video Caption; and
- Video Production Brief.

The Video Script has two immutable versions and an explicit current pointer.
The seed remains disabled in production.

## Tests and CI

Coverage added:

- schema bounds, compatibility, strictness, order, identity, and duration;
- registry coverage and closed capabilities;
- durable parent/child generation;
- exact Brand Profile provenance;
- scene regeneration with stable identity and retained history;
- stale regeneration preserving current content;
- desktop and mobile module/editor/Library behavior; and
- neutral cross-user item access.

CI already runs Prisma generation/migrations, unit, PostgreSQL integration,
worker, build, and Playwright suites with no external media or AI dependency.

## Accepted decisions

- ADR-031: Concept-to-asset durable fan-out.
- ADR-032: Explicit scene/shot order and duration tolerance.
- ADR-033: Closed targeted Video regeneration.
- ADR-034: Planning-only media boundary.

## Deviations and unresolved items

- Field regeneration is intentionally limited to the approved closed targets.
- No preview player, asset upload, subtitle file, rendering, publishing,
  scheduling, TTS, voice cloning, or platform API is present.
- OpenAI and other real providers remain deferred.
- A deployed worker host remains vendor-unresolved.

## Acceptance result

- Frozen install: passed; no dependency change was required.
- Prisma client generation, migration, and guarded seed: passed.
- Formatting, lint, strict type-check, and token verification: passed.
- Unit/component: 36 passed.
- PostgreSQL integration: 7 passed.
- Durable worker: 9 passed.
- Production build: passed.
- Full Playwright suite with worker: 38 passed; 14 intentional
  viewport-specific skips.
- Targeted Video Playwright suite: 4 passed; 2 intentional project-specific
  skips.
- Production dependency audit: no known vulnerabilities.

Phase 4.4 does not implement the future full media-production or publishing
platform.

Related: [Generation architecture](10-generation-job-architecture.md),
[Versioning](14-versioning-and-provenance.md),
[Security](18-security-and-privacy.md), [Video UX](../ux/15-video-reels-module.md),
and [ADRs](27-architecture-decision-records.md).
