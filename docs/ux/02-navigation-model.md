# Navigation Model

## Public navigation

`/`, `/product`, and `/pricing` when pricing exists; Sign in `/sign-in`; Create account `/sign-up`. Landing-page anchors may replace separate marketing pages for MVP.

## Authenticated navigation

- Global: Dashboard/Projects at `/app` and `/app/projects`; Settings `/app/settings`.
- Project root: `/app/projects/:projectId`.
- Project sections: Brief, Brand Profile, Website, Social, Ads & Creative, Video & Reels, General Copy, Calendar, Library, Project settings using the exact paths in [Information Architecture](../08-information-architecture.md).
- Do not add Billing, Team, Integrations, Publishing, or Analytics.

## Module and item navigation

Module list/detail remains under `/app/projects/:projectId/content/:module`. Item detail uses `/app/projects/:projectId/content/:module/:itemId`. Modules not selected are omitted from the active group or shown after a labelled divider as `Available modules`; direct access shows `Add module`.

## Breadcrumbs and back behavior

- Item: `Project / Module / Item title`; project/module are links, item is current.
- Project section pages use project identity plus active project navigation; breadcrumbs are unnecessary unless hierarchy would be ambiguous.
- In-product Back returns to source context stored in navigation state (module or library) when safe; otherwise returns to canonical module URL.
- Browser Back follows actual route history and must not be intercepted except for unsaved edits.

## History, deep links, and redirects

- Filters may use query parameters when shareable (`?platform=linkedin&status=draft`); transient dialogs need not.
- Deep links restore project shell and item/section after authorization.
- Signed-out deep links redirect to `/sign-in?returnTo=<safe internal path>`; successful sign-in returns there.
- Invalid/unauthorized opaque IDs show a neutral not-found/access state without leaking existence.

## Unsaved changes

- Explicit-save screens set a dirty state. Internal navigation, browser Back, refresh, and close invoke a standard browser-safe warning.
- Autosaved fields show `Saving`, `Saved`, or `Couldn’t save`; do not warn after confirmed durable save.
- Regeneration, restore, and mode changes cannot proceed over unsaved item edits without Save/Discard/Cancel choice.

## Mobile drawer

Header menu opens global navigation; a separate labelled project-section control opens project navigation. Opening one closes the other. Drawer traps focus, Escape/back closes, and focus returns to trigger.

## Active states

Use icon + label + selected shape and `aria-current="page"`. Content parent may be expanded while one module child is current. Query filters do not change primary active navigation.

## Shared screen contract

Every routed screen specifies: purpose, goal, route, entry/exit, required data, hierarchy, desktop/tablet/mobile, actions, components, default/empty/loading/partial/success/error, security, accessibility, analytics, acceptance, and out-of-scope behavior. Flow documents additionally specify trigger, prerequisites, main/alternative/failure paths, recovery, completion, persistence, and post-completion navigation.

Related: [Project Shell](07-project-shell.md), [Responsive Behavior](23-responsive-behavior.md), and [Screen Inventory](27-screen-inventory.md).
