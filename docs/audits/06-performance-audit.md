# Performance Audit

## Measurements

| Metric | Audit observation |
|---|---:|
| Production compile | ~2.0s compilation; ~7.4s command total |
| Static assets | ~1.59 MB raw |
| JavaScript chunks | ~1.28 MB raw |
| Largest client chunk | ~283 KB raw |
| Root HTML | ~32 KB |
| Full Playwright run | 19.5s, 46 passes |
| Local liveness | ~2.5 ms |
| Local readiness with DB | ~3.1 ms |
| Readiness with DB down | ~3.1 ms, HTTP 503 |

These are local, uncompressed, single-machine measurements and are not production SLO evidence.

## Page and query review

- Public landing is statically generated and cached.
- App pages are server-rendered and protected; app responses use private no-store.
- Project and Library repository queries are capped at 50/100.
- Usage listing is capped at 100.
- Export service caps 50 items and a default 2 MB payload.
- Job polling occurs only while active and stops at terminal state in client components.
- No cross-user authorized content cache was found.
- OpenAI is imported only in server code; server env names were absent from static client chunks.

## Bottlenecks and risks

1. **Authenticated profiling absent:** no query-count/latency evidence for dashboard, Overview, Library, large editor snapshots, or Calendar.
2. **Raw client footprint:** 1.28 MB of raw JavaScript deserves route-level compressed/hydration analysis, but no single feature regression was isolated.
3. **Snapshot transport:** Library includes current snapshot although most cards may need only extracted metadata; up to 50 large snapshots can increase server serialization.
4. **Polling:** periodic job polling is appropriate for MVP, but no measurement exists for concurrent active users/database load.
5. **Export:** synchronous rendering/database blob storage is bounded and measured only on a small synthetic item, not 50 maximum items/2 MB.
6. **Worker:** no provider-latency throughput, queue-age, or concurrency saturation benchmark.
7. **Fonts:** production build requires external Google Font retrieval; deploy environments need reliable build egress or a reviewed fallback strategy.

## Provider overhead

Every real request serializes context to estimate input size, then serializes it again into the provider user message. No live latency or token-estimate accuracy was measured. A provider timeout at the same duration as the job lease creates a reliability risk rather than a pure performance issue (AUD-001).

## Recommendations

- Add production-like route/query instrumentation without content payloads.
- Measure compressed route bundles and hydration per screen; set budgets after baseline.
- Project only Library card metadata unless snapshot is required.
- Load test active polling and queue leasing with synthetic data.
- Benchmark maximum export size and timeout/memory behavior.
- Measure worker throughput with fake latency and multiple workers after lease fencing.
- Capture Web Vitals/Lighthouse for public pages and core authenticated paths.

## Conclusion

No measured performance blocker was confirmed for a small private test cohort. Performance remains **unverified at production scale** and cannot support public launch sign-off.

