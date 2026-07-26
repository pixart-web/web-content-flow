# Returning Dashboard Wireframe

**Screen purpose:** Continue the most relevant project and access other projects.  
**Route:** `/app`

## Desktop

```text
┌──────────────┬──────────────────────────────────────────────────────┐
│ Logo         │ Dashboard                  [Create project] Account │
│ Dashboard ●  ├──────────────────────────────────────────────────────┤
│ Projects     │ Continue                                               │
│              │ ┌ Project / state / next action      [Continue] ┐    │
│              │ └────────────────────────────────────────────────┘    │
│ Settings     │ Projects                                               │
│              │ [Card: name, brand, type, readiness, modules, time]   │
│              │ [Card: failed generation + Review failure]             │
└──────────────┴──────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Dashboard [Create]  │
│ Continue                 │
│ [Project + next action]  │
│ Projects                 │
│ [Project card]           │
│ [Failed project card]    │
└──────────────────────────┘
```

## Regions and components

Shell, page action, continuation panel, project cards, status badges, module icons.

## Interaction notes and states

Draft → Continue brief; running → View progress; partial → Review available; failed → Review failure. Skeletons retain card geometry; section errors are scoped.

## Acceptance criteria

Zero/one/many project behavior; no fake metrics; inaccessible/deleted project never appears. See [Dashboard flow](../../docs/ux/05-dashboard-flow.md).
