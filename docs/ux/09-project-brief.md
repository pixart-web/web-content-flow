# Project Brief

## Screen specification

- **Screen/route:** Project Brief `/app/projects/:projectId/brief`.
- **Purpose/goal:** Review and maintain the editable business source that informs the Brand Profile.
- **Entry/exit:** wizard/project nav → Brand Profile/Overview/any section.
- **Required data:** all brief fields, required/optional definitions, last saved time, current Brand Profile/version impact.
- **Hierarchy:** title/status → impact note → sections matching wizard → read/edit actions → save bar.
- **Desktop:** readable 720–960 px column; optional section index. **Tablet/mobile:** one column; section index collapses.
- **Primary:** `Edit brief` then `Save changes`; **secondary:** Cancel, jump to section, `Review Brand Profile`.
- **Components:** definition rows, labelled inputs, section headings, save status, warning dialog.
- **Default:** read mode; **empty:** incomplete draft with `Continue brief`; **loading:** stable section skeleton; **partial:** loaded sections plus retry; **success:** `Brief changes saved`; **error:** draft retained and `Couldn’t save changes`.
- **Security/accessibility/analytics:** owner-only; semantic form/summary; `brief_viewed`, `brief_edit_started`, `brief_saved`, `brief_save_failed`.
- **Acceptance:** no silent profile/content regeneration; unsaved navigation protected; required fields validate.
- **Out of scope:** comments, approvals, per-field collaboration, automatically scraping reference websites.

## Editing workflow

- **Trigger/prerequisites:** select Edit; project available.
- **Main path:** edit labelled fields → Save → new brief revision/timestamp → explain that Brand Profile remains unchanged until explicitly updated/regenerated.
- **Alternative:** Cancel restores durable values; autosave may be used per field only if reliable and state-visible.
- **Failure/recovery:** offline/save failure preserves in-memory draft; retry or copy changes; stale single-user conflict reloads authoritative record with warning.
- **Completion/persistence:** saved brief is authoritative business source; existing Brand Profile/content retains prior version/provenance.
- **Navigation after completion:** remain on Brief with `Review Brand Profile impact` action.

Wireframe: [Project brief](../../wireframes/app/project-brief.md).
