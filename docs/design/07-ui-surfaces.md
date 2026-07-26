# UI Surfaces

All values are semantic token recommendations. Hover and active changes apply only when a surface itself is interactive.

| Surface | Background / border | Radius / shadow | Padding | Hover / active | Accessibility |
|---|---|---|---|---|---|
| Application background | `surface.canvas`; no border | none | page gutters | none | Never place controls without a distinguishable local surface when boundaries matter |
| Default elevated surface | `surface.default`; `border.default` | `radius.card` / `shadow.card` | 24 px | none | Text uses semantic colors; border remains visible at zoom |
| Interactive card | `surface.default`; `border.default` | `radius.card` / `shadow.card` | 20–24 px | hover: border strong + shadow raised; active: selected tint/inset ring | Entire card is one link only when no conflicting internal actions; keyboard state matches hover |
| Panel | `surface.default`; border where adjacent surfaces meet | `radius.panel` / none or card shadow | 24–32 px | none | Use heading and region semantics where useful |
| Drawer | `surface.overlay`; left border | 16 px exposed corners / `shadow.overlay` | 24 px | none | Traps focus only when modal; labelled close control; background inert if modal |
| Popover | `surface.overlay`; `border.default` | 10 px / `shadow.overlay` | 8–16 px | item-level hover/selected | Correct trigger relationship; Escape closes; collision-safe placement |
| Modal | `surface.overlay`; `border.subtle` | 16 px / `shadow.overlay` | 24 px | none | Labelled, focus trapped, Escape except critical irreversible step, focus returned |
| Global navigation | white or `surface.subtle`; right/bottom border | 0 / none | 12–16 px | item hover tint; active selected surface + indicator | Active state uses icon, label, and shape—not color only |
| Input surface | white; `border.strong` | `radius.control` / none | 10 px 12 px | hover darker border; focus semantic focus ring | Minimum 3:1 boundary where required; label always external or persistent |
| Selected surface | `surface.selected`; `border.selected` | inherited / none | context-specific | active inset ring | Add check, indicator, or selected text; never color only |
| Generated-content surface | white; neutral border, optional 3 px indigo leading rule | 12 px / `shadow.card` | 20–24 px | card hover only if openable; edit mode uses focus ring | “Generated,” “Edited,” and profile version use text/icon metadata; content remains selectable |
| Generation status: queued | neutral-100 / neutral-200 | 10 px / none | 12–16 px | cancel/retry controls only | Clock icon + “Queued”; status announced once |
| Generation status: running | blue-50 / blue-200 | 10 px / none | 12–16 px | no decorative hover | Progress/steps plus “Generating”; motion has reduced alternative |
| Generation status: complete | success surface/border | 10 px / none | 12–16 px | open-results affordance | Check icon + explicit completion text |
| Generation status: partial | warning surface/border | 10 px / none | 12–16 px | retry failed scope | Explain completed and failed portions; not a generic success |
| Generation status: failed | error surface/border | 10 px / none | 12–16 px | retry button | Error icon, safe explanation, preserved-work statement, recovery action |
| Overlay backdrop | `overlay.default` | none | 0 | clicking may dismiss noncritical overlay | Never be the only dismissal method; maintain sufficient foreground contrast |

## Surface hierarchy rules

1. Use at most three visible elevation levels in one application view: canvas, card/panel, overlay.
2. Prefer border and spacing before shadow. Shadows communicate separation, not decoration.
3. Avoid nested rounded cards. Use dividers, headings, or subtle surfaces inside a card.
4. Gradient surfaces belong to marketing highlights or small brand accents, not core forms and editors.
5. Module accents may mark a 3 px edge, icon tile, or tiny tag. They must not recolor the full workspace.
6. Keep generated content visually primary; generation controls and provenance are supporting layers.

Related: [Color System](04-color-system.md), [Component Foundations](08-component-foundations.md), and [Accessibility](12-accessibility.md).
