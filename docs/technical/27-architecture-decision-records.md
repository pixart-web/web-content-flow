# Architecture Decision Records

## Template

```text
ADR-NNN: Title
Status: Proposed | Accepted | Superseded
Context:
Decision:
Alternatives:
Consequences:
Migration considerations:
Solo-developer impact:
Review trigger:
```

## Initial proposed ADRs

| ADR | Decision | Main consequence |
|---|---|---|
| 001 | Modular monolith: Next.js app + separately executable worker | Simple deployment/code sharing; no microservices |
| 002 | PostgreSQL authoritative store | Strong relational ownership/transactions; managed vendor TBD |
| 003 | Prisma for ordinary access/migrations, reviewed SQL escape hatch | Productivity with explicit lease-query exception |
| 004 | Auth.js + server owner authorization | Vendor-neutral auth layer; credential recovery remains decision |
| 005 | One `AiProvider`: deterministic mock + OpenAI | Mock parity and bounded provider coupling; no routing |
| 006 | Database-backed durable job records/leases | Survives requests; worker hosting required |
| 007 | Periodic polling before SSE/WebSockets | Reliable/simple; controlled query overhead |
| 008 | Immutable Brand Profile/content snapshots + current FK | Safe restore/provenance; storage growth |
| 009 | Semantic design tokens consumed by Tailwind | Design consistency; token integration in Phase 0 |
| 010 | Markdown/JSON/plain-text renderer family | Useful portable MVP; PDF/DOCX/ZIP excluded |
| 011 | Server Components by default, narrow client islands | Smaller client state; server/client boundary discipline |
| 012 | Light-mode MVP; dark tokens future-ready | Scope control |

Each row must become a separate ADR file or expanded section before acceptance. Infrastructure vendors stay unselected.

## Phase 1 accepted decisions

### ADR-002 — PostgreSQL authoritative store

**Status:** Accepted for the database technology; deployed provider remains unresolved.

- **Context:** Phase 1 requires relational ownership and revocable sessions.
- **Decision:** Use PostgreSQL 16 locally and in isolated CI service containers. Deployed infrastructure must provide a standard encrypted PostgreSQL connection compatible with `pg`; no managed vendor is selected.
- **Alternatives:** SQLite, hosted vendor-specific database, document database.
- **Consequences:** Local development requires PostgreSQL. Deployment remains portable across managed PostgreSQL providers.
- **Review trigger:** A selected deployment provider cannot meet connection, backup, regional, or cost requirements.

### ADR-003 — Prisma 7 and migration workflow

**Status:** Accepted.

- **Decision:** Use Prisma 7.9 with the `pg` driver adapter. Commit reviewed migrations; use `prisma migrate deploy` in CI/deployment and `prisma migrate dev` only during local schema development.
- **Consequences:** Prisma Client is generated into `src/generated/prisma`; application code uses repositories rather than route-level Prisma access.
- **Review trigger:** Driver incompatibility, unsupported PostgreSQL capability, or a demonstrated performance constraint.

### ADR-004 — Auth.js-compatible database sessions and credentials

**Status:** Accepted for Phase 1.

- **Decision:** Use Auth.js v5 with the Prisma adapter and database session strategy. Registration/sign-in use server actions, Zod validation, and Argon2id password hashing. Successful authentication creates an opaque, HttpOnly, SameSite=Lax Auth.js database session; protected routes validate it through `auth()`.
- **Alternatives:** Managed OAuth, passwordless email, JWT sessions.
- **Consequences:** Authentication is deterministic locally and in CI without an external provider. Password recovery is unavailable until an email delivery provider and abuse controls are approved.
- **Security:** Passwords are never stored or logged; only Argon2id hashes persist. Safe internal return paths are allowlisted to `/app`.
- **Review trigger:** External launch, managed identity selection, or password-recovery implementation.

### ADR-013 — Explicit synthetic development seed

**Status:** Accepted.

