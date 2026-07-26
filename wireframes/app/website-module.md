# Website Module Wireframe

**Screen purpose:** Generate and manage sitemap/page copy.  
**Route:** `/app/projects/:projectId/content/website`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Website                       [Generate] [Export]         │
│ Web ●   ├───────────────┬───────────────────────────────────────────┤
│         │ Pages         │ Home · purpose / SEO                      │
│         │ Home ●        │ [Hero section: headline/body/CTA]        │
│         │ About         │ [Proof section: placeholder/body]        │
│         │ Services      │ [Final CTA section]                       │
│         │ Contact       │ actions: Edit Copy Regenerate Versions   │
└─────────┴───────────────┴───────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Website Jobs        │
│ [Generate] [Export]      │
│ Page: Home ▼             │
│ Purpose / SEO            │
│ [Hero section]           │
│ [Proof section]          │
│ [CTA section]            │
└──────────────────────────┘
```

## Regions and components

Module header/status, sitemap list/selector, page metadata, section content-item cards/actions.

## Interaction notes and states

Empty/Add module; meaningful generation steps; partial page failures; page/section regeneration retains version. Copy/export only—no canvas/publish.

## Acceptance criteria

Initial page set supported; structured section fields and SEO recommendations; mobile page navigation; profile provenance. See [Website spec](../../docs/ux/12-website-module.md).
