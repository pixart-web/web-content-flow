# Screen Inventory

Implementation phase: P0 shell/core, P1 modules/control, P2 supporting polish. Responsive priority H means essential at 320 px.

| ID | Screen | Route | User state | Purpose | Primary action | Resp. | Phase | Dependencies |
|---|---|---|---|---|---|:---:|:---:|---|
| MKT-001 | Landing page | `/` | Public | Explain connected outcome | Create account | H | P2 | Marketing hypothesis |
| AUTH-001 | Sign in | `/sign-in` | Signed out | Start session | Sign in | H | P0 | Auth provider |
| AUTH-002 | Sign up | `/sign-up` | Signed out | Create account | Create account | H | P0 | Auth provider/terms |
| AUTH-003 | Password recovery | `/sign-in` state or provider-hosted | Signed out | Recover access | Send recovery link | H | P0 | Provider capability |
| APP-001 | Empty dashboard/onboarding | `/app` | Auth, 0 projects | Start first project | Create project | H | P0 | Session/project query |
| APP-002 | Returning dashboard | `/app` | Auth, projects | Continue work | Continue project | H | P0 | Project summaries/jobs |
| PRJ-001 | Project wizard | `/app/projects/new` | Auth | Create brief/project | Create project and generate profile | H | P0 | Draft persistence/modules |
| PRJ-002 | Project Overview | `/app/projects/:projectId` | Owner | Orient/next action | Dynamic | H | P0 | Project/profile/jobs/items |
| PRJ-003 | Project Brief | `/app/projects/:projectId/brief` | Owner | Maintain business source | Edit/Save | H | P0 | Brief schema |
| PRJ-004 | Brand Profile | `/app/projects/:projectId/brand-profile` | Owner | Shared context | Generate/Edit | H | P0 | Brief/profile jobs/versions |
| PRJ-005 | Project Settings | `/app/projects/:projectId/settings` | Owner | Project configuration | Save changes | H | P1 | Module registry/deletion decision |
| MOD-WEB-001 | Website module | `/app/projects/:projectId/content/website` | Owner | Website structure/copy | Generate website | H | P1 | Profile/jobs/schema |
| MOD-WEB-002 | Website item | `/app/projects/:projectId/content/website/:itemId` | Owner | Review/edit page/section | Edit | H | P1 | Item editor/versions |
| MOD-SOC-001 | Social module | `/app/projects/:projectId/content/social` | Owner | Social content | Generate social content | H | P1 | Profile/jobs/calendar |
| MOD-SOC-002 | Social item | `/app/projects/:projectId/content/social/:itemId` | Owner | Review/edit post | Edit | H | P1 | Item editor/versions |
| MOD-ADS-001 | Ads module | `/app/projects/:projectId/content/ads` | Owner | Campaign concepts | Create campaign | H | P1 | Profile/jobs |
| MOD-ADS-002 | Ad concept item | `/app/projects/:projectId/content/ads/:itemId` | Owner | Review/edit concept | Edit | H | P1 | Item editor/versions |
| MOD-VID-001 | Video module | `/app/projects/:projectId/content/video` | Owner | Script collection | Generate scripts | H | P1 | Profile/jobs |
| MOD-VID-002 | Video script item | `/app/projects/:projectId/content/video/:itemId` | Owner | Review/edit script | Edit | H | P1 | Item editor/versions |
| MOD-CPY-001 | Copy module | `/app/projects/:projectId/content/copy` | Owner | General copy | Create copy | H | P1 | Profile/jobs/categories |
| MOD-CPY-002 | Copy item | `/app/projects/:projectId/content/copy/:itemId` | Owner | Review/transform copy | Edit | H | P1 | Item editor/versions |
| PRJ-CAL-001 | Calendar | `/app/projects/:projectId/calendar` | Owner | Plan item references | Add content | H | P1 | Items/timezone |
| PRJ-LIB-001 | Library | `/app/projects/:projectId/library` | Owner | Find/reuse outputs | Open item | H | P1 | Items/profile assets |
| SYS-GEN-001 | Generation status center | overlay in project shell | Owner | Monitor/recover jobs | View/retry scope | H | P0 | Durable jobs |
| SYS-VER-001 | Version history | drawer on item/profile | Owner | Preview/restore | Restore version | H | P1 | Snapshots |
| SYS-EXP-001 | Export dialog | overlay on source route | Owner | Export selected content | Export | H | P1 | Export renderer/format decision |
| APP-SET-001 | Account Settings | `/app/settings` | Auth | Account/generation config | Save changes | H | P1 | Provider decisions |
| SYS-404-001 | Unavailable/not found | requested route | Any | Safe recovery | Back to projects/home | H | P0 | Router/authorization |

**Screen count:** 28 inventory entries. Auth recovery may remain provider-hosted; overlays are counted because they require distinct implementation specifications.

Related: [Navigation Model](02-navigation-model.md) and [Wireframe Index](../../wireframes/README.md).
