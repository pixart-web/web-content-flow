# Spacing and Layout

## Base system

Use an 8 px rhythm with 4 px increments for compact relationships. Components consume named tokens rather than arbitrary values.

| Token | px | Typical use |
|---|---:|---|
| space-0 | 0 | Reset |
| space-1 | 4 | Icon/text optical gap, compact inset |
| space-2 | 8 | Inline gap, compact stack |
| space-3 | 12 | Control internal gap |
| space-4 | 16 | Default component/card compact padding |
| space-5 | 20 | Comfortable control group |
| space-6 | 24 | Default card/panel padding |
| space-8 | 32 | Section internal spacing |
| space-10 | 40 | Page block separation |
| space-12 | 48 | Major application section |
| space-16 | 64 | Marketing section minimum |
| space-20 | 80 | Marketing section standard |
| space-24 | 96 | Marketing hero/large section |
| space-32 | 128 | Large desktop marketing separation |

## Page gutters and containers

| Viewport | Gutter | Behavior |
|---|---:|---|
| <640 px | 16 px | Single-column mobile |
| 640–767 px | 24 px | Wide mobile/small tablet |
| 768–1279 px | 32 px | Tablet/laptop |
| ≥1280 px | 40 px | Desktop application |
| ≥1440 px marketing | 48 px | Wide marketing canvas |

- Application content max width: 1440 px; dense editor column: 960 px; readable text: 720 px/72ch.
- Marketing wide container: 1280 px; standard content: 1120 px; prose: 720 px.
- Center containers; do not stretch form fields or text across available ultrawide space.

## Grid

- Marketing: 12 columns, 24 px gutters desktop; 8 columns tablet; 4 columns mobile.
- Application content: 12-column conceptual grid with 16–24 px gaps; use CSS grid/flex layouts appropriate to content.
- Dashboard cards: 3 columns at ≥1200 px, 2 at 768–1199 px, 1 below 768 px.
- Module content uses a main column plus optional 320 px inspector only when the inspector is essential; otherwise avoid permanent right rails.

## Application shell dimensions

- Global sidebar expanded: 240 px; compact future option: 72 px; mobile: overlay drawer.
- Top header: 64 px desktop, 56 px mobile.
- Project secondary navigation row: 48 px minimum or left subnavigation where space permits; choose one pattern consistently.
- Main content minimum top/bottom padding: 32/48 px desktop, 24/40 tablet, 20/32 mobile.

## Density

- Default density is comfortable: 40 px medium controls, 44 px primary controls, 24 px card padding.
- Dense tables may use 40–44 px rows but must preserve 44 px interactive targets through padding or enlarged hit area.
- Do not use compact density on onboarding, forms, destructive dialogs, or mobile.

## Component spacing

- Card padding: 24 px default, 16 px compact, 32 px feature/marketing.
- Card grid gap: 16 px compact, 24 px default.
- Section heading to content: 16–24 px.
- Application section to section: 32–48 px.
- Marketing section to section: 80–128 px desktop, 56–80 px mobile.
- Form field stack: 20–24 px; label to control: 8 px; control to help/error: 6–8 px.
- Button group: 8–12 px; destructive action separated by 16 px or moved to its own region.

## Dashboard and project layouts

- Dashboard begins with one clear action and project continuity, not a metric wall.
- Project Overview uses a primary next-action panel, status summary, module grid, then recent content.
- Brand Profile and generated content use a readable centered main column; action bars align to the content edge.
- Sidebars and headers load independently of module content to preserve orientation.

## Breakpoints

```text
sm: 640 px
md: 768 px
lg: 1024 px
xl: 1280 px
2xl: 1536 px
```

Breakpoints are layout thresholds, not device labels. Components should respond to available width where practical.

## Behavior by range

- **Desktop ≥1280:** persistent sidebar, multi-column dashboard, optional two-column editor layouts.
- **Laptop 1024–1279:** persistent or compact sidebar; avoid three-column workspace content.
- **Tablet 768–1023:** sidebar drawer or compact rail; two-column cards where useful; inspectors become drawers.
- **Mobile <768:** one column; project section selector; cards stack; action bars wrap or become bottom sticky only when they do not obscure content.

Related: [Responsive Design](13-responsive-design.md), [Application Shell Direction](16-application-shell-direction.md), and [Design Tokens](17-design-tokens.md).
