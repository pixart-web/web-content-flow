# Phase 4.3 Ads & Creative Implementation

## Scope and boundaries

Phase 4.3 prepares structured advertising copy and creative direction. It does not connect advertising accounts, launch campaigns, manage budgets/bids/audiences, fetch landing pages, predict performance, certify compliance, render images/video, or call external AI or advertising APIs.

Canonical routes are:

- `/app/projects/:projectId/content/ads`
- `/app/projects/:projectId/content/ads/:itemId`

Generated content remains an untrusted draft. The UI states: “Review claims, disclosures and platform requirements before publishing.”

## Supported contracts

Channels are `GOOGLE_SEARCH`, `META_FACEBOOK`, `META_INSTAGRAM`, and `LINKEDIN`. Objectives are `AWARENESS`, `TRAFFIC`, `LEAD_GENERATION`, `CONVERSIONS`, `SALES`, `PRODUCT_LAUNCH`, `EVENT_PROMOTION`, and `RETARGETING`.

Registered content types are:

- `GOOGLE_SEARCH_AD`
- `META_AD`
- `LINKEDIN_AD`
- `CREATIVE_BRIEF`
- `IMAGE_PROMPT_PACK`

The strict generation request includes campaign context, objective, bounded channel/type selections, offer, audience, conversion action, optional landing-page context (stored only, never fetched), keyword themes, 1–5 editorial variants, output language, notes, and a development/test mock scenario. Duplicate enums, unknown fields, HTML-like content, unbounded arrays, and incompatible selections are rejected.

## Compatibility matrix

| Channel | Compatible assets |
| --- | --- |
| Google Search | Google Search Ad, Creative Brief, Image Prompt Pack |
| Meta Facebook | Meta Ad, Creative Brief, Image Prompt Pack |
| Meta Instagram | Meta Ad, Creative Brief, Image Prompt Pack |
| LinkedIn | LinkedIn Ad, Creative Brief, Image Prompt Pack |

Validation runs on client and server. Disabled controls are never an authorization or validation boundary.

## Asset schemas and editorial limits

All snapshots are strict, schema-versioned, bounded, plain-text Zod contracts with exact Brand Profile provenance.

- Google Search Ad: 1–5 stable variants; 3–15 unique headlines, 2–4 descriptions, display paths, CTA, keyword themes, and rationale.
- Meta Ad: Facebook or Instagram channel; primary text, headline, optional description, CTA, creative angle, visual direction, and rationale.
- LinkedIn Ad: introductory text, headline, optional description, CTA, professional angle, and rationale.
- Creative Brief: audience insight, promise, key message, support points, visual and copy direction, deliverables, exclusions, and notes.
- Image Prompt Pack: 1–8 stable prompts with neutral editorial prompt text, composition, lighting, style, negative instructions, and overlay-copy guidance. It never invokes image generation.

These are internal editorial limits, not guarantees of current advertising-platform acceptance.

## Registry, identity, and migration

Migration `20260728000000_phase_4_3_ads_creative` adds `ADS` to `GenerationModule`. No new table is required.

Each output is a canonical `ContentItem` with immutable `ContentItemVersion` snapshots and an explicit current-version pointer. Registry definitions provide runtime validation, structured editor metadata, safe title/search extraction, type-specific plain-text copy formatting, and closed regeneration capabilities.

Stable item keys contain batch digest, channel, content type, and ordinal. The existing Project/module/identity uniqueness and generation-job idempotency constraints prevent duplicate assets.

## Durable generation and partial completion

An owner-scoped Ads module job captures the Brief revision, current Brand Profile version, validated request, batch identity, and idempotency key. It creates one child job per compatible planned asset.

Children generate deterministic mock content, validate it, and persist independently. Parent state aggregates to `COMPLETED`, `PARTIAL`, or `FAILED`. Valid assets remain usable if a sibling fails. Retry requeues only a failed child and does not recreate completed assets.

The deterministic mock scenarios cover success, one-asset failure, invalid Google output, invalid Meta variant, invalid prompt pack, LinkedIn timeout, and duplicate variant IDs. No network or AI key is used.

## Editing, comparison, and regeneration

