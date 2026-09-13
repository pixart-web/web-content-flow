# Staging Deployment Checklist

All evidence fields remain incomplete until an operator with provider access executes them.

## Repository and providers

- [ ] Create private Git remote and push approved commit.
- [ ] Confirm CI on the exact commit.
- [ ] Create Render account and Frankfurt PostgreSQL.
- [ ] Connect repository and validate `render.yaml`.
- [ ] Create web, worker and hourly maintenance services.
- [ ] Confirm paid database backup/PITR capability.

## Environment

- [ ] Use a staging-only database.
- [ ] Generate unique `AUTH_SECRET` and `RATE_LIMIT_SECRET`.
- [ ] Set `APP_ENV=staging`, `ROLLOUT_STATE=INVITE_ONLY`.
- [ ] Set `PUBLIC_REGISTRATION_ENABLED=false`.
- [ ] Set `MARKETING_INDEXING_ENABLED=false`.
- [ ] Set `MARKETING_CAPTURE_MODE=false`.
- [ ] Set `AI_PROVIDER_DEFAULT=MOCK`, `AI_REAL_GENERATION_ENABLED=false`.
- [ ] Use staging-only Resend and Better Stack configuration.
- [ ] Set the same immutable `APP_RELEASE` on web, worker and cron.

## Deploy and verify

- [ ] Run pre-deploy migrations; never seed automatically.
- [ ] Verify `/health/live` and `/health/ready`.
- [ ] Confirm worker heartbeat and maintenance execution.
- [ ] Configure `app-staging.webcontentflow.com`, Cloudflare DNS and TLS.
- [ ] Verify `noindex,nofollow` header and robots response.
- [ ] Confirm registration is closed and capture mode inaccessible.
- [ ] Configure Resend sender/domain and controlled inbox.
- [ ] Configure Better Stack logs, uptime, heartbeat and alert destination.
- [ ] Trigger and resolve a synthetic alert.
- [ ] Verify backup and execute isolated restore/integrity check.
- [ ] Run the smoke package.
- [ ] Rehearse rollback.
- [ ] Record every artifact in the evidence record.
