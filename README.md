# Web Content Flow

Current status: **Phase 6 controlled-launch foundation**. The product includes durable mock and opt-in OpenAI text generation, a public entry point, resumable onboarding, credentials recovery, usage visibility, safe project exports, health checks, rollout controls, and operational runbooks. Public production launch still requires the external gates in the readiness checklist.

The repository now contains a proposed, unprovisioned Render staging contract in `render.yaml`. No staging URL, managed database, backup, alert, email domain, or restore has been operationally verified. See [Staging Operationalization](docs/technical/42-staging-operationalization.md).

## Prerequisites

- Node.js 24.14.0 LTS or newer in the Node 24 line (see `.nvmrc`)
- pnpm 11.9.0
- PostgreSQL 16

The repository uses Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, Zod, Vitest, Testing Library, Playwright, and Lucide React.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

Open `http://localhost:3000`. `.env` is ignored and must never contain committed secrets. Prisma CLI and Next.js both load this local file.

## Environment

The server validates:

- `NODE_ENV`, supplied by the runtime
- `NEXT_PUBLIC_APP_URL`, for example `http://localhost:3000`
- `DATABASE_URL`, a direct PostgreSQL connection
- `AUTH_SECRET`, at least 32 random characters
- `AUTH_URL`, the canonical authentication origin
- opt-in AI provider, model policy, timeout, concurrency, context, quota, and safe-debug variables documented in `.env.example`
- `OPENAI_API_KEY` only when real generation is enabled; mock mode requires no AI key
- rollout, registration, export, support/legal, retention, email-provider, and rate-limit variables documented in `.env.example`

Production rejects mock email delivery and an absent rate-limit signing secret. Vendor-specific production values must be stored in the deployment secret manager.

Generate the secret with `openssl rand -base64 32`. Never use the placeholder outside `.env.example`.

## Local database

Create an isolated PostgreSQL database matching `DATABASE_URL`, then run:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

Optional fictional development data:

```bash
SEED_DEMO_DATA=true pnpm prisma:seed
```

The seed creates:

- Returning account: `demo@webcontentflow.local`
- Empty account: `empty@webcontentflow.local`
- Development password: `UrbanStride-demo-2026!`
- Fictional project: UrbanStride

The seed refuses to run in production. These credentials are synthetic development fixtures, not secrets or production accounts.

## Commands

| Command                               | Purpose                                        |
| ------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                            | Start development server                       |
| `pnpm build` / `pnpm start`           | Build and run production output                |
| `pnpm lint`                           | ESLint with zero warnings                      |
| `pnpm typecheck`                      | Strict TypeScript check                        |
| `pnpm format` / `pnpm format:check`   | Apply/check Prettier                           |
| `pnpm test` / `pnpm test:watch`       | Unit/component tests                           |
| `pnpm test:provider`                  | Provider contracts and normalized errors       |
| `pnpm test:prompts`                   | Prompt registry and context budgets            |
| `pnpm test:usage` / `pnpm test:quota` | Usage pricing and durable reservations         |
| `pnpm test:integration`               | PostgreSQL repository/authorization tests      |
| `pnpm test:worker`                    | PostgreSQL generation-worker tests             |
| `pnpm test:coverage`                  | V8 coverage report                             |
| `pnpm test:e2e`                       | Playwright Chromium desktop/mobile smoke tests |
| `pnpm test:a11y`                      | Axe smoke on desktop and mobile projects       |
| `pnpm tokens:check`                   | Verify canonical token integration             |
| `pnpm prisma:generate`                | Generate the Prisma client                     |
| `pnpm prisma:migrate`                 | Apply committed migrations                     |
| `pnpm prisma:seed`                    | Run the guarded synthetic seed                 |
| `pnpm capture:seed`                   | Prepare isolated Northstar capture data        |
| `pnpm capture:stills`                 | Capture authenticated desktop/mobile stills    |
| `pnpm worker` / `pnpm worker:once`    | Run the durable generation worker              |
| `pnpm maintenance`                    | Run bounded retention and cleanup tasks        |
| `pnpm restore:verify`                 | Read-only restored-database integrity checks   |
| `pnpm licenses:check`                 | Production dependency licence inventory        |
| `pnpm secrets:scan`                   | Current tracked-source secret scan             |
| `pnpm test:email`                     | Password-recovery and email contract tests     |
| `pnpm test:export`                    | Export rendering and safety tests              |
| `pnpm test:security`                  | Rate-limit and health/security tests           |
| `pnpm check`                          | Non-browser validation suite                   |

## Structure

- `src/app`: public, authentication, and protected application routes
- `src/components/marketing`: isolated public-site shell, visuals, navigation, and beta form
- `src/content`: repository-controlled typed marketing content
- `src/components`: future primitives/shared patterns
- `src/domain`: production brief, profile, provenance, and job contracts
- `src/features`: feature-oriented authentication, project, and content UI
- `src/lib`: environment, Result, validation, and safe error foundations
- `src/server`: database, auth, repositories, services, and AI adapters
- `src/workers`: durable generation leasing and handlers
- `prisma`: schema, migration, and guarded synthetic seed
- `tests`: E2E and synthetic fixtures
- `docs`, `wireframes`, `architecture`, `design-tokens`: authoritative foundations and references

Start with the [Product Index](docs/00-product-index.md), [Design Index](docs/design/00-design-index.md), [UX Index](docs/ux/00-ux-index.md), and [Technical Index](docs/technical/00-technical-index.md).

## Generation modes

Mock mode supports every implemented module without an AI key or network call. Real text generation is opt-in through the OpenAI adapter and the same schemas, jobs, provenance, quotas, and immutable versions. Run `pnpm worker` beside `pnpm dev`.

## Current limitations

There is no website builder/publishing, social or advertising publishing, ad-account/spend management, rendered image/video generation, billing checkout, collaboration, teams, uploads, or marketplace. Account deletion remains disabled pending legal and deletion-policy approval. Privacy and Terms are draft surfaces, not legal approval.

See the [Phase 1 implementation record](docs/technical/30-phase-1-implementation.md).

See the [Phase 2 implementation record](docs/technical/31-phase-2-implementation.md).

See the [Phase 3 implementation record](docs/technical/32-phase-3-implementation.md).

See the [Phase 4.1 Website implementation record](docs/technical/33-phase-4-1-website-implementation.md).

See the [Phase 4.2 Social implementation record](docs/technical/34-phase-4-2-social-implementation.md).

See the [Phase 4.3 Ads & Creative implementation record](docs/technical/35-phase-4-3-ads-creative-implementation.md).

See the [Phase 4.4 Video & Reels implementation record](docs/technical/36-phase-4-4-video-reels-implementation.md).

See the [Phase 4.5 General Copy implementation record](docs/technical/37-phase-4-5-general-copy-implementation.md).

See the [Phase 4.6 Content Calendar implementation record](docs/technical/38-phase-4-6-content-calendar-implementation.md).

See the [Phase 5 real AI implementation record](docs/technical/39-phase-5-real-ai-provider-implementation.md).

See the [Phase 6 implementation record](docs/technical/40-phase-6-production-readiness-launch.md) and [Production Readiness Checklist](docs/technical/26-production-readiness-checklist.md).

See the [Phase 21 marketing website implementation record](docs/technical/43-marketing-website-implementation.md), [Brand DNA](docs/brand/01-brand-dna.md), and [Website Experience Blueprint](docs/marketing/01-website-experience-blueprint.md).

See the [Phase 22 product media and launch-readiness record](docs/technical/44-product-media-and-launch-readiness.md). Capture mode is local/test-only and must never use a shared or production database.

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes.
