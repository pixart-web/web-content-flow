# Implementation Phases

| Phase | Objective / dependencies | Tasks and deliverables | Tests / exit criteria | Non-goals |
|---|---|---|---|---|
| 0 Foundation | Approved ADR baseline | initialize Next/strict TS/tooling; env validation; tokens/Tailwind; Vitest/Playwright; CI; DB dev plan | build/type/lint/test; token smoke; no feature UI | production modules |
| 1 Auth + shell | Phase 0; auth/DB vendor | Prisma/Auth.js; authorization contracts; layouts/routes; empty/return dashboard shell | auth + IDOR E2E; accessible shell; sessions | teams/billing |
| 2 Project + Brand Profile | worker decision | Project/Brief/wizard; profile schemas; durable jobs/worker; mock provider | draft/resume; mock job crash/retry; immutable profile | real AI/modules breadth |
| 3 Shared content platform | Phase 2 | ContentItem/versions/editor; restore/regenerate pattern; library primitives; polling/status | edit/version/restore/dirty state/ownership | all module polish |
| 4 Modules | shared schemas/patterns | Website, Social, Ads, Video, Copy, Calendar reference model | schema/partial/error/E2E per module | publishing/rendering |
| 5 Export + real AI | provider/export decisions | renderers; OpenAI adapter; limits/cost; observability; privacy/security review | adapter contract, cost ceilings, export auth, failure recovery | multi-provider routing/PDF |
| 6 Marketing + launch | core acceptance | landing; policies; accessibility/performance/E2E hardening; runbooks | full acceptance, backup/migration/health drills | advanced platform |

Each phase produces updated documentation/ADRs and a deployable vertical slice. Do not begin the next phase with unresolved authorization/data-loss defects.
