# Web Content Flow — UX Specification Index

## Purpose

This set defines the complete MVP interaction model, screens, routes, states, responsive behavior, accessibility behavior, analytics, and structural wireframes. It describes intended behavior; it does not imply implementation exists.

## Reading order

1. [Experience Principles](01-experience-principles.md) and [Navigation Model](02-navigation-model.md)
2. [Authentication](03-authentication-flow.md), [Onboarding](04-onboarding-flow.md), [Dashboard](05-dashboard-flow.md), and [Project Wizard](06-project-creation-wizard.md)
3. [Project Shell](07-project-shell.md), [Overview](08-project-overview.md), [Brief](09-project-brief.md), [Brand Profile](10-brand-profile.md), and [Generation System](11-generation-system.md)
4. Module specifications [12](12-website-module.md)–[18](18-library.md)
5. [Content Editor](19-content-item-editor.md), [Version History](20-version-history.md), [Export](21-export-flow.md), and [Settings](22-settings.md)
6. [Responsive Behavior](23-responsive-behavior.md), [Accessibility Behavior](24-accessibility-behavior.md), and [System States](25-empty-loading-error-states.md)
7. [Analytics Events](26-analytics-events.md), [Screen Inventory](27-screen-inventory.md), and [UX Acceptance Checklist](28-ux-acceptance-checklist.md)
8. [Wireframe index](../../wireframes/README.md)

## Authority

[MVP Scope](../06-mvp-scope.md) controls scope. [Product Principles](../05-product-principles.md) control trade-offs. [Information Architecture](../08-information-architecture.md) controls routes/navigation. [Functional Modules](../09-functional-modules.md) controls required module behavior. The [Design Index](../design/00-design-index.md) and design tokens control appearance and component foundations. This UX set controls screen hierarchy and interaction behavior subject to those sources.

## Handoff process

1. Implement routes and project shell from [Screen Inventory](27-screen-inventory.md).
2. Build shared state/action patterns before module screens: job indicator, module card, content item, structured editor, version list, export dialog.
3. Implement each screen’s default, empty, loading, partial, success, and error behavior.
4. Validate desktop and 320 px mobile behavior, keyboard flow, live regions, deep links, and session recovery.
5. Run [UX Acceptance Checklist](28-ux-acceptance-checklist.md) and design checklist before acceptance.

## Decision recording

UX decisions that change scope or behavior must also be recorded in [Product Open Decisions](../13-open-decisions.md). Record owner, evidence, choice, date, affected screens, and review trigger. Do not silently resolve conditional provider, pricing, archive, deletion, approval-gate, or export decisions.

## Unresolved UX decisions

- Whether post-registration orientation is a dedicated `/app` screen or an inline empty-dashboard panel.
- Exact Brand Profile approval affordance; recommendation remains a visible “Ready for generation” state without a hard gate.
- Calendar desktop default: list-first is recommended for MVP; month view remains optional.
- Favorites are excluded unless evidence justifies a simple boolean across modules/library.
- Project archive is not assumed; deletion is specified conditionally and requires confirmation.
- Provider-key setup appears only if the provider strategy requires user-supplied keys.
- Final export format priority remains unresolved; UX supports Markdown, JSON, and plain text when implemented.

## Status

All recommendations are Foundation UX v1. Cross-links and final file inventory are included here. No application code is part of this deliverable.