The type-aware editor renders labelled plain-text inputs; it has no raw JSON editor or `contenteditable`. Save is explicit and creates a `MANUAL_EDIT` version after full-schema validation and current-version conflict detection. Failed saves retain the local draft.

Variants use stable IDs and array order. Large screens compare alternatives in a two-column grid; mobile stacks them. No variant is ranked and no winner or performance score is fabricated. Copy supports entire assets, individual variants, and individual prompts.

Whole-item regeneration is available for every Ads type. Variant regeneration is available for Google, Meta, and LinkedIn assets. Prompt regeneration is available by stable prompt ID. Closed field targets cover headlines, descriptions, primary text, CTA, keyword themes, creative direction, image prompts, key message, visual direction, copy direction, and prompt negative instructions where compatible.

Every targeted operation constructs and validates a complete snapshot and creates a `REGENERATED` version. A stale pointer, provider failure, or invalid output leaves the current version unchanged. Restore creates a new `RESTORED` version.

## Product integration

Ads & Creative appears in project navigation only after configuration or content exists. Overview exposes a truthful add/open path. The module screen includes setup, boundary and review notices, module/job state, known saved counts, failed-scope retry, channel/type filters, provenance, mock labels, and canonical editor links.

Library supports Ads module, channel, type, campaign, status, mock, and title filtering over the bounded owner-scoped result set. There is no external search index.

## Authorization, security, and privacy

ProjectModule, job, item, version, route, and Library operations traverse Project ownership. Route project/module/item mismatches and cross-user identifiers resolve neutrally.

Generated advertising content is rendered only as escaped React text or form values. The application does not render generated HTML, fetch URLs, call advertising APIs, store platform credentials, upload audiences, execute prompt text, or log snapshots. Analytics allowlists only operational IDs, enums, counts, safe errors, duration, job state, mock state, version number, and closed regeneration targets. Campaign names, offers, audiences, keywords, copy, prompts, Briefs, and Brand Profiles are prohibited.

## Accessibility and responsive behavior

Setup choices use labelled fieldsets and 44 px controls. Compatibility errors are textual. Job updates use the shared bounded status component. Variant groups have meaningful legends, clipboard feedback uses status announcements, and all content remains understandable without color.

At 320 px, setup fields, choices, variants, prompts, and actions stack. Text wraps safely and sticky save actions remain reachable.

## Tests and CI

Schema tests cover request compatibility, duplicates, variant bounds/IDs, strictness, Creative Brief and prompt-pack validation. Registry tests cover all five Ads types and capabilities. Worker coverage exercises deterministic multi-asset fan-out, immutable initial versions, parent aggregation, and variant regeneration into a full new version. Existing authorization, repository, editor, Website, Social, build, and E2E suites remain part of CI.

CI requires PostgreSQL but no OpenAI, advertising, image, storage, or analytics credential.

## Accepted ADRs

- ADR-026: Ads campaign context remains bounded ProjectModule/request context.
- ADR-027: Ads module uses a durable parent and one child per planned asset.
- ADR-028: A/B variants are ordered editorial alternatives with stable IDs.
- ADR-029: targeted Ads regeneration uses closed targets and complete immutable snapshots.
- ADR-030: image prompt packs are neutral text assets and never invoke image generation.

## Deviations and unresolved items

- The setup form is reused to add a later asset rather than introducing a separate add-asset dialog.
- Variant ordering is persisted by array position and changed through labelled keyboard-operable move up/down controls; drag-and-drop is intentionally absent.
- The current compact editor exposes the main channel copy, Creative Brief direction, and prompt text. Secondary optional fields remain schema-backed and preserved during edits.
- Analytics has an allowlisted abstraction but no vendor transport.
- External platform rule synchronization, publishing, compliance review, archival, and real-provider integration remain unresolved/out of scope.

## Acceptance result

Accept Phase 4.3 when the migration, seed, formatting, lint, strict typecheck, token check, unit/integration/worker tests, build, Playwright suite, and production audit pass; Ads assets retain immutable history and exact provenance; partial/retry behavior preserves valid work; and no external advertising, image, or AI capability is introduced.
