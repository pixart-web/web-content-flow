# Ads & Creative Module Wireframe

**Screen purpose:** Organize campaign concepts, copy variations, and image prompts.  
**Route:** `/app/projects/:projectId/content/ads`

## Desktop

```text
┌─────────┬───────────────────────────────────────────────────────────┐
│ Shell   │ Ads & Creative             [Create campaign] [Export]    │
│ Ads ●   ├───────────────────────────────────────────────────────────┤
│         │ Campaign: Launch / platform / audience / objective       │
│         │ ┌ Concept A ───────────┐ ┌ Concept B ───────────────┐    │
│         │ │ Angle / headline     │ │ Angle / headline         │    │
│         │ │ Copy / CTA           │ │ Copy / CTA               │    │
│         │ │ Visual / image prompt│ │ Visual / image prompt    │    │
│         │ └ Edit Copy Regenerate ┘ └──────────────────────────┘    │
└─────────┴───────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Ads Jobs            │
│ [Create campaign      ]  │
│ Campaign: Launch         │
│ [Concept A card]         │
│ Angle / Copy / Visual    │
│ Edit Copy More           │
│ [Concept B card]         │
└──────────────────────────┘
```

## Regions and components

Campaign grouping, concept cards, variation labels, structured copy/visual/prompt fields, actions/status.

## Interaction notes and states

Empty campaign setup; partial variations usable; regeneration scoped/versioned. “A/B” identifies variations only. No rendered ad/image.

## Acceptance criteria

All specified fields and boundaries visible; failure preserves successful concepts; mobile usable. See [Ads spec](../../docs/ux/14-ads-creative-module.md).
