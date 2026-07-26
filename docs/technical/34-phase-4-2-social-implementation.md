# Phase 4.2 Social Content Module

## Scope and boundaries

Phase 4.2 prepares structured Social content. It does not connect Social accounts, publish, schedule, measure engagement, generate images/video, or call platform APIs. Ads, Video, General Copy, Calendar, and OpenAI integration remain excluded.

Routes are `/app/projects/:projectId/content/social` and `/app/projects/:projectId/content/social/:itemId`. ProjectModule, job, item, version, and route reads remain owner-scoped. Missing and unauthorized resources are indistinguishable.

## Supported contracts

Platforms are `INSTAGRAM`, `FACEBOOK`, `LINKEDIN`, and `X`. Objectives are `AWARENESS`, `EDUCATION`, `ENGAGEMENT`, `SALES`, `LAUNCH`, `COMMUNITY`, `TESTIMONIAL`, `TIPS`, and `PROMOTION`.

Registered types are `SOCIAL_POST`, `SOCIAL_CAROUSEL`, `SOCIAL_STORY`, and `SOCIAL_CAPTION`. The strict request requires at least one platform, objective, and type. Quantity means total items across all combinations and is bounded from 1 to 20. Campaign context, topic, focus, CTA, tone, language, hashtags, notes, and mock scenario are bounded. Brand Profile version is captured server-side.

Campaign metadata remains request-level context in ProjectModule settings and item snapshots; no Campaign model was introduced.

## Schemas and editorial limits

Post snapshots contain platform, objective, title, hook, body, optional CTA, hashtags, notes/campaign, and provenance. X uses a conservative 500-character internal body limit, not a live platform guarantee.

Carousel snapshots contain 3–10 uniquely identified, explicitly ordered slides, caption, optional closing CTA, hashtags, and provenance. Story snapshots contain 2–8 uniquely identified, ordered frames and optional final CTA. Caption snapshots contain caption, optional CTA, hashtags, and provenance. Every schema is strict, versioned, bounded, and HTML-free.

Hashtags are stored without `#`. Input trims whitespace and one leading `#`, rejects spaces/invalid characters, caps length/count, and deduplicates case-insensitively. Copy formatters add `#`.

## Registry, persistence, and migration

All types use the shared registry for runtime validation, editor metadata, search extraction, copy formatting, and regeneration capabilities. Every output is one ContentItem with immutable versions and an explicit current pointer. Stable keys include batch digest, platform, type, and ordinal. Existing Project/module/identity uniqueness and job idempotency prevent duplicates.

Migration `20260727000000_phase_4_2_social` adds `SOCIAL` to `GenerationModule`; no table is added.

## Durable jobs and partial completion

A Social parent captures Brief revision, Brand Profile version, validated request, batch key, and idempotency key. It deterministically plans one child job per item using the Website orchestration pattern.

Children generate, validate, and persist independently. The parent aggregates to `COMPLETED`, `PARTIAL`, or `FAILED`. Valid items survive sibling failure. Owner-scoped bounded Retry queues only failed children.

Mock scenarios cover success, one-item failure, invalid carousel, LinkedIn timeout, and invalid hashtags. Execution is deterministic, local, schema-validated, and network-free.

## Editing, regeneration, and versions

Editors use labelled structured fields, React Hook Form, final Zod validation, explicit Save/Cancel, dirty-navigation protection, conflict detection, and immutable versions. Carousel slides and Story frames have keyboard Move up/down controls. Copy actions cover whole items, hashtags, slides, and frames.

Whole-item regeneration works for all types. Closed field targets are `POST_BODY`, `CAROUSEL_CAPTION`, `STANDALONE_CAPTION`, and `HASHTAGS`. Unsupported combinations are rejected. A candidate is inserted into a complete snapshot, fully validated, and transactionally versioned. Stale/failing operations preserve current content. Slide/frame regeneration is not exposed.

Restore creates a new `RESTORED` version. Existing items never change automatically after Brand Profile edits.

## Product integration

Social appears in project navigation after configuration/content. Overview exposes Add/Open Social. The module provides setup, state, durable progress, saved counts, partial failures, retry, platform/type filters, provenance, mock labels, and editor links.

Library supports module, platform, Social type, campaign, status, mock, and title filtering without external indexing. Social-specific filters operate over the bounded owner-scoped result set.

## Security, analytics, accessibility

Generated content is untrusted plain text and never rendered as HTML. No URL fetch, script execution, platform credential/token, arbitrary JSON path, Social API, or content logging is introduced.

Analytics permits only Project ID, platform/type/objective enums, counts, job/mock state, version, safe error, duration, and regeneration target. Campaigns, titles, hooks, bodies, captions, hashtags, CTAs, Briefs, and Brand Profiles are prohibited.

Forms use fieldsets, labelled controls, status text, 44 px targets, keyboard ordering controls, accessible clipboard feedback, and single-column 320 px behavior.

## Tests and CI

Schema tests cover request bounds/duplicates, hashtag normalization, all item structures, ordering/ID constraints, X limits, strictness, and versions. Registry tests cover all types. PostgreSQL worker tests cover fan-out and field regeneration. Playwright covers setup, Post editing/copying, Library filters, Carousel ordering, neutral denial, and mobile.

CI remains isolated and requires no AI, Social, storage, or analytics credential.

## Accepted ADRs

- ADR-022: campaigns remain request-level context.
- ADR-023: deterministic parent/child Social jobs.
- ADR-024: closed field targets with full-snapshot versions.
- ADR-025: normalized hashtags stored without `#`.

## Deviations and unresolved items

- Add-item-after-batch uses the same setup with quantity 1 instead of a compact dialog.
- Slide/frame regeneration is deferred.
- Deletion/archive, publishing, scheduling, external rules, and real analytics remain unresolved/out of scope.
- Dedicated relational Social metadata may be considered only if bounded Library filtering becomes insufficient.

## Acceptance

Accept when migration/seed/checks/build/tests pass; Social items share immutable versions; partial/failing work preserves valid current content; provenance and owner scoping are exact; and no external AI or Social functionality exists.
