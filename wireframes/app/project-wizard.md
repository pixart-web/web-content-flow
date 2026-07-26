# Project Wizard Wireframe

**Screen purpose:** Create a project brief and start Brand Profile generation.  
**Route:** `/app/projects/new`

## Desktop

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Logo                         New project                 Save status │
├──────────────┬───────────────────────────────────────────────────────┤
│ 1 Project ●  │ Step 1 of 6 — Project                                │
│ 2 Audience   │ Label [________________________________________]      │
│ 3 Objective  │ Label [________________________________________]      │
│ 4 Direction  │ Description [___________________________________]     │
│ 5 Modules    │             [___________________________________]     │
│ 6 Review     │ [Save and exit]                    [Continue]          │
└──────────────┴───────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Back  New project  Save  │
│ Step 1 of 6              │
│ Project                  │
│ Label                    │
│ [______________________] │
│ Description              │
│ [______________________] │
│ [Save and exit]          │
│ [Continue             ]  │
└──────────────────────────┘
```

## Regions and components

Step progress, form sections, visible labels/help/errors, save indicator, Back/Continue, final review summary and primary action.

## Interaction notes and states

Autosave after draft exists; Continue validates current step. Review edit links return without loss. Final action idempotent; project-created/job-failed navigates to project recovery state.

## Acceptance criteria

Six specified steps/fields; required/optional explicit; resume works; progress not percentage; 320 px functional. See [Wizard spec](../../docs/ux/06-project-creation-wizard.md).
