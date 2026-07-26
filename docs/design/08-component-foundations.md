# Component Foundations

## Shared rules

- Use semantic tokens and the 40 px default control height; primary/high-value controls may be 44 px.
- Every interactive state includes default, hover, focus-visible, active, disabled, and loading when applicable.
- Loading controls retain labels and width; destructive behavior requires explicit wording.
- Icon-only actions need accessible names and tooltips when meaning is not universally clear.
- Mobile minimum target is 44 × 44 px even when the visible icon is smaller.

The tables below provide: purpose; variants; sizes; states; behavior; accessibility; mobile; and anti-pattern.

## Actions and inputs

| Component | Purpose | Variants | Sizes | States | Interaction behavior | Accessibility behavior | Mobile considerations | Anti-pattern |
|---|---|---|---|---|---|---|---|---|
| Button | Commit an action | primary, secondary, quiet, destructive | sm 32, md 40, lg 44 px | shared + loading/success where durable | One primary per region; spinner does not replace label | Native button; disabled reason available; focus ring | Full width only when hierarchy benefits | Multiple adjacent gradient primaries |
| Icon button | Compact secondary action | neutral, selected, destructive | 32 visible/44 hit; 40; 44 | shared + pressed | Tooltip on hover/focus; pressed state persists when toggle | Accessible name; `aria-pressed` for toggle | Keep 44 hit target; avoid action clusters | Unlabelled ambiguous sparkle icon |
| Link | Navigate or open detail | inline, navigation, standalone | text-size based | hover, focus, visited when useful, disabled rarely | Underline prose; external destination signaled | Native anchor, descriptive text | Do not rely on hover | Link styled as button without action semantics |
| Input | Short structured entry | text, email, URL, number, search | md 40, lg 44 | default, hover, focus, filled, invalid, disabled, read-only | Label remains visible; validation on blur/submit, not every keystroke | Programmatic label, described help/error, autocomplete | Correct keyboard/input mode | Placeholder as sole label |
| Text area | Multi-line brief/content | default, editor, auto-grow | min 96; editor 160+ px | input states + character guidance | Auto-grow to limit, then scroll; preserve draft on error | Label, described help/error; announce limits only when relevant | Avoid tiny fixed height; sticky save optional | Chat-composer styling for structured work |
| Select | Choose one known option | native/custom single | 40/44 px | input states + open | Use native on mobile where suitable; typeahead for long lists | Combobox/listbox semantics if custom | Full-width in forms; native picker accepted | Custom menu with broken keyboard controls |
| Checkbox | Select independent options | standard, card checkbox | 20 px control/44 hit | unchecked, checked, mixed, focus, disabled | Label toggles; mixed only for group summary | Native semantics; visible check | Stack choices; large label hit area | Checkbox used for mutually exclusive choices |
| Radio | Choose one option | standard, radio card | 20 px/44 hit | unchecked, checked, focus, disabled | Arrow keys move within group | Fieldset/legend and native radio semantics | Cards stack | Radios for multi-select modules |
| Switch | Immediate binary setting | standard | 36×20 or 44×24 | off, on, focus, disabled, loading if saved remotely | Change applies immediately; show save failure | Checkbox/switch role and current state | Do not place in dense ambiguous rows | Switch for actions requiring confirmation |
| Segmented control | Choose one of 2–4 local views | text, icon+text | 36/40 px | default, hover, selected, focus, disabled | Selection changes view without submission | Radio group or tabs based on effect | Horizontally scroll only if labels remain legible | More than four options or status-only color |
| Editable field | Edit one structured content field | view/edit, inline, expanded | content-dependent | viewing, hover, editing, saving, saved, error | Explicit edit; save/cancel; retain draft on failure | Label and edit mode announced; keyboard save not only path | Expanded editor/drawer for long text | Contenteditable without labels/version behavior |

## Selection, status, and navigation

| Component | Purpose | Variants | Sizes | States | Interaction behavior | Accessibility behavior | Mobile considerations | Anti-pattern |
|---|---|---|---|---|---|---|---|---|
| Tag | Describe category/filter | static, removable, interactive | 24/28 px | default, hover/focus if interactive, selected | Removal is separate named action | Text label; removable control announced | Wrap; avoid long rows | Status communicated only by tag color |
| Badge | Show compact status/count | neutral, info, success, warning, error, mock | 20/24 px | static; optional link | No interaction unless explicitly a link/button | Includes text/icon, not color alone | Keep labels short | Pulsing decorative badges |
| Tabs | Switch sibling content | line, contained | 40–48 px | default, hover, selected, focus, disabled | Preserve state; overflow uses scroll/menu | Tablist semantics and arrow keys | Horizontal scroll with visible edge cue | Tabs used for step-by-step wizard |
| Breadcrumbs | Show hierarchy and return path | default, compact | 32 px row | default, hover/focus, current | Last item not linked | Nav label; ordered list; current page | Collapse middle levels, preserve project/module | Full URL-like path on mobile |
| Navigation item | Move global/project context | global, project, nested | 40/44 px | default, hover, active, focus, disabled | Active indicator stable; submenu explicit | `aria-current`; icon decorative if label present | Same items in drawer/selector | Color-only active state |
| Progress bar | Show determinate progress | standard, compact | 4/8 px | 0–100, complete, error companion | Animate value modestly; do not invent percent | Label/value and progressbar semantics | Full available width | Fake precision for indeterminate generation |
| Generation-job indicator | Expose durable job state | queued, running, complete, partial, failed, cancelled, mock | compact row or status card | status-specific | Opens detail; retry/cancel only when valid | Live announcement throttled; icon+text | Sticky compact indicator allowed | Endless shimmer with no status or recovery |

