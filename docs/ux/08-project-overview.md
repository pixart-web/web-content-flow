# Project Overview

## Screen specification

- **Screen/route:** Project Overview `/app/projects/:projectId`.
- **Purpose/goal:** Understand readiness, generation status, available content, and next valid action without analytics.
- **Entry/exit:** project card/shell → brief, Brand Profile, module, item, export.
- **Required data:** project/brief/profile readiness, selected modules, module jobs/item counts, recent items, export eligibility, current profile version.
- **Hierarchy:** 1 next-action panel; 2 brief/profile readiness; 3 selected-module status; 4 module cards; 5 recent content; 6 export readiness.
- **Desktop:** two-column status/readiness then 2–3 module columns; **tablet/mobile:** single ordered stack.
- **Primary:** dynamic next valid action. **Secondary:** open module/item, retry failed scope, export when eligible.
- **Components:** next-action panel, readiness rows, generation indicators, module cards, content-item rows, export panel.
- **Default/empty:** setup checklist when brief/profile absent; unselected modules appear only in Add module region.
- **Loading:** shell first; section skeletons independently.
- **Partial:** completed/failed modules coexist; available content opens normally.
- **Success:** modules show count, last generation, and next action; no celebratory metrics.
- **Error:** scoped region retry; failed job explains preserved results.
- **Security/accessibility/analytics:** owner-only; headings/status text; `project_overview_viewed`, `module_card_selected`, `next_action_selected`.
- **Acceptance:** every module supports not selected, setup required, queued, generating, partial, complete, failed, mock, and outdated states.
- **Out of scope:** performance charts, publishing status from external systems, team activity.

## Module state actions

| State | Next valid action |
|---|---|
| Not selected | `Add module` |
| Setup required | `Complete Brand Profile` or module inputs |
| Queued/generating | `View progress` / `Open module` |
| Partial | `Review available content` and `Retry failed items` |
| Complete/mock | `Open content` |
| Failed | `Review failure` / `Retry module` |
| Outdated after profile change | `Use current profile for future generation`; optional explicit regenerate, never automatic |

Wireframe: [Project overview](../../wireframes/app/project-overview.md).
