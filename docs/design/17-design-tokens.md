# Design Tokens

## Architecture

Use three layers:

1. **Primitive tokens:** raw palette, numeric spacing, font families, and base durations; e.g. `color.brand.indigo.500`.
2. **Semantic tokens:** roles independent of component; e.g. `color.text.primary`, `color.surface.default`, `color.action.primary`.
3. **Component aliases:** only when a component has a durable unique role; e.g. `radius.card`, `shadow.overlay`. Avoid component tokens that duplicate semantic values without need.

The canonical machine-readable source is [`tokens.json`](../../design-tokens/tokens.json). [`tokens.css`](../../design-tokens/tokens.css) exposes implementation-ready custom properties. [`tailwind-theme-reference.ts`](../../design-tokens/tailwind-theme-reference.ts) is documentation only and does not configure or install Tailwind.

## Naming convention

```text
category.group.role.state-or-scale
```

Examples:

```text
color.brand.indigo.500
color.text.primary
color.surface.default
color.border.focus
space.4
radius.card
shadow.overlay
motion.duration.fast
motion.easing.standard
breakpoint.lg
layout.container.app
```

- Lowercase dot notation in JSON/documentation; kebab-case CSS custom properties.
- Names describe purpose. Avoid names such as `blueButton` or `leftPanelGray`.
- State suffixes are `hover`, `active`, `disabled`, `selected`, `focus`.
- Primitive numeric keys represent scales, not pixels in usage code.

## Token groups

- **Color:** blue/indigo/purple and neutral primitives; status primitives; semantic text, surface, border, action, focus, overlay; future dark assignments.
- **Typography:** display/interface/mono families; size, line height, weight, letter spacing.
- **Spacing:** 0–32 scale following 4/8 px rhythm.
- **Radius:** none, control, card, panel, overlay, pill.
- **Borders:** width default/strong and semantic color assignments.
- **Shadows:** card, raised, overlay, focus.
- **Opacity:** disabled, muted decoration, overlay.
- **Z-index:** base, sticky, dropdown, overlay, modal, toast, tooltip.
- **Motion:** durations and easing curves.
- **Breakpoints:** sm through 2xl.
- **Layout:** sidebar/header dimensions and container widths.

## Governance

- Components consume semantic tokens; marketing compositions may use primitives for approved gradients.
- New primitive colors require an accessibility/role rationale.
- Never add a token to solve one screenshot without checking reuse.
- Dark semantic overrides must preserve the same names; components must not branch on theme.
- Update JSON, CSS, TypeScript reference, [Color System](04-color-system.md), and affected documentation together.
- Token removal requires repository usage search once implementation exists.

## Unresolved token decisions

- Exact web-font delivery and fallback metric overrides.
- Whether component density becomes a tokenized mode after MVP.
- Final logo-specific gradient/profile tokens after vector approval.
- Dark-mode status surface tuning after visual and contrast testing.

Related: [Color System](04-color-system.md), [Typography](05-typography.md), and [Spacing and Layout](06-spacing-and-layout.md).
