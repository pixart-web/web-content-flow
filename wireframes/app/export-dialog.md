# Export Dialog Wireframe

**Screen purpose:** Select current content and create a basic portable export.  
**Route:** Overlay on project/module/item source route

## Desktop

```text
┌──────────────────────── Export content ─────────────────────────────┐
│ Scope: Project / Module                                             │
│ [x] Brand Profile  [x] Website  [x] Social  [ ] Ads                │
│ Selected items (12) [Review selection]                              │
│ Format: (•) Markdown  ( ) JSON  ( ) Plain text                     │
│ Filename: web-content-flow_acme_project_2026-07-16.md               │
│ [Mock content included notice if applicable]                        │
│ [Cancel]                              [Export 12 items as Markdown] │
│ [Progress/error/status region]                                     │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Close  Export content    │
│ Scope / selection        │
│ [x] Website              │
│ [x] Social               │
│ Format                   │
│ (•) Markdown             │
│ ( ) JSON  ( ) Text       │
│ Filename preview         │
│ [Export 12 items      ]  │
└──────────────────────────┘
```

## Regions and components

Dialog/drawer, scope and item checkboxes, format radios, inclusion/filename summary, mock notice, progress/error actions.

## Interaction notes and states

No-content disables export with explanation. Export prevents duplicate request; success closes or offers file result; failure retry/copy fallback. Formats shown only if implemented.

## Acceptance criteria

Authorized current versions only; no secrets; no PDF/DOCX/ZIP/CSV promise; focus management. See [Export spec](../../docs/ux/21-export-flow.md).
