# Accessibility Behavior

Target: WCAG 2.2 AA.

## Page and navigation

- `header`, global `nav`, project `nav`, `main`, and contextual `aside` landmarks have unique labels.
- Skip link moves to main content. One `h1`; headings describe visible hierarchy.
- Route change moves focus to `h1` or main only when expected; browser Back restores sensible prior focus/scroll.
- Active navigation uses `aria-current` plus visible shape/text.

## Keyboard order and overlays

- DOM order follows visual reading order: shell → page heading/actions → main content → supporting regions.
- Dialog/drawer focus starts at heading or first task control, stays inside when modal, closes by explicit button/Escape where safe, and returns to trigger.
- Tabs use tablist/arrow behavior; wizard steps are navigation/ordered progress, not tabs.
- Menus/listboxes use their respective patterns; do not mix semantics.

## Forms and validation

- Visible labels, required/optional text, fieldset/legend for groups, autocomplete/input modes.
- Continue/Save validates relevant scope; focus moves to error summary/first invalid field.
- Error text identifies correction and remains until resolved; valid fields remain populated.
- Dirty-state confirmation has Save/Discard/Cancel with safe default focus.

## Loading and generation

- Initial loading exposes one polite `Loading <screen>` status; skeletons are hidden from assistive technology.
- Job live region announces only meaningful transitions: queued, running named step, partial, ready, failed/cancelled.
- Indeterminate jobs do not expose fake values. Truthful item count uses `3 of 5 pages saved`.
- Users can leave job region without focus being moved on completion; toast is polite, durable status remains available.

## Content editing and versions

- Structured native controls replace generic `contenteditable`.
- Copy/save/regenerate/restore results are announced with scope.
- Regeneration confirmation says prior version retained. Version current/source/profile version are text.
- Restore confirmation explains new version creation and focus returns to updated item.

## Status, motion, targets, destruction

- Color never carries status alone; use icon + text + surface/border.
- All primary/mobile targets ≥44 px; focus ring meets 3:1.
- Reduced motion disables translation/shimmer/path animation while retaining state.
- Destructive action names object and consequence, is not preselected, and may require reauthentication/typed name for irreversible account/project deletion.

## Acceptance

A keyboard/screen-reader user can complete auth, wizard, generation monitoring, item edit/regeneration, version restore, calendar assignment, and export; recover from errors; and identify mock mode without vision or animation.

Related: [Design Accessibility](../design/12-accessibility.md) and [System States](25-empty-loading-error-states.md).
