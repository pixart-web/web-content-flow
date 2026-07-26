# Project Shell

## Screen specification

- **Screen name/routes:** Authenticated shell across `/app/*`; project shell across `/app/projects/:projectId/*`.
- **Purpose/goal:** Maintain global/project orientation and expose durable job status while content routes load independently.
- **Entry/exit:** any authenticated route; global nav, project switching, sign out.
- **Required data:** session, authorized project identity, selected modules, active jobs, mode.
- **Hierarchy:** 240 px global sidebar → 64 px top header → project header → project navigation → routed main content.
- **Desktop:** persistent sidebar; **tablet:** compact rail/drawer; **mobile:** 56 px header, global drawer, separate project-section selector.
- **Primary actions:** route-specific; shell provides Create project and job status access. **Secondary:** project switch, account/settings, sign out.
- **Components:** sidebar nav, header, project header, project nav, breadcrumb on item detail, job center popover/drawer, mock badge, account menu.
- **States:** default; shell loading; project metadata partial; jobs running; mock; authorization failure; deleted/not found; session expired.
- **Security:** server-authorize every project load; do not reveal project identity on denial; safe sign-out cache clearing.
- **Accessibility:** landmarks, skip link, `aria-current`, drawer focus management, page title update.
- **Analytics:** `project_shell_viewed`, `project_switched`, `generation_status_opened`, `sign_out_completed`.
- **Acceptance:** active project/section and mock/job state remain visible; main route can load/fail without collapsing shell.
- **Out of scope:** team switcher, notification inbox, global analytics/search, integrations.

## Project navigation

Overview, Brief, Brand Profile, selected Website/Social/Ads & Creative/Video & Reels/General Copy modules, Calendar, Library, Project settings. Unselected modules live under `Add module`/Available modules and do not crowd the active list.

## Operational behavior

- Running jobs remain accessible; status center groups by project/module and shows scope/state/action.
- Toasts announce completion/failure but are not the record.
- Mock badge is persistent in shell and generated items.
- Project switching with dirty content invokes Save/Discard/Cancel; running jobs do not block switching.
- Deleted/not-found state offers `Back to projects`; authorization denial uses the same neutral language.

Related: [Navigation Model](02-navigation-model.md), [Generation System](11-generation-system.md), and [Application Shell Design](../design/16-application-shell-direction.md).
