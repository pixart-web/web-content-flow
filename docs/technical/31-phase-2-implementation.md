# Phase 2 Implementation Record

## Status

Phase 2 implements project creation, a persisted project brief, deterministic mock Brand Profile generation, durable generation jobs, and immutable Brand Profile versions. Content modules, real AI, export, collaboration, and publishing remain excluded.

## Accepted decisions

- PostgreSQL remains authoritative. Prisma handles ordinary access; the worker lease uses reviewed PostgreSQL `FOR UPDATE SKIP LOCKED`.
- Generation runs outside request handlers in a separately executable worker.
- The Phase 2 provider is deterministic mock-only, performs no network call, and requires no AI key.
- Brief data is validated structured JSON with an explicit schema version and optimistic revision.
- Brand Profile versions are immutable. `Project.currentBrandProfileVersionId` is the transactional current pointer.
- Job status uses authenticated polling. WebSockets and SSE remain deferred.
- `RETRYING` is represented by `QUEUED` plus attempt count, not a persisted state.

See [ADRs](27-architecture-decision-records.md), [Generation Jobs](10-generation-job-architecture.md), and [Versioning](14-versioning-and-provenance.md).

## Database and migration

Migration `20260724000000_phase_2_projects_brand_profile` adds `ProjectBrief`, `BrandProfile`, immutable `BrandProfileVersion`, durable `GenerationJob`, ordered `GenerationJobStep`, the current-version pointer, and supporting enums/indexes.

Ownership always traverses `Project.userId`. Brief, profile, version, and job access starts with the trusted session user ID.

## Project wizard and brief

`/app/projects/new` provides six steps: Project; Audience and problem; Objective and action; Brand direction; Language and modules; Review. The same Zod section contracts validate browser and server boundaries. The first valid step creates a draft; subsequent saves require the expected revision. Drafts resume through an owner-scoped `draft` parameter. Finalization is idempotent through `(projectId, idempotencyKey)`.

`/app/projects/[projectId]/brief` reuses the structured editor. Brief edits do not regenerate or overwrite an existing Brand Profile.

## Mock generation

The mock adapter derives project-specific output from the saved brief, remains deterministic for identical input, and validates against the production Brand Profile schema. Test scenarios cover success, provider failure, invalid output, and timeout. OpenAI, provider routing, and AI keys are not present.

## Worker and recovery

Run `pnpm worker` continuously or `pnpm worker:once` for one available job. The worker reconciles expired leases, atomically leases one job, increments the bounded attempt count, records meaningful steps, validates mock output, persists a version/current pointer transactionally, and records a safe terminal result. Failed jobs can be explicitly requeued while attempts remain.

## Brand Profile

The profile route presents schema sections as structured cards, shows mock provenance, supports explicit field edits, full mock regeneration, and creates a new immutable version on save. Restore creates another version rather than mutating history. Failed regeneration leaves the current version unchanged. Palette editing is read-only in this phase pending a dedicated accessible color control; generated palette data remains visible and versioned.

## Routes

- `/app/projects/new`
- `/app/projects/[projectId]`
- `/app/projects/[projectId]/brief`
- `/app/projects/[projectId]/brand-profile`
- `/api/projects/[projectId]/generation-jobs/[jobId]`

Only Overview, Brief, and Brand Profile appear in project navigation.

## Production organization

- `src/domain`: production Zod contracts and provenance
- `src/server/ai`: provider-neutral contract and mock adapter
- `src/server/repositories`: owner-scoped persistence
- `src/server/services`: project setup and immutable version services
- `src/workers`: leasing/orchestration and Brand Profile handler
- `src/features/projects`: wizard, status, actions, and profile editor

Architecture reference files remain non-production documentation.

## Testing and CI

Unit tests cover brief bounds, deterministic mock output, and failure mapping. PostgreSQL integration tests retain Phase 1 ownership coverage. Dedicated worker tests cover leasing, version persistence, and safe failure. CI migrates isolated PostgreSQL, runs all three suites, builds, and starts the worker for E2E without an AI secret.

## Security and privacy

- Authorization precedes every project resource read.
- Polling returns safe status and step labels, not request snapshots.
- Generated content is untrusted text; arbitrary HTML is never rendered.
- UI errors exclude provider internals and stack traces.
- Brief/generated content is not logged or sent to analytics.
- Mock provenance is persistent and visible.

## Dependencies

`react-hook-form` was added for the wizard. No queue, AI, storage, analytics, or broad UI dependency was added.

## Deviations and unresolved items

- Worker hosting/trigger remains deployment-vendor dependent.
- Real provider configuration is deferred.
- Full palette editing remains deferred.
- Draft persistence occurs at explicit step boundaries, not on a timer.
- The deployed PostgreSQL vendor remains unselected.

## Acceptance

Mock mode works without an AI key; jobs are durable/idempotent; versions are immutable; access is owner-scoped; Phase 1 behavior remains; and no content module or real AI feature was introduced. Final command evidence is recorded in the Phase 2 handoff.
