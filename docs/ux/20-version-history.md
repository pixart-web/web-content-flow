# Version History

## Screen specification

- **Screen:** Item version drawer/panel on item route; no new route required for MVP.
- **Purpose/goal:** Understand provenance and restore an earlier snapshot safely.
- **Entry/exit:** `Versions` action → close/restore/current item.
- **Required data:** ordered snapshots, timestamp, source, profile version, generation-job reference, current marker, preview.
- **Hierarchy:** heading/current summary → newest-first version list → selected preview/metadata → restore action.
- **Desktop:** 400–480 px right drawer; **tablet/mobile:** full-screen drawer/page-like overlay.
- **Primary:** `Restore this version`; **secondary:** preview, copy, close.
- **Components:** version-history items, badges, preview, confirmation dialog.
- **States:** loading; one-version empty-like state; list; selected preview; restoring; restore success/failure.
- **Security/accessibility/analytics:** owner-only; focus trap/return; current announced; `version_history_opened`, `version_previewed`, `version_restored`.
- **Acceptance:** generated, manually edited, regenerated, and restored sources distinguishable; restore creates a new version and never deletes intervening versions.
- **Out of scope:** collaborative authors, branch/merge, field diff, comments.

## Restore workflow

Select version → preview → Restore → confirmation: `Restore version 2? Your current version will remain in history.` → create new snapshot with source `restored from v2` → make it current → announce success and return to updated item. Failure leaves current unchanged and drawer open.

Related: [Content Item Editor](19-content-item-editor.md).
