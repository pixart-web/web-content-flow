# Worker Operations

## Evidence

Record the named operator role, verification date, deployment status/blocker, supervisor/process identifier, stale-heartbeat alert destination, queue-depth/oldest-job thresholds, and rollback action. Database `WorkerHeartbeat` rows must be monitored externally; do not expose worker identifiers publicly.

Run `pnpm worker` as an independent long-lived process with the same database and AI configuration as the web release. Start with one instance.

Healthy operation means regular heartbeat output, bounded leases, queued jobs progressing, and no growing stale-job count. `SIGTERM` stops new work and lets the active operation reach its bounded completion. The platform must give a sufficient termination grace period.

If jobs stop:

1. Check readiness and database access without logging payloads.
2. Check heartbeat age, lease age, provider category, and quota.
3. Restart one worker; expired leases are reclaimed.
4. Use `pnpm worker:once` for a controlled diagnostic.
5. Disable real generation if provider cost or safety is uncertain.

Do not edit job rows manually during an incident. Record job IDs and safe error codes only.
