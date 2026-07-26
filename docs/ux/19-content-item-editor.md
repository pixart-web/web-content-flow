# Content Item Editor

## Screen specification

- **Screen/route:** Content item `/app/projects/:projectId/content/:module/:itemId`.
- **Purpose/goal:** Review and safely modify one structured content item.
- **Entry/exit:** module/library/calendar → source context/module.
- **Required data:** item schema/current version, fields, status, provenance, profile version, jobs, calendar reference.
- **Hierarchy:** breadcrumb → item title/type/status/actions → provenance → labelled fields → save/action bar → versions.
- **Desktop:** 720–960 px editor + optional 320 px metadata panel; **tablet:** metadata drawer; **mobile:** full-screen single column.
- **Primary:** read `Edit`; edit `Save changes`. **Secondary:** Copy item/field, regenerate item/supported field, versions, export.
- **Components:** labelled inputs/textareas/selects, copy actions, save bar, provenance, version list/drawer, confirmation.
- **States:** read; editing clean/dirty; saving/saved; failed save; regeneration running/failed; stale profile; mock; not found/unauthorized.
- **Security/accessibility/analytics:** owner-only; no generic contenteditable; labels/error association; editor/item events without field content.
- **Acceptance:** save creates version; regenerate retains prior version; navigation protects dirty state; mobile keyboard does not cover actions.
- **Out of scope:** comments, simultaneous editing, rich collaborative diff, arbitrary prompt chat.

## Interaction rules

- Use explicit Save for multi-field item edits; optional reliable autosave may apply to single metadata fields, never obscure version boundaries.
- Copy field names scope in feedback; Copy item uses structured readable order.
- Supported field regeneration names field and creates a new item snapshot; unsupported fields offer whole-item regeneration only.
- Dirty + regenerate/restore/navigation → Save / Discard / Cancel.
- Save failure retains draft locally. Single-user stale conflict offers Reload latest or Copy my changes; never silently overwrite.
- Status (`idea`, `draft`, etc. where relevant) is metadata and creates a lightweight version only if product model requires audit; content edits always version.

Wireframe: [Content item editor](../../wireframes/app/content-item-editor.md).