- **Decision:** Seed only when `SEED_DEMO_DATA=true` and never when `NODE_ENV=production`. Use fictional `.local` accounts and UrbanStride data.
- **Consequences:** CI and development have deterministic empty/returning states without production seed risk.
- **Review trigger:** A dedicated demo environment or fixture service is introduced.

## Phase 2 accepted decisions

### ADR-006 — Database-backed jobs with PostgreSQL leasing

**Status:** Accepted.

- **Decision:** Persist jobs and ordered steps in PostgreSQL. A separate Node.js worker leases one available job with `FOR UPDATE SKIP LOCKED`, a token, and an expiry. Attempts are bounded.
- **Consequence:** Work survives requests and restarts without a queue vendor; deployment needs an available worker runtime.
- **Review trigger:** Throughput or hosting evidence shows the database queue is insufficient.

### ADR-007 — Polling before real-time transport

**Status:** Accepted.

- **Decision:** Poll an authenticated, owner-scoped status endpoint while a job is non-terminal.
- **Consequence:** Recovery stays simple; polling frequency must remain bounded.
- **Review trigger:** Generation volume or UX justifies SSE.

### ADR-008 — Immutable Brand Profile versions

**Status:** Accepted.

- **Decision:** Generation, manual save, and restore create snapshots. The project current-version foreign key updates transactionally.
- **Consequence:** Prior work and provenance remain available; retention controls may be needed later.
- **Review trigger:** Storage growth or branching/diff requirements.

### ADR-014 — Deterministic Phase 2 mock provider

**Status:** Accepted.

- **Decision:** Use the provider-neutral contract with one local mock adapter and validate all output with the production schema.
- **Consequence:** The workflow runs without an AI key or network; it does not validate real-provider output quality.
- **Review trigger:** Real AI integration begins.

## Phase 3 accepted decisions

### ADR-015 — Canonical content item and immutable versions

**Status:** Accepted.

- **Decision:** One `ContentItem` identifies a logical output; immutable `ContentItemVersion` rows hold bounded structured snapshots.
- **Consequence:** Every future module shares save, regenerate, restore, provenance, and Library behavior.
- **Review trigger:** A module demonstrates a requirement that cannot be represented by the shared envelope.

### ADR-016 — Explicit content current-version pointer

**Status:** Accepted.

- **Decision:** Use a unique `ContentItem.currentVersionId` named relation. Lock the item and verify the expected pointer before atomically inserting and switching versions.
- **Consequence:** No mutable current flags or silent stale overwrites; initial creation briefly permits null inside one transaction.
- **Review trigger:** Multi-user merge or branching becomes approved scope.

### ADR-017 — Framework-neutral content type registry

**Status:** Accepted.

- **Decision:** Resolve module/type to a Zod schema, schema version, serializable editor definition, and text formatter without React imports.
- **Consequence:** Future types require explicit registration and cannot fall back to arbitrary JSON editing.
- **Review trigger:** Registry scale requires code splitting or generated definitions.

### ADR-018 — Internal foundation-copy proof before module breadth

**Status:** Accepted.

- **Decision:** `COPY / FOUNDATION_COPY` proves the shared platform but is always labelled as internal Phase 3 foundation content.
- **Consequence:** Architecture is validated without claiming the full Copy module exists.
- **Review trigger:** Phase 4 module delivery begins.

## Phase 4.1 accepted decisions

### ADR-019 — Website page identity

**Status:** Accepted.

- **Decision:** Model every Website page as `WEBSITE / WEBSITE_PAGE` with a stable `identityKey` unique inside its Project/module.
- **Consequence:** Pages reuse shared ownership, Library, versioning, editor, restore, and provenance behavior without a Website-specific content store.

### ADR-020 — Parent job with page child jobs

**Status:** Accepted.

- **Decision:** A Website module job fans out to one durable child job per selected page and aggregates to complete, partial, or failed.
- **Consequence:** Valid pages survive sibling failures and each page retains exact job provenance and independent bounded retry.

