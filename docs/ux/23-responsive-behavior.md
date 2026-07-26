# Responsive Behavior

## Breakpoints

Use token thresholds: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Desktop ≥1280 is primary creation; laptop 1024–1279; tablet 768–1023; mobile <768; functional minimum 320 px.

| Area | Desktop/laptop | Tablet | Mobile |
|---|---|---|---|
| Sidebar | 240 px persistent; compact only if chosen | 72 px rail or drawer | hidden; global drawer from 56 px header |
| Header | 64 px, project identity + job + account | compact labels | menu + truncated accessible project name + job button |
| Project nav | persistent labelled row/subnav | scrollable labelled row or selector | section selector/drawer; active label visible |
| Wizard/forms | 640–760 px, optional step rail | one column | one column, 16 px gutter, step actions visible |
| Dashboard/cards | 2–3 columns | 2/1 | one stack; continuation first |
| Brand Profile | section index + 720–960 px content | index collapses | stacked sections; expanded edit full screen |
| Module content | list/grid + optional detail | 2/1 cards; detail drawer | list/cards; item detail full screen |
| Item editor | content + metadata panel | metadata drawer | full-screen editor; bottom action area respects keyboard |
| Calendar | list default; optional month + unscheduled rail | week/list | agenda/list; unscheduled as filter/section |
| Library | filter row + grid/list | 2/1 | search + filter drawer + list |
| Dialogs | 400–720 px centered | centered/drawer | 16 px margins or full screen for long forms |
| Drawers | 360–480 px side | side/full | full screen; short choices may bottom-sheet |
| Job indicator | header compact + status panel | same | labelled compact button + full-screen status drawer |
| Action bars | local/sticky only for long work | wrap | sticky when helpful; never covers errors/content |

## Behavioral requirements

- Reflow, do not scale desktop layouts. No page-level horizontal scrolling.
- Tables become cards/lists; spatial month calendar may scroll inside a labelled region only if list alternative exists.
- Hover is optional; every action has tap/focus behavior.
- Secondary actions move into a labelled overflow; primary action remains visible.
- Touch targets are 44 × 44 px. Body remains ≥14 px.
- Mobile supports project creation, review, basic editing, copy, generation/regeneration, job recovery, calendar review/change, library access, and export start.
- On-screen keyboard must not hide focused field, error, Save, or Cancel.

## Screen states

Empty/loading/error states use the same content priority at every size. Skeletons match reflowed layout. Toasts avoid safe areas and do not obscure sticky actions. Mock badge remains in mobile header and result cards.

Related: [Design Responsive Rules](../design/13-responsive-design.md), [Project Shell](07-project-shell.md), and [Wireframes](../../wireframes/README.md).
