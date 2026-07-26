# Repository Structure

```text
app/                    route files, layouts, loading/error boundaries
components/             primitives and cross-feature patterns
features/
  projects/ brief/ brand-profile/ generation/
  website/ social/ ads/ video/ copy/ calendar/ library/ export/
lib/                    small framework-neutral utilities only
server/
  auth/ services/ repositories/ ai/ exports/ observability/
workers/                runners and job handlers
prisma/                 schema, migrations, seed entry
tests/                  integration, E2E, fixtures
public/                 approved static assets
docs/ architecture/ design-tokens/
```

Each feature may contain `components/`, `schemas/`, `types/`, and server entrypoints, but repositories and external adapters remain under `server/`. Route files compose screens and call authorized service commands/queries; they do not contain domain rules.

## Boundaries

- UI components receive serializable view models and never import Prisma or AI providers.
- Server Components query through services; Client Components own only interactivity/forms/local recovery.
- Server Actions handle same-origin UI mutations; Route Handlers serve polling, downloads, Auth.js, and explicit APIs.
- Services enforce authorization and business invariants.
- Repositories encapsulate Prisma/query details and accept authorized owner scope.
- Zod schemas define external and domain boundaries; Prisma types do not leak to client contracts.
- `server/ai/providers`, `server/ai/prompts`, `server/ai/modules`; jobs call module handlers through contracts.
- Worker handlers are thin orchestration functions using the same services/repositories.

Use dependency direction `route/UI → service → repository/adapter`. Keep `lib/` small; utilities with domain meaning belong to their feature.
