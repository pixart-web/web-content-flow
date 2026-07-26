# Accessibility

## Target

The product interface targets **WCAG 2.2 AA**. Accessibility is an acceptance requirement, not a later theme or compliance pass.

## Color and contrast

- Normal text: minimum 4.5:1; large text: 3:1.
- Essential control boundaries, icons, and focus indicators: minimum 3:1 against adjacent colors.
- Do not use Electric Blue `#3B82F6` with white normal text.
- Status, selection, module, and validation meaning require text/icon/shape in addition to color.
- Test hover, active, disabled, tinted, and dark-token states—not only defaults.

## Keyboard and focus

- Every action is keyboard accessible in logical DOM order.
- Use a 2 px focus ring with 2 px separation; never remove it without an equivalent.
- Provide skip link to main content and landmarks for global/project navigation.
- Focus moves intentionally after dialog open/close, form error, item creation, and route change.
- No keyboard trap outside correctly modal surfaces.
- Drag behavior, if introduced later, must have keyboard alternatives; MVP calendar cannot depend on drag.

## Touch targets

- Minimum 44 × 44 CSS px for primary and mobile targets; 24 × 24 may be accepted for inline targets only with adequate spacing under WCAG exceptions.
- Keep destructive and adjacent actions separated sufficiently to prevent accidental activation.

## Structure and labels

- One logical page `h1`; headings descend without skipping for visual reasons.
- Use native elements before ARIA.
- Every field has a visible label; required/optional status is textual.
- Group radios/checkboxes with `fieldset` and `legend` where appropriate.
- Icon buttons have accessible names; decorative icons are hidden from assistive technology.
- Page and project titles update on navigation.

## Validation and errors

- Validate on sensible boundaries; do not interrupt on every keystroke.
- Associate field errors programmatically and summarize multi-field submission errors.
- State what went wrong, which scope is affected, whether content was preserved, and how to recover.
- Do not clear valid input after failure.
- Focus the first invalid field or error summary after failed submission without unexpectedly scrolling active editing.

## Motion and readability

- Honor reduced-motion settings as defined in [Motion and Interaction](11-motion-and-interaction.md).
- Support 200% text zoom and browser zoom without hidden functionality or two-dimensional page scrolling, except intrinsically spatial content.
- Default body is 16 px; interface support text no smaller than 12 px with sufficient contrast.
- Long generated text uses 45–75 character lines and user-selectable content.

## Screen-reader behavior

- Generation-job state changes use a polite live region; announce meaningful transitions only, not every animation tick.
- Errors requiring action may use assertive announcement sparingly.
- Progress components expose label, indeterminate/determinate state, and value when truthful.
- Content-item cards expose title, type, current version state, and action names in a predictable order.
- Mock output always includes programmatic “Mock content” text.
- Copy, save, regenerate, restore, and export results are announced.

## Generated-content editing

- Prefer labelled native inputs/textareas over unstructured `contenteditable`.
- Preserve cursor and focus across autosave; never rerender the editor on every save event.
- Expose current version and whether content is generated or user-edited.
- Regeneration confirmation states the exact item/section affected and that prior versions remain available.
- Version restore is a named button and confirms any unsaved edit consequence.

## Error recovery acceptance

A keyboard and screen-reader user must be able to identify a failed generation job, understand that prior content remains, retry the affected scope, and confirm the resulting state without relying on visual animation.

Related: [Color System](04-color-system.md), [Component Foundations](08-component-foundations.md), and [Content Design](14-content-design.md).
