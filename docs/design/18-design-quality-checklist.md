# Design Quality Checklist

Use this checklist before design approval and frontend acceptance. “Not applicable” requires a brief reason.

## Global brand and system

- [ ] The view communicates connected workflow, not a catalogue of AI generators.
- [ ] Brand Profile is visually treated as shared context where relevant.
- [ ] Logo use follows the production brief and does not imply unapproved assets exist.
- [ ] Gradient is reserved for brand/flow emphasis, not used across routine surfaces.
- [ ] Module identity uses icon + label + subtle accent, never color alone.
- [ ] No robots, brains, wands, sparkles, glowing orbs, chat-first UI, neon cyberpunk, or excessive glass.
- [ ] Semantic tokens are used; arbitrary hex, spacing, radius, shadow, and type values are absent.
- [ ] The view is feasible through shared components for a solo developer.

## Typography and color

- [ ] Inter is used for dense interface and generated content; Poppins is selective.
- [ ] Page hierarchy is clear with no more than necessary type sizes/weights.
- [ ] Body line length and line height remain readable.
- [ ] Text and essential controls meet WCAG 2.2 AA contrast.
- [ ] Electric Blue 500 does not carry white normal-size text.
- [ ] Status and selection have non-color cues.

## Landing pages

- [ ] Hero explains one brief → connected process → complete content system.
- [ ] Outcomes lead; provider/model technology does not.
- [ ] Product preview is realistic or labelled conceptual.
- [ ] No fabricated logos, users, revenue, testimonials, analytics, or claims.
- [ ] CTA hierarchy is clear and copy remains a working hypothesis where applicable.
- [ ] Motion has pause/reduced/static behavior and does not obscure proof.

## Dashboard and application shell

- [ ] Global versus project navigation is unambiguous.
- [ ] Active project and section remain visible.
- [ ] Empty dashboard prioritizes `Create project`; returning dashboard prioritizes continuity.
- [ ] Generation status remains visible across project sections.
- [ ] Shell loads independently from module content where practical.
- [ ] No out-of-scope analytics, collaboration, publishing, or integrations are shown as available.

## Forms and wizard

- [ ] Required and optional fields are explicit.
- [ ] Labels remain visible; placeholders are examples only.
- [ ] Steps use progressive complexity and preserve entered content.
- [ ] Errors are associated with fields and summarized when needed.
- [ ] Save/loading state is visible without layout shift.
- [ ] Keyboard, mobile keyboard, autofill, and 200% zoom are supported.

## Project workspace and content modules

- [ ] Overview presents next action, readiness, module status, and recent content.
- [ ] Each module has clear empty, loading, complete, partial, and error states.
- [ ] Content items show type, provenance/version, and edit/copy/regenerate actions.
- [ ] Regeneration scope is explicit and prior content is preserved.
- [ ] Structured content is not rendered as a generic chat transcript.
- [ ] Calendar is planning-only; library points to canonical content items.
- [ ] Export language does not imply publishing.

## Loading, empty, success, and error states

- [ ] Skeleton matches expected layout and is not used for durable job progress.
- [ ] Generation uses honest stages or indeterminate state, not fake percentages.
- [ ] Empty state explains why, value, and one next action.
- [ ] Success states name the completed output without decorative celebration.
- [ ] Errors name scope, preserved work, and recovery action.
- [ ] Partial pack success remains usable.
- [ ] Mock content is persistently labelled.

## Interaction quality

- [ ] Hover, focus, active, disabled, loading, and error states are designed.
- [ ] Focus does not move unexpectedly; overlays return focus.
- [ ] Loading actions prevent duplicate submission without hiding context.
- [ ] Motion uses defined duration/easing and serves a functional purpose.
- [ ] Reduced motion preserves all state feedback.
- [ ] Toasts are not the sole record of important job state.

## Mobile and responsive

- [ ] Layout works at 320 px without page-level horizontal scrolling.
- [ ] Global and project navigation remain distinguishable.
- [ ] Cards, tables, calendar, forms, editors, and dialogs reflow appropriately.
- [ ] Primary actions remain reachable without covering content.
- [ ] Touch targets are at least 44 × 44 px for primary/mobile actions.
- [ ] Hover is never required.

## Accessibility

- [ ] Semantic headings, landmarks, labels, and native controls are used.
- [ ] Full workflow is keyboard operable with visible focus.
- [ ] Generation/status changes are announced without excessive live-region noise.
- [ ] Errors can be found, understood, and recovered with assistive technology.
- [ ] Generated-content editing and version restore are accessible.
- [ ] Text zoom, contrast, target size, and reduced motion have been tested.

## Generic AI UI rejection test

Reject or revise the design if removing the product name would make it indistinguishable from a generic AI template: centered gradient headline, glowing orb, sidebar of unrelated tools, prompt composer as primary interface, purple-everything cards, sparkle icons, invented analytics, or decorative glass panels. The identifiable structure should instead be project → Brief → Brand Profile → connected modules → structured content items.

Related: [Product Principles](../05-product-principles.md), [Component Foundations](08-component-foundations.md), and [Accessibility](12-accessibility.md).
