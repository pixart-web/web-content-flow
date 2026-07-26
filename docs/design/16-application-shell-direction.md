# Application Shell Direction

## Shell objective

Keep users oriented across global account context, the active project, its Brand Profile, content modules, and generation jobs. The shell is quiet; project work and content hold visual priority.

## Global sidebar

- 240 px desktop, white/subtle neutral surface with right border.
- Top: horizontal or symbol logo; compact app identity.
- Primary: Dashboard, Projects; global Library only if implemented per IA; Settings anchored lower.
- Active item: indigo-50 surface, indigo icon/text, 3 px indicator or equivalent shape.
- Do not add analytics, team, integrations, or publishing destinations to MVP navigation.

## Top header

- 64 px desktop/56 px mobile; surface default with subtle bottom border.
- Contains contextual page/project identity, compact generation-job access, and account menu.
- Avoid global search until project volume validates it.
- Notifications are not a social inbox: use a compact status center for generation completion/failure only if required.

## Dashboard

### Empty dashboard

One focused panel explains the workflow and offers `Create project`. A small structured preview may show Brief → Brand Profile → Modules. Do not fill the page with disabled metrics or feature cards.

### Returning-user dashboard

Order:

1. Continue most recent/incomplete project with next action.
2. `Create project` action.
3. Project cards/list with project name, brand, type, readiness/job status, selected modules, and last activity.
4. No portfolio analytics in MVP.

## Project header

- Shows project name and brand, setup/status summary, and project-level actions.
- `Export` is secondary until eligible content exists.
- Brand Profile version/provenance belongs in profile/content context, not as unexplained header metadata.
- Long names truncate visually with full accessible name.

## Project navigation

Follow the [Information Architecture](../08-information-architecture.md): Overview, Brief, Brand Profile, Content group (Website, Social, Ads & Creative, Video & Reels, General Copy), Calendar, Library, Project settings.

- Modules not selected are discoverable through `Add module` state without cluttering the default list.
- Use icons, labels, and active shape; subtle module accent is optional.
- Item detail provides breadcrumb/back context to module/library.

## Generation status visibility

- A running job creates a compact header/status-center indicator visible across project routes.
- Project Overview shows per-module durable states and partial completion.
- Completion may produce a nonblocking toast, but job status remains in the project record.
- Failure states state scope, preserved content, diagnostic reference when useful, and retry action.
- Mock mode uses persistent badge in shell and every generated result; it is never a temporary toast only.

## Notification behavior

MVP notifications are in-product operational feedback only. Do not imply email/push notifications or a full notification center unless implemented. Group repeated job updates; never toast every generated item.

## Loading shell

- Render stable sidebar/header/project identity before module data where authorization permits.
- Use skeletons matching project cards or content regions.
- Do not skeleton the logo/navigation after initial app shell load.
- Partial section failure leaves navigation and other completed sections usable.

## Mobile navigation

- Header contains menu, project title, and compact job indicator.
- Global navigation opens a labelled drawer.
- Project navigation uses a section selector/drawer; content modules are grouped and labelled.
- Editors open full-width; secondary actions move to overflow; primary save/generate remains reachable.

## Layout acceptance

The shell supports every journey in [User Journeys](../07-user-journeys.md), including resuming incomplete work, partial pack completion, item regeneration, version restore, export, and mock mode, without implying collaboration or publishing.

Related: [Spacing and Layout](06-spacing-and-layout.md), [Responsive Design](13-responsive-design.md), and [Component Foundations](08-component-foundations.md).
