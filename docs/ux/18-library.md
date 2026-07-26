# Project Library

## Screen specification

- **Screen/route:** Library `/app/projects/:projectId/library`.
- **Purpose/goal:** Find and reuse canonical project content and Brand Profile assets.
- **Entry/exit:** project nav/Overview → canonical item/source module/export.
- **Required data:** current content items, module/type/status metadata, prompts, palettes, messaging blocks, export records only if implemented.
- **Hierarchy:** title/search → lightweight filters → grouped/grid results → item detail/source link.
- **Desktop:** filter row + 3-column cards/list toggle only if justified; **tablet:** 2/1; **mobile:** search + filter drawer + list.
- **Primary:** open item; **secondary:** copy, export, open source module.
- **Components:** search, filter tags, asset/content cards, palette/prompt/message blocks, empty states.
- **States:** first-use empty; filtered empty; loading; partial result groups; success; query error; unauthorized/not found; mock labels.
- **Security/accessibility/analytics:** project-scoped owner-only; search label/result count; library search/filter/open events without query if sensitive (or classify query policy).
- **Acceptance:** one canonical item appears in module/calendar/library; search/filter-light only; mock/provenance visible.
- **Out of scope:** binary DAM, uploads/editor, taxonomies, cross-account library, bulk asset workflows.

Favorites are excluded unless approved consistently across Social/Library. Sorting defaults to recent update; add type/title sorting only if user volume requires it.

Wireframe: [Library](../../wireframes/app/library.md).
