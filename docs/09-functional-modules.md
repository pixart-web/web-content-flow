# Functional Modules

This is a concise product specification. Detailed database schemas, API contracts, prompt templates, and UI designs are intentionally deferred.

## Shared generation rules

Every generation module receives the project brief, current Brand Profile version, module settings, and relevant existing content. Outputs must validate against a versioned structure before being saved as complete. Failed jobs never replace valid content. Mock and real adapters follow the same application contract.

## 1. Authentication

- **Purpose:** Secure account access and project isolation.
- **Primary user:** All users.
- **Inputs:** Credentials, verification/recovery data, consent.
- **Outputs:** Account, authenticated session, safe account state.
- **Core actions:** Register, sign in, sign out, recover access.
- **Data dependencies:** User account and provider identity.
- **Business rules:** Unique identity; protected routes; server-side authorization; no cross-account access.
- **States:** Empty—registration/sign-in prompt. Loading—submission/session check. Error—field-level or provider-safe recovery message.
- **MVP limitations:** Basic single-user accounts; no SSO, organizations, roles, or advanced security administration.

## 2. Dashboard

- **Purpose:** Start, find, and continue projects.
- **Primary user:** Returning or newly registered user.
- **Inputs:** Projects, last activity, status summaries.
- **Outputs:** Project list/cards and next actions.
- **Core actions:** Create, open, and optionally rename a project.
- **Data dependencies:** Account-owned project summaries and recent generation status.
- **Business rules:** Show only authorized projects; prioritize recent/incomplete work.
- **States:** Empty—first-project explanation. Loading—stable card skeletons. Error—retry without blocking new-project action where safe.
- **MVP limitations:** Basic list, no portfolio analytics, folders, bulk actions, or advanced search.

## 3. Project wizard

- **Purpose:** Create a viable project and collect shared generation context progressively.
- **Primary user:** Project creator.
- **Inputs:** Project name, brand name, project type, business description, product/service, audience and age, location, interests, customer problem, value proposition, objective, desired action, visual style, tone, preferred/avoided colors, keywords, competitors, reference websites, main language, selected modules.
- **Outputs:** Draft project and central project brief.
- **Core actions:** Start, move between steps, save/resume, review, confirm.
- **Data dependencies:** User, project, brief draft, module catalogue.
- **Business rules:** Essential identity/business/audience/objective fields required before generation; optional fields clearly marked; URL and color input validated.
- **States:** Empty—recommended examples. Loading—saving indicator. Error—retain local values and identify unsaved step.
- **MVP limitations:** One general wizard; no industry-specific branching beyond lightweight defaults.

## 4. Brand Profile

- **Purpose:** Serve as the shared, versioned context for all content generation.
- **Primary user:** Project owner/content creator.
- **Inputs:** Project brief plus optional regeneration instruction.
- **Outputs:** Brand summary, positioning, value proposition, mission, vision, values, audience summary, customer problem, brand promise, slogan, personality, tone, writing guidelines, words to use/avoid, visual direction, palette, typography, image direction, reusable image-generation prompt, key messages, and primary calls to action.
- **Core actions:** Generate, review, edit, approve/use, regenerate sections or full profile, inspect versions.
- **Data dependencies:** Brief, generation job, profile versions.
- **Business rules:** One current version; generated recommendations distinguished from supplied facts; future jobs reference a specific version; palette values valid.
- **States:** Empty—complete brief/generate action. Loading—section-aware progress or job status. Error—preserve last valid profile and offer retry.
- **MVP limitations:** Textual/structured identity guidance only; no final logo files, font licensing, or professional brand-book layout.

## 5. Project Overview

- **Purpose:** Summarize readiness, progress, content, and next action.
- **Primary user:** Any project user.
- **Inputs:** Brief/profile status, selected modules, jobs, recent items.
- **Outputs:** Readiness cards, progress summary, recent content, recommended action.
- **Core actions:** Continue brief, open profile/module, generate pack, retry failed job.
- **Data dependencies:** All project-level summaries.
- **Business rules:** Partial success visible; status derived from durable records, not client assumptions.
- **States:** Empty—setup checklist. Loading—project shell plus independent summaries. Error—section-level retry.
- **MVP limitations:** No performance analytics or automated strategic recommendations beyond workflow next steps.

## 6. Website generator

