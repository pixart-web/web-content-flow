# Empty Dashboard Wireframe

**Screen purpose:** Start the first project and explain Brief → Brand Profile → Modules.  
**Route:** `/app`

## Desktop

```text
┌──────────────┬──────────────────────────────────────────────────────┐
│ Logo         │ Dashboard                               Account      │
│ Dashboard ●  ├──────────────────────────────────────────────────────┤
│ Projects     │ Build a connected content system                     │
│              │ [Brief] → [Brand Profile] → [Selected modules]      │
│              │ One project keeps context and content together.      │
│ Settings     │ [Create project]                                     │
└──────────────┴──────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu  Dashboard  Account │
│ Build a connected system │
│ Brief                    │
│   ↓ Brand Profile        │
│   ↓ Selected modules     │
│ [Create project       ]  │
└──────────────────────────┘
```

## Regions and components

Global shell, heading, source-to-system orientation card, mock badge when active, primary button.

## Interaction notes and states

No analytics or disabled feature grid. Loading account state preserves shell; error offers Retry/Create if safe. Create opens wizard.

## Acceptance criteria

One obvious primary action; Brand Profile purpose understandable; mobile and keyboard complete. See [Dashboard flow](../../docs/ux/05-dashboard-flow.md).
