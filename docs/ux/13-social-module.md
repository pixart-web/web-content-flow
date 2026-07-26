# Social Module

## Screen specification

- **Screen/route:** Social `/app/projects/:projectId/content/social`; item `/content/social/:itemId`.
- **Purpose/goal:** Generate, filter, schedule-reference, and refine platform-aware social content.
- **Entry/exit:** Overview/nav → item, Calendar, export.
- **Required data:** Brand Profile version, platforms/formats/objective/quantity, items, filters, calendar references, jobs.
- **Hierarchy:** module header/generate → filters → item grid/list → unscheduled/calendar summary.
- **Desktop:** filter row + 2–3 cards; **tablet:** 2/1; **mobile:** filter drawer/chips + single cards.
- **Primary:** `Generate social content`; **secondary:** generate one, edit, copy, regenerate, assign date, open Calendar.
- **Components:** filter controls, content-item cards, badges, visual idea block, job indicator.
- **Default:** all items newest first; **empty:** setup generator; **filtered empty:** `No content matches these filters`; **loading:** card skeleton; **partial:** valid posts usable; **success:** item count; **error:** scoped batch/item retry.
- **Security/accessibility/analytics:** owner-only; filters labelled; cards expose title/platform/format/status; standard module/item/calendar events.
- **Acceptance:** platform/format/status filters combine predictably; date creates Calendar reference; regeneration retains prior item version.
- **Out of scope:** account connection, trend data, platform validation guarantee, auto-publishing/performance.

## Content model

Platforms: Instagram, Facebook, LinkedIn, TikTok. Formats: post, carousel, story, Reel concept; objectives/angles include educational, promotional, authority, engagement. Each item: title, objective, format, platform, visual idea, caption, hashtags, CTA, suggested date, calendar/status reference, provenance.

Favorites are excluded from baseline MVP; if approved later, use one boolean shared with Library and do not add a separate collection.

## Workflow

- **Trigger/prerequisites:** bulk/individual generate; current profile.
- **Main:** select platforms/formats/objective/quantity → job → cards → review/edit/date/copy.
- **Alternative:** individual item generation; calendar assignment accepts/change suggested date.
- **Failure/recovery:** partial batch retains valid items and lists failed count; retry failed items only.
- **Persistence/navigation:** filters may use query parameters; item canonical route; Calendar references item, never duplicates body.

Wireframe: [Social module](../../wireframes/app/social-module.md).