### ADR-021 — Full-snapshot section regeneration

**Status:** Accepted.

- **Decision:** Section regeneration validates and replaces one section but persists a complete immutable Website page snapshot.
- **Consequence:** The existing current-pointer/version-history model remains authoritative; no mutable section records are introduced.

## Phase 4.2 accepted decisions

### ADR-022 — Campaigns remain request-level context

**Status:** Accepted.

- **Decision:** Keep bounded campaign context in Social module settings, generation requests, and snapshots; do not add a Campaign table.
- **Consequence:** Coherent batches are supported without campaign lifecycle complexity.

### ADR-023 — Deterministic Social child jobs

**Status:** Accepted.

- **Decision:** One Social parent deterministically plans a bounded set and persists one child per item.
- **Consequence:** Items fail/retry independently while reusing Website leasing, aggregation, and polling.

### ADR-024 — Closed Social field-regeneration targets

**Status:** Accepted.

- **Decision:** Permit only `POST_BODY`, `CAROUSEL_CAPTION`, `STANDALONE_CAPTION`, and `HASHTAGS`; validate and persist a complete snapshot.
- **Consequence:** Clients cannot submit arbitrary JSON paths and immutable versions remain authoritative.

### ADR-025 — Normalized hashtag storage

**Status:** Accepted.

- **Decision:** Store hashtags without `#`, deduplicate case-insensitively, and add `#` only during copy formatting.
- **Consequence:** Validation and editing use one deterministic representation.

## Phase 4.3 accepted decisions

### ADR-026 — Ads campaign context remains request-level

**Status:** Accepted.

- **Decision:** Keep bounded campaign, offer and audience context in ProjectModule settings, job requests, and snapshots; do not add an advertising Campaign table.
- **Consequence:** Coherent asset batches are supported without spend, publishing, optimization, or external campaign lifecycle complexity.

### ADR-027 — Durable parent and child Ads jobs

**Status:** Accepted.

- **Decision:** One Ads parent deterministically plans compatible assets and persists one durable child per asset.
- **Consequence:** Assets fail and retry independently while preserving valid sibling outputs and exact provenance.

### ADR-028 — Editorial variants with stable IDs

**Status:** Accepted.

- **Decision:** Store A/B alternatives as ordered arrays with stable IDs inside one asset snapshot.
- **Consequence:** Comparison and targeted regeneration are deterministic; variants carry no ranking, result, or performance claim.

### ADR-029 — Closed Ads regeneration targets

**Status:** Accepted.

- **Decision:** Accept only registered whole-item, variant, prompt, and field targets, then validate and persist a complete immutable snapshot.
- **Consequence:** Clients cannot submit arbitrary JSON paths and failed/stale changes never mutate current content.

### ADR-030 — Prompt packs remain neutral text assets

**Status:** Accepted.

- **Decision:** Model image prompt packs as structured textual content items and never invoke an image provider in Phase 4.3.
- **Consequence:** Creative direction is reusable without storage, model parameters, rendered images, or provider coupling.

## Phase 4.4 accepted decisions

### ADR-031 — Concept-to-asset durable Video fan-out

**Status:** Accepted.

- **Decision:** One Video parent job plans a bounded number of concepts and creates one durable child for every concept/content-type pair.
- **Consequence:** Planning assets fail and retry independently while valid siblings, idempotency, provenance, leasing, and polling reuse the shared generation architecture.

### ADR-032 — Explicit scene and shot order with duration tolerance

**Status:** Accepted.

- **Decision:** Store stable IDs and unique explicit ordinals for scenes and shots. Require Video Script scene totals to stay within 70%–130% of target duration.
- **Consequence:** Reordering and targeted regeneration are deterministic. Duration remains planning guidance rather than a false playback prediction.

### ADR-033 — Closed Video regeneration targets

**Status:** Accepted.

