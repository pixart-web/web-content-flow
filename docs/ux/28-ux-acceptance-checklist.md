# UX Acceptance Checklist

## Onboarding and navigation

- [ ] First user sees project → Brand Profile → modules and one Create project action.
- [ ] Global/project/item hierarchy is clear; routes match IA; deep links and browser Back work.
- [ ] Signed-out deep links return after sign-in; dirty navigation warns.
- [ ] Active project, section, job state, and mock mode remain visible.

## Dashboard and wizard

- [ ] Zero/one/several projects, draft, running, partial, failed, and complete cards have valid next actions.
- [ ] No empty analytics/disabled feature grid.
- [ ] Six wizard steps contain required/optional fields, save/exit/resume, validation, and idempotent final submit.
- [ ] Progress is steps/sections, not a fabricated percentage.

## Brief and Brand Profile

- [ ] Brief remains editable and no edit silently regenerates profile/content.
- [ ] Brand Profile contains every required section, current version, provenance, and mock label.
- [ ] New jobs use current profile; older content shows original profile version without forced update.
- [ ] Section/full regeneration retains prior profile version.

## Generation and modules

- [ ] Preparing/queued/running/partial/complete/failed/cancelled/retrying/mock states exist.
- [ ] User navigates during generation; refresh/return restores status.
- [ ] Failures name scope, preserved work, and recovery; partial results remain usable.
- [ ] Website, Social, Ads, Video, Copy, Calendar, and Library meet their schemas and boundaries.
- [ ] No module is a chat conversation; no fake progress or automatic publishing.

## Editing and versions

- [ ] Structured labelled fields replace generic contenteditable.
- [ ] Save failure retains draft; dirty navigation is protected.
- [ ] Item/field regeneration names scope, prevents duplicates, and creates a version.
- [ ] Restore creates a new current snapshot and retains intervening history.
- [ ] Copy actions identify field/item and announce result.

## Calendar, library, export, settings

- [ ] Calendar stores references only; scheduled/published meanings are manual/planning.
- [ ] Library points to canonical items and stays project-scoped/filter-light.
- [ ] Export selects authorized current versions, labels mock content, supports only approved basic formats, and handles no-content/failure.
- [ ] Settings excludes Billing/Team/Integrations; keys are never redisplayed; deletion is conditional and confirmed.

## Mobile and accessibility

- [ ] At 320 px users can auth, create/resume project, generate/review/edit/copy/regenerate, monitor jobs, review calendar, and export.
- [ ] 44 px targets, no hover dependency, no page horizontal scrolling, keyboard-safe sticky actions.
- [ ] Landmarks/headings/order/focus/dialog/tab/form/live-region behaviors meet [Accessibility Behavior](24-accessibility-behavior.md).
- [ ] Status is color-independent; reduced motion retains feedback; text zoom works.

## Errors, privacy, mock, and scope

- [ ] Every major screen has empty, loading, partial where relevant, success, error, offline, unauthorized/not-found, and mock behavior.
- [ ] Analytics never contain brief/content/free-text/secrets/provider payloads.
- [ ] Mock is persistent in shell, items, and export selection.
- [ ] No video/image rendering, website builder/publishing, analytics dashboard, collaboration, approvals, teams, native app, advanced integration, or automatic publishing appears as MVP.
- [ ] No fabricated customer proof, metrics, or completion claims.

Related: [System States](25-empty-loading-error-states.md), [Screen Inventory](27-screen-inventory.md), and [Product MVP Scope](../06-mvp-scope.md).