- **Purpose:** Create website information structure and page copy.
- **Primary user:** Entrepreneur, freelancer, agency operator.
- **Inputs:** Brief, Brand Profile, site objective, desired pages, constraints.
- **Outputs:** Sitemap/navigation; per-page purpose, sections, headlines, body copy, proof placeholders, and calls to action.
- **Core actions:** Generate site/page, edit fields, regenerate page/section item, copy/export.
- **Data dependencies:** Shared context, website items, versions, jobs.
- **Business rules:** Do not invent testimonials, statistics, certifications, or guarantees; mark missing proof as placeholder; maintain page-level hierarchy.
- **States:** Empty—choose recommended structure. Loading—job/page progress. Error—preserve completed pages and retry affected scope.
- **MVP limitations:** No visual builder, code export guarantee, hosting, SEO audit, or publishing.

## 7. Social content generator

- **Purpose:** Produce platform-aware social content aligned to an objective.
- **Primary user:** Freelancer, creator, marketing operator.
- **Inputs:** Shared context, platform, content goal, topic/offer, quantity, date range, optional constraints.
- **Outputs:** Content items with platform, format, objective, hook, caption/body, call to action, hashtags/notes where relevant.
- **Core actions:** Generate batch, edit, regenerate item, assign calendar date, copy/export.
- **Data dependencies:** Brand Profile, social items, calendar references, jobs.
- **Business rules:** Respect platform format without promising live platform limits; avoid duplicate concepts within a batch; factual claims come from brief/profile.
- **States:** Empty—platform and goal presets. Loading—batch progress. Error—save valid items; identify failed batch/item.
- **MVP limitations:** No publishing, live trend data, social account connection, or performance optimization.

## 8. Advertisements and creative concepts

- **Purpose:** Create channel-ready ad copy variants and practical creative directions.
- **Primary user:** Freelancer, agency, e-commerce marketer.
- **Inputs:** Shared context, campaign objective, offer, channel, audience, desired action, constraints.
- **Outputs:** Concept, angle, headline, primary text, description, call to action, visual concept, image prompt, and variations.
- **Core actions:** Generate concepts/variants, edit, regenerate one variant, copy/export.
- **Data dependencies:** Brand Profile, campaign inputs, ad items, jobs.
- **Business rules:** No fabricated results or prohibited claims; concepts distinguish copy from production guidance; channel compliance requires human review.
- **States:** Empty—campaign setup. Loading—concept/variant progress. Error—retain successful concepts and explain affected scope.
- **MVP limitations:** No media buying, live policy checker, image rendering requirement, audience sync, or campaign publishing.

## 9. Video and Reel scripts

- **Purpose:** Generate short-form video concepts and scripts ready for production planning.
- **Primary user:** Creator and marketing operator.
- **Inputs:** Shared context, platform, duration, objective, topic/offer, presenter style, call to action.
- **Outputs:** Concept, hook, scene/beat sequence, voiceover/dialogue, on-screen text, visual notes, caption, call to action.
- **Core actions:** Generate, edit scenes, regenerate item, copy/export.
- **Data dependencies:** Brand Profile, script items, versions, jobs.
- **Business rules:** Duration is an estimate; scene structure must remain editable; do not imply rendered media exists.
- **States:** Empty—format presets. Loading—script job. Error—preserve previous script and offer retry.
- **MVP limitations:** No video rendering, timeline editor, voice generation, stock licensing, or platform publishing.

## 10. General copy generator

- **Purpose:** Produce common marketing copy not covered by specialist modules.
- **Primary user:** All content creators.
- **Inputs:** Shared context, copy type, objective, audience, length, source notes, desired action.
- **Outputs:** Structured content item appropriate to email, product description, call to action, announcement, or custom brief.
- **Core actions:** Select type, generate variants, edit, regenerate, copy/export.
- **Data dependencies:** Brand Profile, copy template definition, items, jobs.
- **Business rules:** Templates define minimum fields; product facts cannot be invented; custom requests remain bounded by supported schema.
- **States:** Empty—copy-type chooser. Loading—generation status. Error—input guidance/retry.
- **MVP limitations:** Limited curated types; not an unrestricted chatbot or full email automation platform.

## 11. Content calendar