- **Decision:** Accept only registered whole-item, scene, shot, and approved field targets, then validate and persist a complete immutable snapshot.
- **Consequence:** Clients cannot submit arbitrary JSON paths; stable target identity is preserved and invalid/stale work cannot mutate current content.

### ADR-034 — Planning-only media boundary

**Status:** Accepted.

- **Decision:** Treat scripts, shot lists, voice-over copy, captions, and production briefs as structured text content. Do not add media upload, playback, rendering, editing, publishing, TTS, or platform APIs.
- **Consequence:** Phase 4.4 remains feasible for one developer and adds no storage, media-processing, external-provider, or publishing security surface.

## Phase 4.5 accepted decisions

### ADR-035 — General Copy reuses shared Content Items

**Status:** Accepted.

- **Decision:** Represent every General Copy deliverable as a registered `COPY` Content Item with an immutable full-snapshot version and explicit current pointer.
- **Consequence:** All Copy types share ownership, Library, editing, provenance, restore, and conflict behavior; no parallel document store or migration is introduced.

### ADR-036 — Durable parent and child Copy jobs

**Status:** Accepted.

- **Decision:** One bounded Copy parent job deterministically plans a pack and creates one durable, idempotent child job per asset.
- **Consequence:** Assets fail and retry independently; valid siblings, exact Brand Profile provenance, worker recovery, and polling reuse the established architecture.

### ADR-037 — Closed Copy section and field regeneration

**Status:** Accepted.

- **Decision:** Allow section regeneration only for registered section-based types and field regeneration only for the documented target enum. Persist a complete validated snapshot for each successful operation.
- **Consequence:** Clients cannot address arbitrary JSON paths, stable section identity survives regeneration, and invalid/stale work never mutates current content.

### ADR-038 — Editorial-only external boundary

**Status:** Accepted.

- **Decision:** Treat email, editorial, product, company, and sales outputs as reviewable text assets. Do not send, publish, fetch URLs, scrape sources, call SEO APIs, or integrate CRM/CMS/commerce systems.
- **Consequence:** Phase 4.5 adds no external-content, credential, delivery, or SSRF surface and remains feasible for a solo developer.

## Phase 4.6 accepted decisions

### ADR-039 — Calendar as a shared versioned Content Item

**Status:** Accepted.

- **Decision:** Register Calendar outputs in the shared Content Item registry and persist complete immutable snapshots with an explicit current-version pointer.
- **Consequence:** Calendar inherits ownership, editing, conflicts, restore, Library, and provenance without a parallel Calendar-entry database model.

### ADR-040 — Exact source-version capture

**Status:** Accepted.

- **Decision:** A linked Calendar entry captures the owned Content Item ID, exact current version ID, safe title/type metadata, mock state, and Brand Profile provenance when planning occurs.
- **Consequence:** Later source edits never silently rewrite an existing calendar; refresh is an explicit versioned operation.

### ADR-041 — Weekly durable fan-out

**Status:** Accepted.

- **Decision:** One Calendar parent job creates bounded, idempotent weekly child jobs through the existing database lease worker.
- **Consequence:** Valid weeks survive a sibling failure, failed periods can retry independently, and the module needs no new queue or polling system.

### ADR-042 — Calendar dates plus IANA timezone

**Status:** Accepted.

- **Decision:** Store planning dates, optional local times, and a valid IANA timezone in snapshots. Do not represent them as guaranteed provider delivery instants.
- **Consequence:** The MVP is clear across locales and DST boundaries without claiming external scheduling precision.

### ADR-043 — Planning-only publication boundary

**Status:** Accepted.

- **Decision:** Calendar statuses are manual editorial metadata. Do not call social, email, CMS, advertising, or scheduling providers.
- **Consequence:** `COMPLETED_EXTERNALLY` is a user record only and the phase adds no provider credentials, delivery claims, or external side effects.

## Phase 5 accepted decisions

