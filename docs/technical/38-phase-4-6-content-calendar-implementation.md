# Phase 4.6 Content Calendar Implementation

## Scope and status

Phase 4.6 implements project-scoped editorial planning on the shared content platform. It does not schedule or publish externally, fetch third-party content, provide analytics, or add a second content/version store.

## Accepted decisions

- Calendar is a shared `ContentItem` module with `EDITORIAL_CALENDAR`, `CAMPAIGN_PLAN`, and `CONTENT_SCHEDULE` registered types.
- Calendar entries reference an exact Content Item version or remain an explicit planned placeholder.
- Dates are stored as calendar dates plus an IANA timezone. Optional times are local planning guidance; the module does not calculate delivery instants.
- A module parent job fans out by bounded week. Completed weeks remain useful when another week fails.
- Month, week, and list are projections of the same immutable snapshot, not separate records.
- Calendar status is editorial metadata. It does not imply an external publishing action.

See [ADRs](27-architecture-decision-records.md) and the [Phase 4.6 UX](../ux/17-content-calendar.md).

## Migration

`20260726193000_add_calendar_module` adds `CALENDAR` to the existing `GenerationModule` and `ContentModule` PostgreSQL enums. No previous migration is rewritten. Existing relational ownership, current-version pointers, provenance, job leases, and indexes are reused.

## Schemas and registry

`src/domain/calendar/calendar-schemas.ts` defines strict, bounded Zod contracts:

- planning periods: 7–366 days with a valid IANA timezone;
- at most 500 entries, 20 campaigns, and 200 selected source items;
- explicit modules, channels, objectives, cadence, reuse rules, constraints, and source strategies;
- discriminated exact-source and placeholder references;
- stable entry IDs and unique ordinals;
- closed whole, entry, week, month, campaign, and field regeneration targets.

The framework-neutral content registry supplies validation, editor metadata, capabilities, and plain-text copy formatting. Generated HTML is rejected and never rendered.

## Generation and partial recovery

`calendar-service.ts` authorizes project ownership, captures the current Brand Profile version and exact selected content versions, saves settings, and creates an idempotent parent job. The existing worker leases the parent and creates one idempotent child per week. Children persist validated entries in job-safe structured state; the parent creates one canonical Calendar item only after valid output exists.

If one period fails, successful periods are persisted and the parent becomes `PARTIAL`. Failed child jobs can be retried independently. Repeated idempotency keys do not create duplicate items. Invalid output does not update the current pointer. Regeneration captures the expected current version and only creates a new immutable version after complete validation.

Mock output is deterministic, contains no HTML, requires no API key or network, and records provider, prompt/schema versions, job ID, Brand Profile version, timestamp, and mock status.

## User experience

The Calendar route is `/app/projects/:projectId/content/calendar`. It provides:

- setup for calendar type, period, timezone, cadence, modules, channels, objectives, source strategy, selected content, campaign context, and deterministic test scenario;
- honest queued/running/partial/failed status using the shared polling component;
- month, week, and list projections;
- URL-backed view, period, campaign, module, channel, status, and source filters;
- accessible empty/no-match states and an explicit external-publishing boundary;
- an owner-scoped content selector;
- a structured editor with explicit save, dirty-state protection, copy feedback, conflict handling, entry moves, duplication, source linking, item regeneration, and version restore.

Calendar is now shown in project navigation only when configured or content exists. Overview and Library expose real Calendar state without presenting unfinished integrations.

## Authorization and security

All services scope through `Project.userId`. Source selection verifies that every requested item belongs to the same owned project, is from an allowed source module, and has a current version. Item routes additionally verify project, module, and item consistency. Missing and unauthorized resources use neutral responses.

Snapshots are bounded untrusted text. The implementation does not use arbitrary HTML, fetch snapshot URLs, log content, call external scheduling APIs, or accept arbitrary client JSON paths.

## Analytics

The safe event taxonomy includes calendar configured, generation started/completed/partial/failed, view changed, entry opened/moved/duplicated/linked/refreshed/regenerated, period retried, version saved/restored, filter used, and external action recorded. Allowed properties are identifiers, enums, counts, mock state, job state, duration, and safe error codes. Titles, notes, snapshots, and copied content are prohibited.

## Seed and tests

The opt-in development seed adds a fictional UrbanStride editorial calendar with two immutable versions and mock Brand Profile provenance. It does not run in production.

Coverage includes schema bounds, strict objects, date constraints, duplicate identities, type registry, formatter behavior, shared authorization/version tests, worker leasing, and prior module regressions. CI continues to use PostgreSQL with migrations and no AI, publishing, analytics, email, or storage dependency.

## Deviations and unresolved work

- The MVP editor provides whole-item and entry regeneration. Campaign-plan and schedule editing remain intentionally lighter than the editorial-calendar editor.
- Entry status records manual editorial state only. No provider synchronization exists.
- The first release uses browser locale formatting over stored date/time/timezone fields; timezone conversion and daylight-saving scheduling are out of scope.
- Managed worker hosting, external publishing, export, and real AI remain unresolved future decisions.

## Acceptance result

The module uses durable idempotent jobs, immutable versions, explicit current pointers, exact Brand Profile/source provenance, partial recovery, owner-scoped queries, and deterministic mock output. It introduces no OpenAI, scheduling, publishing, image, video, analytics-dashboard, collaboration, or Calendar-entry table.

