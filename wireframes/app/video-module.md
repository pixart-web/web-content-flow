# Video & Reels Module Wireframe

**Screen purpose:** Manage structured scripts and scene plans.  
**Route:** `/app/projects/:projectId/content/video`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Video & Reels               [Generate scripts] [Export]  │
│ Video ● ├──────────────┬────────────────────────────────────────────┤
│         │ Scripts      │ Title · platform · estimated duration     │
│         │ Launch ●     │ Hook / CTA                                │
│         │ Education    │ 1 [Scene / on-screen / VO / camera]       │
│         │ Authority    │ 2 [Scene / transition / music / prompt]   │
│         │              │ [Edit] [Copy] [Regenerate] [Versions]     │
└─────────┴──────────────┴────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Video Jobs          │
│ [Generate scripts     ]  │
│ Script: Launch ▼         │
│ Hook / Duration / CTA    │
│ Scene 1                  │
│ Scene 2                  │
│ [Edit] [Copy] [More]     │
└──────────────────────────┘
```

## Regions and components

Script selector, metadata, ordered scene cards, structured production notes, item actions/job state.

## Interaction notes and states

Empty setup; partial scripts explicitly incomplete; estimated durations; regeneration versions. No player/timeline/rendering.

## Acceptance criteria

Required script/scene fields, ordering semantics, mobile full detail, scope boundary. See [Video spec](../../docs/ux/15-video-reels-module.md).
