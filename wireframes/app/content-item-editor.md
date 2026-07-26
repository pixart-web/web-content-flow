# Content Item Editor Wireframe

**Screen purpose:** Safely review/edit/copy/regenerate one structured content item.  
**Route:** `/app/projects/:projectId/content/:module/:itemId`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Project / Module / Item                                  │
│         ├──────────────────────────────────────────┬────────────────┤
│         │ Item title · Draft                       │ Metadata       │
│         │ [Edit] [Copy item] [Regenerate] [Export]│ Profile v3     │
│         │ Label [structured field / read value]   │ Generated/Edit │
│         │ Label [structured field / read value]   │ Versions       │
│         │ edit: [Cancel] [Save changes]            │ Calendar link  │
└─────────┴──────────────────────────────────────────┴────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Back Item          More  │
│ Title · status · Mock    │
│ Profile v3 / provenance  │
│ Label                    │
│ [structured field]       │
│ Label                    │
│ [structured field]       │
│ [Cancel] [Save changes]  │
└──────────────────────────┘
```

## Regions and components

Breadcrumb, item header/actions, provenance, labelled native fields, save bar, metadata/version access.

## Interaction notes and states

Explicit save; dirty navigation warning; copy feedback scoped; regeneration says prior version retained; save failure preserves draft; stale single-user conflict has Reload/Copy changes.

## Acceptance criteria

No generic contenteditable/chat; mobile keyboard/actions safe; versions/provenance clear. See [Editor spec](../../docs/ux/19-content-item-editor.md).
