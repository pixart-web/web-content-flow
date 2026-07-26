# Web Content Flow

Current status: **Phase 5 real AI provider foundation**. Product modules use durable mock jobs and can use opt-in OpenAI structured text generation through the same provider-neutral boundary. Real mode records usage and provenance and enforces bounded retries, repair, context, concurrency, and quotas. No external publishing, media rendering, browsing, or billing is implemented.

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
| `pnpm tokens:check`                   | Verify canonical token integration             |
| `pnpm prisma:generate`                | Generate the Prisma client                     |
| `pnpm prisma:migrate`                 | Apply committed migrations                     |
| `pnpm prisma:seed`                    | Run the guarded synthetic seed                 |
| `pnpm worker` / `pnpm worker:once`    | Run the durable generation worker              |
| `pnpm check`                          | Non-browser validation suite                   |

## Structure

- `src/app`: public, authentication, and protected application routes
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

## Mock generation

Mock mode is the only current generation mode. It supports Brand Profile, the internal foundation-copy proof, Website pages, Social content, Ads & Creative, Video & Reels planning, and General Copy jobs, performs no network call, and requires no AI, email, publishing, media, or external-platform key. Run `pnpm worker` beside `pnpm dev`.

## Current limitations

There is no real AI integration, website builder/publishing, Social or advertising publishing, ad-account/spend management, rendered image/video generation, Video/General Copy module, Calendar, export, billing, collaboration, or marketing landing page. The Phase 3 `FOUNDATION_COPY` item remains an internal platform proof. Password recovery remains unavailable pending an email provider and abuse controls.

See the [Phase 1 implementation record](docs/technical/30-phase-1-implementation.md).

See the [Phase 2 implementation record](docs/technical/31-phase-2-implementation.md).

See the [Phase 3 implementation record](docs/technical/32-phase-3-implementation.md).

See the [Phase 4.1 Website implementation record](docs/technical/33-phase-4-1-website-implementation.md).

See the [Phase 4.2 Social implementation record](docs/technical/34-phase-4-2-social-implementation.md).

See the [Phase 4.3 Ads & Creative implementation record](docs/technical/35-phase-4-3-ads-creative-implementation.md).

See the [Phase 4.4 Video & Reels implementation record](docs/technical/36-phase-4-4-video-reels-implementation.md).

See the [Phase 4.5 General Copy implementation record](docs/technical/37-phase-4-5-general-copy-implementation.md).

See the [Phase 4.6 Content Calendar implementation record](docs/technical/38-phase-4-6-content-calendar-implementation.md).

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes.