- **Purpose:** Organize generated content items by planned date and channel.
- **Primary user:** Freelancer and marketing operator.
- **Inputs:** Existing items, date, channel, status, optional note.
- **Outputs:** Basic calendar/list plan referencing content items.
- **Core actions:** Assign/change date, filter by module/channel/status, open item, remove from calendar.
- **Data dependencies:** Content items and calendar entries.
- **Business rules:** Calendar references the current item; removing an entry does not delete content; dates use explicit project/user timezone behavior.
- **States:** Empty—add generated content or generate social content. Loading—calendar skeleton. Error—retain unsaved change visibly and retry.
- **MVP limitations:** No auto-publishing, recurring schedules, drag-heavy planning requirement, or external calendar sync.

## 12. Asset and content library

- **Purpose:** Provide one searchable/browsable location for reusable project outputs.
- **Primary user:** Any project user.
- **Inputs:** Content items, Brand Profile assets, module/type/status filters.
- **Outputs:** Organized collection and item detail links.
- **Core actions:** Browse, basic search/filter, open, copy, export, and navigate to source module.
- **Data dependencies:** Current content-item versions, profile assets, metadata.
- **Business rules:** Project-scoped by default; one canonical item appears across module, calendar, and library.
- **States:** Empty—generate first module. Loading—incremental results. Error—retry query without affecting items.
- **MVP limitations:** No advanced DAM, uploaded binary asset editing, tagging taxonomy, or cross-account library.

## 13. Generation jobs

- **Purpose:** Reliably track asynchronous generation and recovery.
- **Primary user:** All users indirectly; operator for diagnostics.
- **Inputs:** Job type, project, Brand Profile version, module settings, adapter, idempotency context.
- **Outputs:** Queued/running/completed/failed/cancelled status, validated result references, safe error category, timestamps.
- **Core actions:** Start, observe, retry, and cancel when supported.
- **Data dependencies:** Project authorization, generation adapter, schemas, content storage, usage/cost controls.
- **Business rules:** Durable state; idempotent submission; bounded concurrency/retries; partial pack success; no valid-content replacement on failure.
- **States:** Empty—not applicable/no job. Loading—queued/running with honest progress. Error—actionable category and diagnostic reference.
- **MVP limitations:** Simple managed queue or database-backed worker; no complex workflow graph, provider failover, or priority marketplace.

## 14. Editing and versioning

- **Purpose:** Give users safe control over generated work.
- **Primary user:** Content creator/reviewer.
- **Inputs:** Current item, user edits, regenerated variant.
- **Outputs:** New current version plus retained prior versions and provenance.
- **Core actions:** Edit, save, compare metadata, restore, regenerate.
- **Data dependencies:** Content items, versions, user, profile version, generation job.
- **Business rules:** Save creates version/snapshot; regeneration affects one selected scope; version history is not a collaboration audit log.
- **States:** Empty—no content. Loading—save/regeneration indicator. Error—keep draft locally and current durable version unchanged.
- **MVP limitations:** Basic list/restore; no rich diff, branching, comments, or real-time conflict merging.

## 15. Export system

- **Purpose:** Move useful project content into downstream tools.
- **Primary user:** Freelancer, entrepreneur, marketer.
- **Inputs:** Project/module/item scope, current versions, chosen supported format.
- **Outputs:** Clipboard content or downloadable basic export.
- **Core actions:** Select scope, preview inclusion, copy/download.
- **Data dependencies:** Authorized content and export renderer.
- **Business rules:** Export current selected versions; preserve headings/labels; exclude internal secrets and raw prompts unless explicitly supported.
- **States:** Empty—explain eligible content. Loading—generating file. Error—retry or copy fallback.
- **MVP limitations:** At least one practical structured format plus copy; no branded client portal, complex templates, or direct publishing.

## 16. Settings

- **Purpose:** Manage account and generation behavior needed for MVP.
- **Primary user:** Account owner.
- **Inputs:** Name/profile, preferred language/timezone where supported, generation mode, provider configuration policy.
- **Outputs:** Persisted preferences and safe configuration status.
- **Core actions:** Update profile, choose mock/real mode when allowed, add/remove key if bring-your-own-key is selected, sign out.
- **Data dependencies:** Account, encrypted secrets/configuration, environment capabilities.
- **Business rules:** Secrets never redisplayed or logged; unavailable modes disabled with explanation; project language remains project-specific.
- **States:** Empty—defaults. Loading—save/validation status. Error—field-specific message without exposing secrets.
- **MVP limitations:** No teams, billing administration, granular notifications, integrations catalogue, or enterprise controls.

Related: [MVP Scope](06-mvp-scope.md), [User Journeys](07-user-journeys.md), and [Information Architecture](08-information-architecture.md).
