# Operations and Recovery Audit

## Control status

| Document/control | Present | Accurate | Complete | Tested | Owner / reviewed |
|---|---:|---:|---:|---:|---|
| Deployment runbook | Yes | Mostly | No vendor commands | No production run | role only / no date |
| Worker runbook | Yes | Partly; overstates healthy lease semantics | No alerts/process definition | local only | role only / no date |
| Backup/restore | Yes | Conceptually | no provider/credentials/retention evidence | no restore | role only / no date |
| Incident response | Yes | Conceptually | no contacts/channel/notification matrix | no exercise | role only / no date |
| Release/rollback | Yes | Conceptually | no platform artifact/rollback command | no rehearsal | role only / no date |
| Production smoke test | Yes | Useful | not executed in production | No | no named owner/date |
| Security review | Yes | broadly accurate before audit | incomplete findings | repository only | no named owner/date |
| Retention | Yes | truthful | legal periods/deletion unresolved | maintenance local only | no approval |
| Subprocessor inventory | No | — | — | — | — |

## Deployment

The repository has no Dockerfile, hosting manifest, process definition, IaC, scheduler configuration, selected managed PostgreSQL, selected worker host, or deployment health gate. CI demonstrates buildability, not deployability. Production seed is guarded and not called in deployment guidance. `prisma migrate deploy` is correctly used rather than development migrations.

Web and worker compatibility is documented, but no automated release identifier ties health, logs, web, worker, and migrations together.

## Worker operation

The worker runs separately and handles SIGTERM/SIGINT by stopping before the next job, then disconnecting. It emits a process heartbeat every 30 seconds. It does not renew job leases or abort on lease loss (AUD-001). No production supervisor, restart policy, replica count, or alert confirms that a worker is active.

## Health

Observed:

- healthy: `/health/live` 200 and `/health/ready` 200;
- database stopped: live 200, ready 503 with generic safe response;
- no secrets or project data in health output;
- DB operations have two-second bounds.

Failure: readiness returned 200 after insertion of an unfinished migration row (AUD-004). Maintenance mode is not explicitly incorporated into readiness. AI/email checks validate configuration presence, not provider reachability, which is reasonable for a cheap readiness endpoint but needs separate monitoring.

## Monitoring and alerting

No monitoring/error-tracking vendor or alert configuration exists. Process logs are limited to worker heartbeat, worker fatal error, and maintenance result. There are no implemented metrics for queue depth, oldest job, stale leases, provider error rate, email failures, export failures, auth attacks, backup age, or migration mismatch.

An operator cannot currently detect most required outage classes from repository-defined systems:

| Outage | Detectable now? |
|---|---|
| Database outage | readiness only |
| Provider outage | individual job failures; no alert |
| Worker stopped | heartbeat log only; no monitor |
| Jobs stuck | DB state exists; no metric/alert |
| Export failure | user response; no alert |
| Email failure | neutral reset hides it; no alert |
| Quota anomaly | usage data exists; no alert |
| Auth attack | rate buckets exist; no alert |
| Backup failure | no provider/evidence |
| Migration mismatch | readiness insufficient |

## Maintenance

`pnpm maintenance` is bounded and locally passed. It expires export payloads, reset tokens, reservations, and rate buckets. Stale draft deletion is intentionally disabled pending retention approval. There is no selected production scheduler or run-result alert.

## Backup and restore

The runbook specifies managed encrypted backups/PITR and a restore drill, but no provider, frequency, retention, backup identifier, monitoring, restore credentials, or drill output exists. The audit did not access infrastructure. Under the acceptance gates, this alone blocks beta/production readiness.

## Migration and rollback

Positive:

- 11 migrations apply from empty;
- current DB/schema drift check is empty;
- migrations are additive at present;
- runbook prefers forward fix and backup restore;
- production seed is not automatic.

Missing:

- CI drift gate;
- expected migration in readiness;
- large-table/lock estimate in release evidence;
- actual backup before migration;
- tested code rollback after current schema;
- restore rehearsal.

## Incident readiness

Severity definitions and containment options exist, but no named incident lead rotation, contact channels, security reporting mailbox, legal notification process, tabletop exercise, or postmortem evidence exists.

## Conclusion

Operational design is documented but not operationalized. This area is **NOT READY** for any external environment that relies on the stated backup/detection gates. See AUD-003 and AUD-004.

