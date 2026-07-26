# Brand Profile Wireframe

**Screen purpose:** Review/edit/version shared context for future generation.  
**Route:** `/app/projects/:projectId/brand-profile`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Project header / Jobs / Mock                             │
│ Brand ● ├───────────────────────────────────────────────────────────┤
│         │ Brand Profile v3 · Current     [Edit] [Versions] [More]  │
│         │ New content uses v3; existing content is unchanged.      │
│         │ Index │ Summary / Positioning / Audience                  │
│         │       │ Voice & writing / Visual / Messages & CTAs       │
│         │       │ [Structured section cards]                       │
└─────────┴───────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Project Jobs Mock   │
│ Brand Profile v3         │
│ [Edit] [Versions] [More] │
│ Impact note              │
│ Summary                  │
│ Positioning              │
│ Voice / Visual / Messages│
└──────────────────────────┘
```

## Regions and components

Version/status header, impact notice, section index, structured profile cards, palette/tags, edit/regenerate controls, job indicator.

## Interaction notes and states

Empty generates; section/full regeneration confirms and versions; failed job leaves current unchanged. Mock label persistent. Profile changed relative to Brief is visible.

## Acceptance criteria

All required profile sections; current/provenance clear; no automatic existing-content update. See [Brand Profile spec](../../docs/ux/10-brand-profile.md).
