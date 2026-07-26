# General Copy Module Wireframe

**Screen purpose:** Create and transform common marketing copy.  
**Route:** `/app/projects/:projectId/content/copy`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ General Copy                    [Create copy] [Export]    │
│ Copy ●  ├──────────────┬────────────────────────────────────────────┤
│         │ Categories   │ [Item: Product description]               │
│         │ Slogans      │ Preview / status / profile version        │
│         │ Headlines    │ [Edit] [Copy] [Regenerate]                │
│         │ Products     │ Transform: Shorten | Expand | Tone        │
│         │ Emails ...   │ [Other copy items]                        │
└─────────┴──────────────┴────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Copy Jobs           │
│ [Create copy          ]  │
│ Category: Products ▼     │
│ [Copy item]              │
│ Edit Copy More           │
│ [Copy item]              │
└──────────────────────────┘
```

## Regions and components

Category chooser, item list/cards, transformation menu, job/status/actions.

## Interaction notes and states

Empty chooses category; transformations create versions for same purpose; new purpose creates item. Failure leaves current version.

## Acceptance criteria

All categories; no unrestricted chat/email sending; structured editor and version provenance. See [Copy spec](../../docs/ux/16-general-copy-module.md).
