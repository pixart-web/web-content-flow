# Staging Operationalization

## Decision and status

**Selected architecture, not provisioned.** No Git remote, Render account/API credential, owned domain, managed database, Resend credential, or Better Stack credential was available on 2026-07-27. Consequently, this record does not claim a deployment.

## Selected architecture

| Concern | Selection | Reason | Verification |
|---|---|---|---|
| Web, worker, cron | Render Frankfurt | Native Node web services, independent long-running background workers, cron jobs, health checks and pre-deploy commands | Provider capability verified; project not provisioned |
| PostgreSQL | Paid Render Postgres `basic-256mb` | Managed database; paid instances provide backups/PITR and isolated recovery | Not provisioned |
| Email | Resend | Existing adapter; domain verification uses SPF/DKIM with optional DMARC and delivery events | Not configured |
| Monitoring/logs/uptime | Better Stack | Uptime, logs, error tracking, metrics, heartbeats and alert destinations in one small-team service | Not configured |
| DNS/domain | Cloudflare; `app-staging.webcontentflow.com` | Separate staging hostname and managed DNS/TLS workflow | Domain ownership unverified |
| Secrets | Render service secrets/environment groups | Private runtime injection; no secrets in Blueprint | Not configured |

Render documents background workers as continuously running processes, cron jobs as scheduled single-run services, pre-deploy commands for migrations, and paid PostgreSQL PITR/restores into a new database. References: [workers](https://render.com/docs/background-workers), [cron](https://render.com/docs/cronjobs), [deploys](https://render.com/docs/deploys), [PITR](https://render.com/docs/postgresql-backups), and [Blueprint schema](https://render.com/docs/blueprint-spec).

## Repository deployment contract

`render.yaml` defines:

- web: frozen install, Prisma generation, build, distinct pre-deploy migration, `pnpm start`, `/health/ready`;
- worker: independent process, `pnpm worker`, 90-second shutdown allowance;
- maintenance: hourly `pnpm maintenance`;
- paid staging PostgreSQL in Frankfurt;
- invite-only rollout, registration disabled, real AI disabled;
- public indexing and marketing capture mode disabled;
- secrets as generated or manual values, never committed.

The release identifier is `APP_RELEASE=<git-sha>`. Web, worker and cron must receive the same value. Seed is absent from every deploy command.

## Cost baseline

Expected staging range: **€22–€45/month**, excluding tax and variable bandwidth.

- Render Starter web plus Basic-256mb PostgreSQL: approximately €12–€15/month based on Render's July 2026 published small-business snapshot.
- Starter worker: approximately €6–€9/month.
- Cron: minimum roughly €1/month plus runtime.
- Better Stack, Resend: €0 initially within permanent free allowances; budget €0–€15 for growth.
- Domain: roughly €1–€2/month annualized.
- Controlled AI smoke: less than €2/month, but real AI remains disabled until approved.

Promotional credits are excluded. Exact checkout prices must be captured before provisioning.

## Local technical verification

The final local run passed:

- formatting, lint and strict type-check;
- 70 unit, 8 PostgreSQL integration and 13 worker tests;
- 48 Playwright tests with 18 intentional viewport-gated skips;
- 2 dedicated axe accessibility tests covering desktop and 320 px mobile;
- 12 migrations from an isolated database, no pending migrations and no schema drift;
- deterministic seed and restore-integrity verification with no invalid current pointers;
- production build (2.3-second compilation), source/client secret scans, production dependency audit and licence inventory;
- local staging-mode security headers and `X-Robots-Tag: noindex, nofollow`;
- safe readiness `503` behavior with a deliberately unavailable database.

One intermediate browser run followed an invalid fixture order after destructive test suites. The documented migration → tests → reseed → browser sequence subsequently passed. These are repository and local runtime results, not external staging evidence.

## Blockers

1. Publish the current work to a private Git remote.
2. Provision provider accounts and billing.
3. Confirm domain ownership and controlled inbox/alert destination.
4. Populate separate staging secrets.
5. Deploy and execute the evidence plan in [Staging Environment](../operations/07-staging-environment.md).