## Containers and disclosure

| Component | Purpose | Variants | Sizes | States | Interaction behavior | Accessibility behavior | Mobile considerations | Anti-pattern |
|---|---|---|---|---|---|---|---|---|
| Card | Group related information/action | static, interactive, selected, status | compact/default/feature | default + interactive shared states | Click whole card only if one destination | Heading hierarchy; avoid nested controls in linked card | Stack; reduce padding to 16 px | Card for every text fragment |
| Content-item card | Present one canonical output | summary, expanded, editable | responsive; min 280 px | generated, edited, saving, failed update, selected | Open, edit, copy, regenerate, version actions; overflow for secondary | Named region/heading; action labels; provenance readable | Actions in overflow/bottom row; editor full width | Chat bubble or hidden version behavior |
| Module card | Identify and enter/generate module | setup, ready, running, complete, error, add-module | default/compact | status-specific + hover/focus | Opens module; primary action reflects state | Icon+label+status text; no color-only identity | One column; status remains visible | Different saturated theme per module |
| Dialog | Focused confirmation or short task | standard, destructive, form | sm 400, md 560, lg 720 max | opening, open, submitting, error | Focus trap; primary last; no accidental destructive default | Label/description, Escape except justified, return focus | Nearly full width with 16 px margins | Multi-page workflow in a modal |
| Drawer | Contextual editor/detail | right, left navigation, bottom mobile | 360–480 desktop; 90vh mobile max | opening/open/closing/error | Preserve context; modal if it blocks page | Same focus rules as dialog | Bottom sheet only for short tasks; full-screen for long edit | Permanent inspector on narrow screens |
| Dropdown | Compact menu of actions | action, selection | content-fit, max 320 px | closed/open/item states | Arrow navigation; close on selection/outside/Escape | Menu semantics only for actions; listbox for selection | Prefer action sheet if many items | Mixed form controls and navigation without grouping |
| Tooltip | Brief label/help | label, explanatory | max 280 px | hidden/visible | Delayed hover, immediate focus; not interactive | Trigger remains usable without it; description association if needed | Do not rely on tooltip; use inline help | Critical instructions only in tooltip |
| Toast | Confirm background/nonblocking event | success, info, warning, error | 320–420 px | enter, visible, dismiss | Auto-dismiss success; errors persist longer/actionable | Polite live region; dismiss button; no focus theft | Bottom/top safe-area placement, one at a time | Toast as sole record of generation failure |

## Feedback and data display

| Component | Purpose | Variants | Sizes | States | Interaction behavior | Accessibility behavior | Mobile considerations | Anti-pattern |
|---|---|---|---|---|---|---|---|---|
| Skeleton | Preserve layout during initial load | text, card, row, editor | mirrors content | loading, reduced motion | One subtle shimmer or static blocks | `aria-hidden`; parent exposes loading label | Fewer shapes, exact layout | Skeleton for known job progress or long animated shimmer |
| Empty state | Explain absence and next action | first-use, filtered, module, error-adjacent | compact/full | default | One primary action, optional help | Heading + explanation + actionable control | No oversized artwork; keep action visible | Celebratory AI illustration replacing guidance |
| Table | Compare repeated structured records | standard, selectable | rows 44–52 px | loading, empty, selected, sorted, error | Sort only where real; row action explicit | Proper headers/scope; keyboard controls | Convert to cards/list or horizontal scroll as last resort | Dense dashboard table on small screens |
| Version-history item | Show restorable snapshot/provenance | generated, edited, restored | 48–72 px | current, hover, selected, restoring | Open metadata; restore requires confirmation if edits at risk | Current version and timestamp labelled; restore button clear | Timeline/list in drawer/full screen | Fake diff or collaboration audit claims |
| Empty/error illustration | Support orientation sparingly | geometric static | 96–180 px | static | Never interactive | Decorative alt empty; meaning in text | Reduce size | Mascot, robot, or decorative error animation |

## Product action patterns

| Component | Purpose | Variants | Sizes | States | Interaction behavior | Accessibility behavior | Mobile considerations | Anti-pattern |
|---|---|---|---|---|---|---|---|---|
| Copy action | Copy current field/item | icon+label, icon-only secondary | 32/40/44 | default, copied, failed | “Copied” for 2–3 s; retry on failure | Announce result; icon-only named | Keep near content or overflow | Copy without scope clarity |
| Regenerate action | Start item-scoped generation | secondary button/menu item | 40/44 | default, confirming if overwrite risk, running, failed | State scope; preserve version; prevent duplicate request | Explain prior version retained; job status announced | Full label, not icon-only primary | Wand/sparkles or silent replacement |
| Export action | Move selected content out | secondary/primary at project completion | 40/44 | disabled-no-content, configuring, exporting, complete, failed | Select scope/format; show inclusion; fallback copy | Progress/status announced; downloaded filename described by browser | Export setup full-screen/dialog; simple copy immediate | Imply publishing or unsupported formats |

Related: [UI Surfaces](07-ui-surfaces.md), [Content Design](14-content-design.md), [Accessibility](12-accessibility.md), and [Functional Modules](../09-functional-modules.md).
