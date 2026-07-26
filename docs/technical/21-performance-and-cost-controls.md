# Performance and Cost Controls

- Paginate project/content/library queries (20–50 default, capped 100); select view-model fields, not full snapshots for cards.
- Use documented ownership/status/date indexes; inspect slow-query plans before caching.
- Cap request body (recommend 256 KB ordinary JSON), reference URLs/counts, text field/schema limits, export 500 items/10 MB initial rendered limit.
- Cap module output per schema: pages 10, social 30, concepts/scripts 10, copy 20; smaller defaults in UI.
- Worker global/provider/project concurrency is configurable; recommend 2–4 global and one expensive job per project initially.
- Explicit provider timeout, model input/output token budgets by module, context preflight, and max 2 total transient attempts.
- Track estimated/provider-reported tokens/cost by job and account; stop new real jobs at operational ceiling with safe error. Mock mode remains available.
- Poll active jobs 2–5 seconds with backoff/background pause; endpoint returns compact changed state/ETag where useful.
- Rate-limit auth, create, generate, regenerate, export; protect against duplicate idempotency keys.

Avoid premature Redis/CDN/data caching. Cache only public marketing/static schema data or safe stable derived data. Never share cached authorized project content across users. Server Component/request memoization must retain user/project scope.

Phase 5 enforces token ceilings before provider execution and uses serialized, job-idempotent reservations across project daily/monthly and account daily quotas. Reservations expire and reconcile to provider-reported usage. Pricing is effective-dated and expressed in integer minor units; an unknown price remains unknown. Repair is limited to one attempt and consumes separately recorded usage.
