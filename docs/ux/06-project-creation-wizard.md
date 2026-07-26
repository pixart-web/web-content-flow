# Project Creation Wizard

## Screen specification

- **Screen/route:** Create project `/app/projects/new`; draft resume may use same route with draft ID or project Brief route after first durable save.
- **Purpose/goal:** Capture minimum shared context and selected modules, then create a project and generate its Brand Profile.
- **Entry/exit:** dashboard → project route after creation; `Save and exit` → dashboard with Draft card.
- **Required data:** user/session, draft fields, generation mode, module catalogue.
- **Hierarchy:** step label/list → title/help → fields → validation summary → Back / Save and exit / Continue; Review ends with primary action.
- **Desktop:** 640–760 px form plus optional noninteractive step rail; **tablet/mobile:** one column, compact step label, sticky actions only if unobtrusive.
- **Components:** inputs, textareas, selects, check/radio cards, URL/color fields, summary groups, save indicator.
- **States:** blank/default; autosaving; saved draft; section-complete; creation/generation running; project-created/profile pending; failed save/create/generation.
- **Security/accessibility/analytics:** authenticated; project owner only; labels/fieldset/legends; focus first error; `project_creation_started`, `wizard_step_completed`, `project_created`.
- **Acceptance:** exit/resume works, no duplicate project on repeated submit, required fields are explicit, mobile supports all steps.
- **Out of scope:** industry-specific branching, logo upload/editor, collaboration, provider/model selection.

## Steps and fields

| Step | Required | Optional |
|---|---|---|
| 1 Project | project name, brand name, project type, business description, product/service | current website |
| 2 Audience and problem | target audience, customer problem, value proposition | age range, location, interests |
| 3 Objective and action | primary objective, desired customer action, primary offer | campaign/launch context |
| 4 Brand direction | tone of voice | visual style, preferred/avoided colors, keywords, competitors, reference websites |
| 5 Language and modules | output language; Brand Profile locked selected; at least one content module recommended but not required to create profile | Website, Social, Ads & Creative, Video & Reels, General Copy; Calendar appears as planning support, not a generation module |
| 6 Review | all required sections valid | edit links to prior steps |

## Workflow

- **Trigger/prerequisites:** authenticated user selects Create project.
- **Main path:** complete each step → Review → `Create project and generate Brand Profile` → durable project created → profile job starts → project workspace shows status.
- **Alternative paths:** Back without data loss; save/exit; resume draft; add modules later.
- **Validation:** on blur for format, on Continue for step requirements, full validation on final submit. Errors do not clear inputs.
- **Autosave:** after first minimum identity save, debounce field changes; show Saving/Saved/Failed. Local draft may bridge network interruption but is not authoritative until saved.
- **Progress:** `Step 2 of 6` and completed-step markers; no percentage.
- **Failure paths:** offline save, duplicate submission, invalid URL/color, project creation succeeds but job start fails.
- **Recovery:** retry save/create idempotently; if project exists but profile job fails, navigate to project with `Brand Profile wasn’t generated` and retry.
- **Completion/persistence:** project and brief durable; initial profile job durable; draft label cleared after successful creation.
- **Navigation after completion:** project Overview with job status; when profile completes, prompt review rather than auto-generating every module.

Wireframe: [Project wizard](../../wireframes/app/project-wizard.md).
