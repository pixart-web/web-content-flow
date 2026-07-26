# Social Module Wireframe

**Screen purpose:** Generate/filter/review social content and assign Calendar dates.  
**Route:** `/app/projects/:projectId/content/social`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Social                     [Generate content] [Export]    │
│ Social● ├───────────────────────────────────────────────────────────┤
│         │ Platform ▼ Format ▼ Status ▼       [Clear filters]       │
│         │ [Card: LinkedIn · post · objective · caption · CTA]      │
│         │ [Card: Instagram · carousel · visual idea · date]        │
│         │ actions: Edit Copy Regenerate Add to calendar            │
└─────────┴───────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Social Jobs         │
│ [Generate content     ]  │
│ [Filters] active: 2      │
│ [Social content card]    │
│ Edit Copy More           │
│ [Social content card]    │
└──────────────────────────┘
```

## Regions and components

Module header, filter controls/drawer, job state, content-item grid, platform/format/status badges, actions.

## Interaction notes and states

Filtered empty clears filters; partial batch retains posts; suggested date becomes Calendar reference only after confirmation. Favorites absent.

## Acceptance criteria

All platforms/formats/fields supported; no publishing/account connection; item regeneration versions. See [Social spec](../../docs/ux/13-social-module.md).
