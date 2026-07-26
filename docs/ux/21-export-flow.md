# Export Flow

## Screen specification

- **Screen:** Export dialog/drawer from project/module; item copy remains inline.
- **Route:** canonical source route; no export route required.
- **Purpose/goal:** Select current content and move it to downstream tools in a basic format.
- **Entry/exit:** project header/Overview/module/item → download/copy then return.
- **Required data:** eligible authorized current versions, scope/module labels, mock flags, supported formats.
- **Hierarchy:** scope → selection → format → included-content summary → filename preview → export action/status.
- **Desktop:** 560–720 px dialog; **tablet/mobile:** full-screen or near-full drawer.
- **Primary:** `Export N items as Markdown/JSON/Text`; **secondary:** select all/none, Cancel, copy fallback.
- **Components:** checkboxes, format radio, summary, progress/status, error alert.
- **States:** no eligible content; loading items; configured; exporting; success; failure; partial excluded item explanation; mock notice.
- **Security/accessibility/analytics:** reauthorize selection; exclude secrets/raw prompts unless supported; labelled dialog/focus return; export events contain counts/types, never bodies.
- **Acceptance:** current selected versions only; hierarchy/labels preserved; filename safe; failure supports retry/copy.
- **Out of scope:** PDF, DOCX, ZIP, branded portal, publishing. CSV is not baseline; Calendar CSV requires later confirmation.

## Workflow

- **Project export:** choose modules/items; **module export:** module preselected; **item:** Copy item or supported single-item export.
- Formats recommended: Markdown human-readable, JSON structured, plain text where useful. Exact launch subset remains an open decision.
- Filename recommendation: `web-content-flow_<sanitized-project>_<scope>_<YYYY-MM-DD>.<ext>`.
- Server/client generation shows truthful progress (`Preparing file`, `Ready`), prevents duplicate action, and reports excluded unavailable items.
- Mock selection adds `Mock content` metadata/header.

Wireframe: [Export dialog](../../wireframes/app/export-dialog.md).
