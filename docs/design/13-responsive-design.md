# Responsive Design

Desktop is the primary creation environment. Mobile remains functionally complete for account access, project navigation, review, light editing, copying, job monitoring, and essential generation actions.

## Breakpoints

| Range | Layout label | Default behavior |
|---|---|---|
| <640 px | Mobile | One column, 16 px gutter |
| 640–767 px | Wide mobile | One column, 24 px gutter |
| 768–1023 px | Tablet | One/two columns, navigation drawer/rail |
| 1024–1279 px | Laptop | Persistent or compact sidebar, max two content columns |
| ≥1280 px | Desktop | 240 px sidebar, multi-column dashboard |
| ≥1536 px | Wide desktop | Centered max-width content; no uncontrolled stretching |

## Navigation

- **Desktop/laptop:** persistent global sidebar; project navigation as a secondary row or left subnavigation, never both simultaneously.
- **Tablet:** compact rail or menu trigger; project sections in a horizontally scrollable labelled row or selector.
- **Mobile:** top header with menu and project identity; global navigation in drawer; project navigation in a clearly labelled section selector/drawer.
- Preserve active section, running-job access, and account action at every size.

## Content behavior

| Area | Desktop/laptop | Tablet | Mobile |
|---|---|---|---|
| Dashboard cards | 2–3 columns | 2 or 1 | 1 |
| Project overview | Next action + status, module grid | Stacked status + 2-col modules | Single stack; next action first |
| Forms/wizard | 640–760 px content, optional summary rail | Single main column | Single column; step actions visible; no blocked fields |
| Module content | Main list/grid; optional detail panel | List + drawer detail | Cards/list; detail full screen |
| Editors | Readable column with nearby actions | Full width; inspector drawer | Full width; actions bottom/overflow; preserve keyboard viewport |
| Tables | Full table | Hide nonessential columns | Card/list transformation preferred |
| Calendar | Month/list toggle; list may be default | Week/list | Agenda/list default; month optional overview only |
| Dialogs | 400–720 px centered | Centered or drawer | 16 px margins or full-screen for long form |
| Content previews | Side-by-side where useful | Stacked or swipe-free tabs | Stacked; no scaled-down desktop screenshot interaction |

## Sticky actions

- Use sticky save/generate actions only for long forms/editors where the action would otherwise be lost.
- Respect safe areas and on-screen keyboard.
- Never cover validation text, toasts, or final content lines.
- Provide equivalent actions in document flow.

## Responsive rules

- Reflow rather than shrink; body text stays 14–16 px.
- Do not truncate project/module names without accessible full text.
- Secondary card actions may move into a labelled overflow menu; primary action remains visible.
- Hover effects are enhancements; touch behavior is complete without hover.
- Avoid horizontal page scroll. A table may scroll inside a labelled region only when transformation would destroy meaning.
- Test long English labels and likely translated expansion even though full localization is out of MVP scope.

## Functional mobile acceptance

On a 320 CSS px viewport, users can sign in, create/resume a project, complete the brief, generate/review a Brand Profile, open any selected module, edit/copy/regenerate one content item, observe generation errors, and start a basic export without hidden or overlapping actions.

Related: [Information Architecture](../08-information-architecture.md), [Spacing and Layout](06-spacing-and-layout.md), and [Application Shell Direction](16-application-shell-direction.md).
