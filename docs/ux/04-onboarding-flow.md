# Onboarding Flow

## Screen specification

- **Screen name:** First-use orientation (inline dashboard panel recommended).
- **Purpose/goal:** Explain project → Brand Profile → selected modules, then start the first project without a tour.
- **Route:** `/app`.
- **Entry/exit:** first successful registration → Create project `/app/projects/new`; skip/return stays on empty dashboard.
- **Required data:** first-use flag/project count, generation mode availability.
- **Hierarchy:** welcome title → 3-step source-to-system preview → mock-mode notice if active → `Create project`.
- **Desktop/mobile:** centered feature panel; preview becomes vertical on mobile.
- **Actions/components:** Create project; optional `Learn how it works`; three labelled blocks; mock badge.
- **States:** default/zero-project; loading account state; partial if mode config unavailable; success after project creation; error loads ordinary empty dashboard with retry.
- **Security/accessibility/analytics:** authenticated only; semantic ordered list; `onboarding_viewed`, `onboarding_create_project_selected`.
- **Acceptance:** orientation adds no mandatory step and explains Brand Profile in under three short sentences.
- **Out of scope:** carousel tour, checklists that block use, persona survey, team invite.

## Workflow

- **Trigger:** account created with zero projects.
- **Prerequisites:** valid session.
- **Main path:** orientation → Create project → wizard → complete brief → generate Brand Profile → project Overview/Brand Profile review.
- **Alternative:** leave and return; orientation remains lightweight until project exists. Mock mode notice explains sample output and same workflow.
- **Failure/recovery:** account/project-state load failure offers retry; project action remains available if safe.
- **Completion/persistence:** onboarding considered complete after first project is created, not merely panel dismissal.
- **Navigation after completion:** project route; failed generation stays in project with retry.

Related: [Dashboard](05-dashboard-flow.md) and [Project Wizard](06-project-creation-wizard.md).
