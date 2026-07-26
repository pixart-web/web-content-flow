# Phase 0 Implementation Record

## Status

Implemented repository foundation only. No product feature, authentication, database, Prisma, AI provider, job worker, or product screen is included.

## Completed work

- Next.js App Router root with `src/`, strict TypeScript, Tailwind 4, ESLint, Prettier, Vitest, Testing Library, Playwright, and CI.
- Temporary accessible foundation page plus safe root error/not-found boundaries.
- Canonical design-token CSS import, semantic Tailwind mapping, and token verification script/test.
- Zod client/server environment schemas requiring only foundational values.
- Small reusable `Result<T,E>` and safe-error type.
- Feature/server/worker/component directory boundaries documented with useful READMEs.
- Desktop and 320 px-class Chromium smoke coverage.

## Runtime and dependencies

Node 24.14.0 LTS and pnpm 11.9.0 are pinned. Direct runtime dependencies: Next.js, React/React DOM, Zod, Lucide React, and `server-only`. Development dependencies provide Tailwind/PostCSS, TypeScript/types, ESLint/Next rules, Prettier, Vitest/jsdom/coverage, Testing Library, and Playwright.

Prisma, Auth.js, OpenAI, Radix, database drivers, analytics, and storage packages are intentionally absent.

## Folder structure

Implemented `src/app`, `src/components/{ui,shared}`, `src/features`, `src/lib/{env,errors,result,validation}`, `src/server`, `src/workers`, `src/styles`, `src/test`, `tests/{e2e,fixtures}`, `public`, `scripts`, and `.github/workflows`.

## Token integration

`src/app/globals.css` imports `design-tokens/tokens.css` directly, then maps a small semantic set through Tailwind 4 `@theme inline`. React uses semantic classes only. `scripts/verify-design-tokens.mjs` checks key JSON values against CSS and the semantic mapping. Canonical token values were not changed. Future dark variables remain present; no toggle exists.

## Environment approach

`src/lib/env/server.ts` is guarded by `server-only`; client and server parsers accept `unknown` and use Zod. Phase 0 does not require database, Auth.js, AI, worker, or storage secrets. `.env.example` contains only a local public URL placeholder.

## Testing and CI

Vitest covers the page, Result behavior, valid/invalid environment parsing, and token mapping. Playwright runs Chromium desktop and mobile smoke tests against a managed local dev server. GitHub Actions uses separate validation and E2E jobs with Node/pnpm pins, frozen install, and no secrets.

## Deviations and decisions

- Repository uses `src/` as required, refining the earlier conceptual root layout.
- Tailwind 4 uses CSS-first `@theme inline`; no `tailwind.config` is needed.
- Architecture reference TypeScript remains excluded from the production `tsconfig`; it is not a production import surface.
- Node 24.14 LTS matches the validated workspace runtime and is supported by Next.js 16.
- TypeScript 6.0.3 and ESLint 9.39.5 are pinned because the available TypeScript-ESLint and React lint plugins do not yet support TypeScript 7 or ESLint 10.
- Server environment parsing is lazy so tooling/build can load modules without unrelated future secrets; consumers must call `getServerEnv()` at server boundaries introduced later.

## Unresolved items

Production builds require network access to fetch Inter and Poppins through `next/font/google`. A later deployment may choose approved self-hosted assets if fully offline builds become a requirement; no font files are committed. Phase 1 still requires database/Auth.js vendor decisions.

## Acceptance results

- `pnpm install --frozen-lockfile`: passed after explicitly allowing the required `sharp` and `unrs-resolver` install scripts.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`: passed.
- `pnpm test`: passed, 4 files and 6 tests.
- `pnpm tokens:check`: passed.
- `pnpm build`: passed; `/` and `/_not-found` are statically generated.
- `pnpm test:e2e`: passed in desktop Chromium and a 320 px-class mobile Chromium project (2 tests).
- `pnpm check`: passed.
- `pnpm audit --prod`: reported one moderate transitive PostCSS advisory (`GHSA-qx2v-qp2m-jg93`) through Next.js; no direct dependency advisory was reported. The available patched PostCSS version should be adopted through an upstream Next.js update or a separately reviewed override rather than an automatic transitive override.

Related: [Implementation Phases](25-implementation-phases.md), [Acceptance Checklist](28-technical-acceptance-checklist.md), and [Design Tokens](../design/17-design-tokens.md).

Phase 1 work is recorded separately in [Phase 1 Implementation](30-phase-1-implementation.md); this Phase 0 record remains historical.
