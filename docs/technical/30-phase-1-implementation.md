# Phase 1 Implementation Record

## Status

Phase 1 implements authentication, PostgreSQL persistence, server-enforced project ownership, and the authenticated application shell. It does not implement project creation, the guided brief, Brand Profile, AI, generation jobs, or content modules.

## Accepted decisions

- PostgreSQL 16 is the local and CI database contract. The deployed managed PostgreSQL vendor remains unselected.
- Prisma 7.9 with the `pg` adapter provides access and committed migrations.
- Auth.js v5 uses the Prisma adapter and revocable database sessions.
- Email/password registration and sign-in use server actions and Argon2id. Password recovery is deferred until a secure email provider and abuse controls are approved.
- Synthetic seed data is explicit, environment-guarded, and prohibited in production.

See [Architecture Decision Records](27-architecture-decision-records.md).

## Database and migration

`User`, `Account`, `Session`, `VerificationToken`, and `Project` are implemented. Projects have opaque IDs, exactly one owner, a minimal status, output language, timestamps, and indexes for ownership and dashboard activity. User deletion cascades to sessions, accounts, and projects.

The initial migration is `20260723000000_phase_1_auth_shell`. Local schema development uses `prisma migrate dev`; CI and deployment use `prisma migrate deploy`.

## Authentication strategy

Registration and sign-in validate untrusted form input with Zod. Passwords are hashed with Argon2id using explicit memory/time parameters. A successful flow creates a random 256-bit session token stored in the `Session` table and an HttpOnly, SameSite=Lax cookie. Production cookies are Secure. Auth.js `auth()` validates protected-route sessions through the Prisma adapter.

Return URLs are restricted to internal `/app` paths. Invalid credentials use a neutral message. Raw password, session token, Auth.js internals, Prisma errors, and SQL are not rendered or logged.

Password recovery is truthfully unavailable. An external launch requires a selected email-delivery provider, recovery token design, and distributed authentication rate limiting.

## Authorization boundaries

- `requireUser()` validates the server session and redirects signed-out users to sign-in with a safe internal return path.
- `requireProjectOwner(projectId)` obtains the session user and performs one owner-scoped repository query.
- `ProjectRepository.findOwnedById(userId, projectId)` includes both IDs in the database predicate.
- Missing and unauthorized project IDs resolve to the same neutral unavailable state.
- Route components never accept or trust a client-supplied owner ID.

## Implemented routes

- `/` temporary foundation page with truthful account links
- `/sign-in`
- `/sign-up`
- `/api/auth/[...nextauth]`
- `/app`
- `/app/projects`
- `/app/projects/:projectId`
- `/app/settings`

## Shell and components

The application shell uses a 240 px desktop sidebar and 64 px header. Mobile uses a 56 px header and labelled drawer with focus placement, Escape handling, focus return, and 44 px controls. Navigation is limited to Dashboard, Projects, and Settings.

Implemented shared pieces are the shell/navigation, project card, minimal button, structured auth form, loading state, empty states, safe error boundary, and neutral unavailable state. No speculative module navigation or fake analytics is present.

## Environment

Required server variables are `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`. `NEXT_PUBLIC_APP_URL` remains the only public variable. `.env.example` contains placeholders only.

## Seed

`SEED_DEMO_DATA=true pnpm prisma:seed` creates fictional `demo@webcontentflow.local`, `empty@webcontentflow.local`, and UrbanStride records. The development password is documented in the root README. The seed refuses to run in production.

## Tests and CI

- Vitest retains Phase 0 unit coverage.
- PostgreSQL integration tests execute real owner-scoped queries and verify owned-only listing plus neutral unauthorized/missing results.
- Playwright covers root, registration, sign-in, protected redirect, empty and returning dashboards, owned project access, IDOR denial, sign-out, missing-session recovery, and mobile navigation.
- CI creates isolated PostgreSQL 16 services independently for validation and E2E, generates Prisma Client, deploys migrations, and seeds only the E2E database.

## Security notes

- Generated/user HTML is not rendered.
- Server environment and database modules are guarded from client imports.
- Auth cookies are HttpOnly and never exposed to JavaScript.
- Account deletion is omitted because safe reauthentication and retention behavior are unresolved.
- Distributed login/registration throttling is required before public deployment; platform/vendor selection remains open.

## Deviations and unresolved decisions

- Authentication uses application-owned credential server actions with Auth.js database-session validation instead of an external OAuth/email provider. This avoids a CI-only authentication bypass and preserves deterministic testing.
- Managed PostgreSQL, email delivery, deployed rate limiting, and password recovery remain unresolved.
- Full focus trapping may be delegated to a narrowly installed accessible dialog primitive if the shell drawer grows in complexity.

## Acceptance results

- Frozen `pnpm install`: passed.
- `pnpm prisma:generate`: passed with Prisma 7.9.0.
- `pnpm prisma:migrate`: applied the committed initial migration to an isolated PostgreSQL 16 database.
- Guarded synthetic seed: passed; production refusal remains enforced.
- `pnpm format:check`, `pnpm lint`, and strict `pnpm typecheck`: passed.
- `pnpm test`: 4 files and 6 tests passed, including all Phase 0 coverage.
- `pnpm test:integration`: 1 PostgreSQL-backed file and 4 ownership tests passed.
- `pnpm build`: passed with all public/authenticated routes compiled; protected routes are dynamically rendered.
- Playwright: 15 passed and 1 intentionally skipped desktop-only duplicate across desktop and 320 px-class mobile Chromium projects.
- `pnpm check`: passed.
- `pnpm audit --prod`: no known vulnerabilities after upgrading Next.js to 16.2.11 and reviewing locked transitive overrides for Sharp 0.35.0 and PostCSS 8.5.10.

Validation confirmed protected `/app` routing, database-session operation, owned-only project queries, neutral unauthorized/missing project behavior, safe session-loss recovery, mobile navigation, and absence of Phase 2 generation functionality.

Related: [Authentication Architecture](07-authentication-and-authorization.md), [Security](18-security-and-privacy.md), and [Phase Plan](25-implementation-phases.md).
