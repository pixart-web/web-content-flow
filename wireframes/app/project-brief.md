# Project Brief Wireframe

**Screen purpose:** Review and edit the business source for the project.  
**Route:** `/app/projects/:projectId/brief`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Project header / navigation                              │
│ Brief ● ├───────────────────────────────────────────────────────────┤
│         │ Project Brief                         [Edit brief]         │
│         │ Changes affect profile only after explicit update.       │
│         │ Project | Audience | Objective | Direction | Modules      │
│         │ ┌ Read rows or labelled edit fields ──────────────────┐  │
│         │ └──────────────────────────────────────────────────────┘  │
│         │ edit: [Cancel] [Save changes]                             │
└─────────┴───────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Project Jobs        │
│ Section: Brief           │
│ Project Brief [Edit]     │
│ Impact note              │
│ Project section          │
│ Audience section         │
│ ...                      │
│ [Cancel] [Save changes]  │
└──────────────────────────┘
```

## Regions and components

Shell, impact alert, section index, definition list/read mode, structured form/edit mode, save status.

## Interaction notes and states

Dirty navigation invokes Save/Discard/Cancel. Save failure retains draft. Saved changes do not regenerate profile/content; action leads to review impact.

## Acceptance criteria

All wizard fields remain editable; required fields validate; explicit impact behavior. See [Brief spec](../../docs/ux/09-project-brief.md).
