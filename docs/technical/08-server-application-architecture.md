# Server Application Architecture

## Layers

1. Route/UI: layouts, Server Components, actions, handlers; parse transport and render.
2. Application services: authorized commands/queries, transactions, invariants, idempotency.
3. Domain/schema: Zod contracts, enums, state transitions, normalization.
4. Repositories: Prisma and reviewed SQL; no UI semantics.
5. External adapters: Auth, AI, analytics, storage, email.
6. Worker handlers: lease job, invoke service/module handler, persist result.

## Responsibility rules

- Server Components perform authorized reads through query services and pass serializable view models.
- Client Components never import server modules.
- Server Actions suit form mutations/navigation-bound commands and return typed Result.
- Route Handlers serve Auth.js, job polling, export download, health, and future public APIs.
- Services own `createProject`, `saveBrief`, `enqueueGeneration`, `saveContentVersion`, `restoreVersion`, `createExport`.
- Repositories expose owner-scoped methods and transaction-aware variants; arbitrary Prisma imports are lint/review prohibited outside server repositories/migrations.
- AI calls exist only in worker/service adapters, never React or route composition.
- Authorization occurs at service entry, not duplicated ad hoc in route files.

Use dependency injection/factories for provider, clock, ID generator, and repositories in tests. Avoid a generic service locator and generic CRUD repository that erases domain invariants.
