# Dashboard Flow

## Screen specification

- **Screen name/route:** Dashboard `/app` (Projects `/app/projects` may render the same project collection).
- **Purpose/goal:** Start a first project or continue the most relevant existing project.
- **Entry/exit:** sign-in/onboarding/global nav → wizard or selected project.
- **Required data:** authorized project summaries, brief/profile readiness, active/latest job state, selected modules, last activity, next valid action.
- **Hierarchy:** page header + `Create project`; continuation panel; project collection; optional recent operational activity only when actionable.
- **Desktop:** 2–3 card grid; **tablet:** 2/1; **mobile:** single stack, continuation first.
- **Primary:** `Create project` for empty; `Continue project` for returning. **Secondary:** open project, resume brief, retry failed job.
- **Components:** project card, status badge, module icon list, empty state, skeleton, error alert.
- **Default/success:** project collection sorted by actionable recent activity; completed projects show `Open project`, not celebratory state.
- **Empty:** Brief → Brand Profile → Modules preview and one `Create project`; no analytics/disabled grids.
- **Loading:** stable card skeletons; header/action available when safe.
- **Partial:** render loaded projects and retry failed summary region.
- **Error:** `Projects couldn’t be loaded. Retry.`; do not expose unauthorized data.
- **Security:** account-owned projects only; inaccessible/deleted deep-linked project returns neutral state and dashboard link.
- **Accessibility:** card heading and distinct action; status text not color-only; collection count optional.
- **Analytics:** `dashboard_viewed`, `project_returned_to`, `create_project_selected`, `failed_job_retry_selected`.
- **Acceptance:** handles zero, one, several, draft, running, failed, complete, deleted/inaccessible projects without fake metrics.
- **Out of scope:** portfolio analytics, team activity, folders, bulk actions, advanced search.

## State-specific next actions

| Project state | Card next action |
|---|---|
| Draft brief | `Continue brief` |
| Brief ready/profile absent | `Generate Brand Profile` |
| Job running | `View progress` while navigation remains enabled |
| Generation failed | `Review failure` / scoped retry |
| Partial pack | `Review available content` |
| Complete | `Open project` |
| Profile updated/content stale | `Review changes` |

Wireframes: [Empty](../../wireframes/app/dashboard-empty.md), [Returning](../../wireframes/app/dashboard-returning.md).
