# Worker Operations

Run `pnpm worker` as an independent long-lived process with the same database and AI configuration as the web release. Start with one instance.

Healthy operation means regular heartbeat output, bounded leases, queued jobs progressing, and no growing stale-job count. `SIGTERM` stops new work and lets the active operation reach its bounded completion. The platform must give a sufficient termination grace period.

If jobs stop:

1. Check readiness and database access without logging payloads.
2. Check heartbeat age, lease age, provider category, and quota.
3. Restart one worker; expired leases are reclaimed.
4. Use `pnpm worker:once` for a controlled diagnostic.
5. Disable real generation if provider cost or safety is uncertain.

Do not edit job rows manually during an incident. Record job IDs and safe error codes only.
