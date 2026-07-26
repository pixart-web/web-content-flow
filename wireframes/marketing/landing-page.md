# Landing Page Wireframe

**Screen purpose:** Explain one brief → connected workflow → digital content system and drive account creation.  
**Route:** `/`

## Desktop

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Logo     Product  How it works  Use cases  Modules   Sign in [Create]│
├──────────────────────────────────────────────────────────────────────┤
│ Headline + support + [Create account] [See how it works]             │
│ ┌──────── Brief ───────┐ → [Brand Profile] → [Web][Social][Ads]...  │
├──────────────────────────────────────────────────────────────────────┤
│ Outcome cards: Launch brand | Build website | Campaign | Month plan │
├──────────────────────────────────────────────────────────────────────┤
│ Workflow 1 Brief → 2 Profile → 3 Modules → 4 Edit/export            │
│ Product previews | Comparison | Use cases                            │
│ Evidence placeholder only if clearly labelled                        │
│ Pricing placeholder | FAQ | Final CTA | Footer                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Logo            Menu     │
│ Headline                  │
│ Support                   │
│ [Create account]          │
│ [See how it works]        │
│ Brief                     │
│   ↓ Brand Profile         │
│   ↓ Module outputs        │
│ Outcome cards             │
│ Workflow / Previews       │
│ FAQ / CTA / Footer        │
└──────────────────────────┘
```

## Regions and components

Header/nav, hero, source-to-system product concept, outcome cards, workflow, comparison, product preview, use cases, optional evidence/pricing placeholders, FAQ, CTA, footer. Use buttons, links, cards, disclosures.

## Interaction notes and states

Hero flow may animate labelled stages; static/reduced-motion version communicates the same sequence. Mobile menu is a focus-managed drawer. Conceptual UI is labelled. Loading is limited to auth/session-aware CTA; failure falls back to public CTA. No real social proof exists.

## Acceptance criteria

Outcome leads AI mechanism; no fabricated customer proof or out-of-scope publishing/rendering; CTA and navigation work at 320 px; headings/landmarks and reduced motion comply. See [Marketing direction](../../docs/ux/../design/15-marketing-website-direction.md).