### ADR-044 — OpenAI-first provider-neutral structured generation

**Status:** Accepted.

- **Decision:** Use OpenAI as the first real provider through a provider-neutral adapter and registry. Use the Responses API with strict Zod structured outputs, no tools, and application-controlled identifiers.
- **Consequence:** Modules share one validated contract and can change provider later without moving provider code into UI or domain persistence.

### ADR-045 — Immutable prompt registry and server model tiers

**Status:** Accepted.

- **Decision:** Address prompts by immutable key/version and select standard, premium, or repair models through server configuration; capture exact context and policy metadata on each durable job.
- **Consequence:** Generation is reproducible and auditable without exposing arbitrary model selection to clients.

### ADR-046 — One structural repair and classified bounded retries

**Status:** Accepted.

- **Decision:** Permit at most one schema-only repair after structural validation failure. Retry only classified transient transport, timeout, rate-limit, and provider-server failures within job attempt limits.
- **Consequence:** Repair cannot become an uncontrolled paid loop or invent missing business facts; current content remains unchanged after terminal failure.

### ADR-047 — Per-attempt usage and serialized quota reservations

**Status:** Accepted.

- **Decision:** Persist normalized real-provider usage per attempt and reserve expected tokens in a serializable job-idempotent transaction before execution. Reconcile or release after execution.
- **Consequence:** Concurrent jobs cannot intentionally bypass project/account limits; mock generation remains free of real quota accounting.

### ADR-048 — Effective-dated pricing and content-free telemetry

**Status:** Accepted.

- **Decision:** Calculate optional cost from an effective-dated integer minor-unit price registry. Never treat unknown cost as zero and never log raw prompts, outputs, secrets, or request IDs.
- **Consequence:** Operational accounting can evolve without rewriting usage history while customer content stays outside telemetry.

### ADR-049 — Deterministic fake provider in CI, mock retained

**Status:** Accepted.

- **Decision:** Keep deterministic mock generation as a product/development mode and use a fake OpenAI transport for real-path automated tests. Never make live provider calls in CI.
- **Consequence:** Provider, worker, quota, repair, and provenance behavior remain deterministic and secret-free.

## Phase 6 accepted decisions

### ADR-050 — Explicit rollout state and independent server flags

**Status:** Accepted.

- **Decision:** Model private, invite-only, public, and maintenance rollout states; independently gate registration, exports, project packages, and real AI on the server.
- **Consequence:** Launch can progress gradually without treating UI hiding as authorization.

### ADR-051 — Digest-only single-use password reset

**Status:** Accepted.

- **Decision:** Generate random reset tokens, store only SHA-256 digests, expire after 30 minutes, consume transactionally, and invalidate all sessions after reset.
- **Consequence:** Database disclosure does not reveal usable reset links; password recovery requires a production email provider and sender-domain controls.

### ADR-052 — Bounded database-backed exports

**Status:** Accepted.

- **Decision:** Render small current/selected immutable versions synchronously and persist expiring export bytes in PostgreSQL. Support TXT, Markdown, JSON, and Calendar CSV; gate the JSON project package separately.
- **Consequence:** MVP export needs no storage/queue vendor, but large ZIP/PDF/DOCX archives and long retention remain excluded.

### ADR-053 — Policy plans without billing

**Status:** Accepted.

- **Decision:** Represent `FREE` and `INTERNAL` as server-side entitlement policies and show truthful usage. Do not infer billing, subscriptions, checkout, or paid entitlement.
- **Consequence:** Limits are enforceable before a commercial billing model is selected.

### ADR-054 — Separate health, worker, and maintenance processes

**Status:** Accepted.

- **Decision:** Keep liveness dependency-free, make readiness verify configuration/database/migrations, run generation in a long-lived worker, and run retention cleanup as a bounded scheduled command.
- **Consequence:** Deployment contracts are explicit and do not pretend request functions are durable queues or schedulers.
