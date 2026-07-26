# Technical Risks

| Risk | P/I | Mitigation | Detection | Fallback |
|---|---|---|---|---|
| Serverless duration | H/H | enqueue then return; separate worker | request timeout/job age | container/managed worker host |
| Job duplication | M/H | idempotency, leases, unique result transaction | duplicate-key/charge audit | reuse existing result/manual reconcile |
| Durable queue bugs | M/H | simple state machine, lock tests, reconciliation | stuck/expired leases | pause real jobs; mock/manual replay |
| Provider instability | H/M | timeout, bounded retry, mock | error/latency alerts | retry later/mock |
| Invalid structured output | H/H | schemas, constrained output, one repair | validation rate | fail scoped item, preserve prior |
| Cost spike | M/H | caps, concurrency, budgets, kill switch | cost/job/account alert | disable real mode |
| Data leakage | L/H | redaction, least privilege, provider review | secret/log scans, incidents | revoke/rotate/delete/notify plan |
| Authorization error | M/H | owner-scoped services/tests | denial/anomaly tests | disable affected route/fix |
| Version growth | M/M | caps/monitor/retention | DB size per project | archive/delete under policy |
| Long context | H/M | deterministic selection/budget | preflight/token usage | require concise input/reduce output |
| Migration failure | M/H | expand/contract, backups, rehearsal | deploy checks/counts | rollback compatible code/restore |
| Vendor lock-in | M/M | adapters, portable Postgres/tokens | ADR review | migrate adapter; data export |
| Local/prod mismatch | M/M | same DB/schema/worker contract | preview smoke | containerized reproducible runtime |
| Solo scope | H/H | phases/shared primitives/managed services | milestone variance/support load | cut Could/Should, mock-first |

P/I = probability/impact using Low/Medium/High. Review high-impact risks at each phase exit.
