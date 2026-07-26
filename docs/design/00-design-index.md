# Web Content Flow — Design Documentation Index

## Purpose

This design foundation turns the Product Foundation into implementable brand, interface, responsive, content, accessibility, and token rules. It defines intended behavior and appearance; it does not imply that the interface or production logo assets exist.

## Recommended reading order

1. [Brand Strategy](01-brand-strategy.md) and [Brand Personality](02-brand-personality.md)
2. [Logo System](03-logo-system.md), [Color System](04-color-system.md), and [Typography](05-typography.md)
3. [Spacing and Layout](06-spacing-and-layout.md), [UI Surfaces](07-ui-surfaces.md), and [Component Foundations](08-component-foundations.md)
4. [Iconography](09-iconography.md), [Illustration and Imagery](10-illustration-and-imagery.md), and [Motion and Interaction](11-motion-and-interaction.md)
5. [Accessibility](12-accessibility.md), [Responsive Design](13-responsive-design.md), and [Content Design](14-content-design.md)
6. [Marketing Website Direction](15-marketing-website-direction.md) and [Application Shell Direction](16-application-shell-direction.md)
7. [Design Tokens](17-design-tokens.md) and [Design Quality Checklist](18-design-quality-checklist.md)

Machine-readable references live in [`design-tokens/`](../../design-tokens/): `tokens.json`, `tokens.css`, and `tailwind-theme-reference.ts`.

## Authority and precedence

- [MVP Scope](../06-mvp-scope.md) remains authoritative for delivery scope.
- [Product Principles](../05-product-principles.md) remain authoritative for product behavior and trade-offs.
- This index and [Design Tokens](17-design-tokens.md) define naming and implementation handoff.
- [Color System](04-color-system.md), [Typography](05-typography.md), [Spacing and Layout](06-spacing-and-layout.md), and [Accessibility](12-accessibility.md) are authoritative for visual foundations.
- [Component Foundations](08-component-foundations.md) is authoritative for component behavior, subject to user journeys and accessibility.
- The JSON tokens are the canonical machine-readable values. CSS and TypeScript references must match them.

If design guidance conflicts with the Product Foundation, the Product Foundation wins and the discrepancy must be recorded.

## Relationship with the Product Foundation

The design system implements the project-based workspace, Brand Profile source of truth, structured content items, transparent generation jobs, user control, and progressive complexity defined in the [Product Index](../00-product-index.md). Future-looking visual guidance is labeled and does not add MVP functionality.

## Recording design decisions

Add unresolved choices to the “Unresolved design decisions” section below and, when they affect product scope or behavior, also to [Product Open Decisions](../13-open-decisions.md). When resolved, record date, owner, evidence, chosen option, affected documents/tokens, and review trigger. Update documentation and all three token references in the same change.

## Implementation handoff

1. Consume semantic tokens; do not use primitive hex values directly in components.
2. Implement shared primitives before module-specific compositions.
3. Verify each component in default, hover, focus, active, disabled, loading, empty, success, and error states where applicable.
4. Test desktop and functional mobile layouts against [Responsive Design](13-responsive-design.md).
5. Validate contrast, keyboard, announcements, touch targets, and reduced motion before acceptance.
6. Treat logo guidance as a production brief until approved vector assets are supplied.

## Unresolved design decisions

- Final production logo geometry and wordmark customization.
- Poppins/Inter delivery method and performance budget.
- Exact structured export format and its visual preview.
- Whether project modules use one shared accent or the documented subtle module accents in the first implementation.
- Calendar desktop presentation after usability testing: compact month grid or list-first default.
- Dark-mode release timing; tokens are prepared, but dark mode is not an MVP requirement.

## Document status

All design decisions are **working recommendations** unless explicitly labeled approved fact or unresolved. Marketing copy remains a hypothesis. See [Design Quality Checklist](18-design-quality-checklist.md).
