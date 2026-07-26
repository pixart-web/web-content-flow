# Library Wireframe

**Screen purpose:** Find canonical project content and reusable Brand Profile assets.  
**Route:** `/app/projects/:projectId/library`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Library                                                   │
│ Lib ●   ├───────────────────────────────────────────────────────────┤
│         │ Search [________________] Type ▼ Module ▼ Status ▼        │
│         │ Content items                                             │
│         │ [Website item] [Social item] [Ad concept]                 │
│         │ Brand assets                                              │
│         │ [Palette] [Image prompt] [Messaging block]                │
└─────────┴───────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Library             │
│ Search [______________]  │
│ [Filters]                │
│ Content items            │
│ [Canonical item]         │
│ Brand assets             │
│ [Palette] [Prompt]       │
└──────────────────────────┘
```

## Regions and components

Search/filter, result groups, content/asset cards, source-module links, copy/export actions.

## Interaction notes and states

First-use and filtered empty differ; partial groups load independently; mock/provenance visible. No uploads/DAM/favorites baseline.

## Acceptance criteria

One canonical item across module/calendar/library; project isolation; filter-light/mobile list. See [Library spec](../../docs/ux/18-library.md).
