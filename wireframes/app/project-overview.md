# Project Overview Wireframe

**Screen purpose:** Show readiness, module states, recent content, and next action.  
**Route:** `/app/projects/:projectId`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Global  │ Header: Project                  Jobs | Mock | Account   │
├─────────┼───────────────────────────────────────────────────────────┤
│Overview●│ Project name / brand                  [Export] [Settings]│
│Brief    ├───────────────────────────────────────────────────────────┤
│Brand    │ Next action [Review Brand Profile]                       │
│Website  │ [Brief ready] [Profile v2 ready] [Jobs: 1 running]      │
│Social   │ Module cards: Website | Social | Ads | Video | Copy      │
│...      │ Recent content items                                    │
│Library  │ Export readiness                                        │
└─────────┴───────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Project Jobs Account│
│ Section: Overview        │
│ Project / status         │
│ Next action              │
│ [Review profile       ]  │
│ Brief / Profile readiness│
│ Module cards             │
│ Recent content           │
│ Export readiness         │
└──────────────────────────┘
```

## Regions and components

Shell, project header/nav, next-action panel, readiness, job indicators, module cards, recent item list, export panel.

## Interaction notes and states

Cards support not selected/setup/queued/running/partial/complete/failed/mock/outdated. Partial content opens; unselected modules use Add module.

## Acceptance criteria

No analytics dashboard; active context/status visible; scoped loading/errors; mobile priority matches hierarchy. See [Overview spec](../../docs/ux/08-project-overview.md).
