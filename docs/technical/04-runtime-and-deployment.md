# Runtime and Deployment

| Runtime | Responsibilities | Prohibited |
|---|---|---|
| Browser | interaction, RHF forms, polling, local unsaved recovery | secrets, ownership decisions, direct DB/AI |
| Next.js Node | Server Components, actions, handlers, Auth.js, Prisma, commands/queries, normal export | long durable generation execution |
| Edge | optional public/static routing only | Prisma, AI, job processing unless later proven safe |
| Node worker | lease jobs, AI/mock calls, validation, transactional persistence, reconciliation | public UI/session assumptions |

Use separate local/test/preview/production databases. Preview AI defaults to mock unless explicitly enabled. Choose one primary region near database and worker; cross-region writes are out of MVP.

## Environment variables

`DATABASE_URL`, Auth.js secret/base URL and provider-specific values, `AI_MODE`, `OPENAI_API_KEY` when platform-managed, model/budget identifiers, worker lease/concurrency values, analytics/monitoring keys, optional storage endpoint/bucket/credentials. Validate on process start with a server-only schema; never expose without an intentional `NEXT_PUBLIC_` allowlist.

## Timeouts and failure boundaries

HTTP requests must return after persisting a job; do not await provider completion. Worker provider calls have explicit abort timeouts shorter than lease, bounded attempts, and heartbeat/lease renewal. Database, AI, storage, analytics, and email failures are isolated; analytics never blocks product work. Optional storage failure does not corrupt PostgreSQL export/job state.

Health checks cover process, database connectivity, and worker lease freshness without calling paid AI. Serverless request functions are not a durable queue.
