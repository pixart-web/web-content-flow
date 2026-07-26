# Calendar Wireframe

**Screen purpose:** Plan dates/status for references to canonical content items.  
**Route:** `/app/projects/:projectId/calendar`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Calendar                   [Add content]  List | Month    │
│ Cal ●   ├─────────────────────────────────────┬─────────────────────┤
│         │ Filters: date/module/status         │ Unscheduled         │
│         │ Jul 16                              │ [Eligible item]     │
│         │ [Linked item · Draft · Social]      │ [Eligible item]     │
│         │ Jul 18                              │                     │
│         │ [Linked item · Scheduled* · Ads]    │ *planning only      │
└─────────┴─────────────────────────────────────┴─────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Calendar            │
│ [Add content] [Filters]  │
│ Scheduled = planning only│
│ Jul 16                   │
│ [Linked item · Draft]    │
│ Jul 18                   │
│ [Linked item · Scheduled]│
│ Unscheduled (2)          │
└──────────────────────────┘
```

## Regions and components

Boundary note, view/filter controls, date groups/month grid optional, reference cards, unscheduled items, status/date controls.

## Interaction notes and states

List-first; no required drag. Open goes to canonical item; remove deletes reference only. Update failure keeps old date/status.

## Acceptance criteria

No duplicated bodies/auto-publishing; manual scheduled/published semantics; mobile agenda complete. See [Calendar spec](../../docs/ux/17-content-calendar.md).
