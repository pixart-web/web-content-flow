# Technology Decisions

All rows are Proposed until an ADR is accepted.

| Area | Recommendation / rationale | Alternatives | Drawbacks / migration | Approval |
|---|---|---|---|---|
| Web | Next.js App Router, React; one full-stack deployable | Remix, separate API/SPA | Framework coupling; migration rewrites routes/rendering | Phase 0 |
| Language | TypeScript strict, no implicit any | JavaScript | Third-party boundary typing effort; low migration risk | Phase 0 |
| Database | Managed PostgreSQL | MySQL, document DB | Vendor/connection limits; SQL migration is material | Before Phase 1 |
| ORM | Prisma + explicit SQL where needed | Drizzle, Kysely | Generated client/bundle and queue-lock escape hatch | Phase 0 |
| Auth | Auth.js adapter, server sessions | Clerk, Supabase Auth, custom | Credential recovery complexity; provider swap touches accounts | Before Phase 1 |
| Validation | Zod at forms, services, AI, export | Valibot, JSON Schema | Duplicate DB constraints; localized migration | Phase 0 |
| Forms | React Hook Form + Zod resolver | native/server-only, Formik | Client dependency; can migrate feature-by-feature | Phase 2 |
| Styling | Tailwind consuming semantic CSS tokens | CSS Modules | class coupling; tokens keep migration manageable | Phase 0 |
| Primitives | Radix primitives; shadcn-style source components selectively | React Aria, custom | copied-component maintenance; accessibility tests required | Phase 1 |
| Icons | Lucide | custom set | dependency/style normalization | Phase 1 |
| AI | OpenAI adapter + required deterministic mock adapter | other provider later | provider terms/cost; interface limits migration surface | Before Phase 5 |
| Jobs | PostgreSQL job records + Node worker/lease | managed queue/workflow | polling/locking complexity; migrate adapter/dispatcher later | Before Phase 2 |
| Storage | Delay; S3-compatible only when file persistence needed | DB blobs, provider storage | another vendor; migration through storage interface | Before uploads/large exports |
| Unit/integration | Vitest | Jest | ecosystem differences; tests portable | Phase 0 |
| E2E | Playwright | Cypress | browser runtime cost | Phase 1 |
| Deployment | Vercel-compatible app; separately capable worker | container platform | two runtime concerns; keep deployment abstraction | Before preview |
| Analytics | privacy-conscious vendor or self-hosted, allowlisted events | logs only | incomplete product evidence vs vendor | Before closed cohort |
| Monitoring | structured logs + error/APM vendor TBD | platform logs | cost/vendor lock; portable event schema | Before external test |

Node.js runtime is mandatory for Prisma/database/AI operations unless a future adapter is proven Edge-safe. Periodic polling precedes SSE; no WebSocket requirement.
