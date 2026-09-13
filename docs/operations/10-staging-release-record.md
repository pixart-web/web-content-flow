# Staging Release Record

**Status:** NOT DEPLOYED

| Field | Value |
|---|---|
| Commit / release ID | pending committed remediation state |
| CI result | local validation passed; hosted CI unverified |
| Migration | `20260801120000_pre_beta_job_leases` |
| Immutable artifact | NOT BUILT BY HOST |
| Deployment URL | NOT AVAILABLE |
| Web / worker / cron result | NOT DEPLOYED |
| Readiness / smoke / alerts | NOT EXECUTED |
| Rollback point | `3b3778b0e75df1f643e5e09aedebd015cc2a10e7` is audit baseline, not necessarily schema-compatible rollback |
| Owner / date / blocker | Project owner / 2026-07-27 / remote and provider access |

Release order: select commit → hosted CI → immutable build → migration → web → worker → cron → readiness → smoke → observe → mark release.

