# Staging Deployment Checklist

Decisions of 2026-11-13: **Render** for staging and the private beta (ADR-058), **SMTP of the domain's mail host** for transactional email (ADR-078), **DNS stays with the current provider** (`wtservers.com` nameservers, managed by the product owner). Monitoring vendor is still open.

All evidence fields remain incomplete until an operator with provider access executes them. Steps marked **(owner)** need the product owner's accounts, payment method or DNS panel; the assistant prepares values and verifies results but does not create accounts or paid resources.

## 1. Repository

- [ ] Merge the approved commit to `main` with CI green (validate + e2e).
- [ ] Decide repository visibility (D-7). Render can deploy from a public or a private GitHub repository.

## 2. Render (owner)

- [ ] Create the Render workspace and add a payment method.
- [ ] **New → Blueprint**, select `pixart-web/web-content-flow`, branch `main`. Render reads `render.yaml` and proposes: PostgreSQL `web-content-flow-staging-db` (Frankfurt), web `web-content-flow-staging-web`, worker `web-content-flow-staging-worker`, cron `web-content-flow-staging-maintenance`.
- [ ] Confirm in the database settings that the chosen plan provides backups and point-in-time recovery; upgrade the plan if it does not.
- [ ] Fill the secret values Render asks for (`sync: false`):

| Key | Services | Value |
|---|---|---|
| `AUTH_SECRET` | web (generated), worker, cron | Worker and cron must use **the same value as web** |
| `RATE_LIMIT_SECRET` | web (generated), worker, cron | Same value as web |
| `APP_RELEASE` | web, worker, cron | Same immutable value on all three (commit SHA) |
| `SMTP_USER` | web, worker, cron | Mailbox login on the mail host, e.g. `noreply@webcontentflow.com` |
| `SMTP_PASSWORD` | web, worker, cron | That mailbox's password |

Already set by `render.yaml`: `EMAIL_PROVIDER=SMTP`, `SMTP_HOST=mail.webcontentflow.com`, `SMTP_PORT=587`, `SMTP_SECURE=false` (STARTTLS required), `EMAIL_FROM=noreply@webcontentflow.com`, `NODE_ENV=production` on worker/cron, staging guards (`APP_ENV=staging`, registration and indexing off, capture mode off, mock AI). All three services pass the server env schema with these values (verified locally on 2026-11-13).

## 3. Mail host (owner)

- [ ] Create the mailbox `noreply@webcontentflow.com` on the hosting panel (or change `EMAIL_FROM` to an address the SMTP login may send as).
- [ ] Confirm the host signs outgoing mail with the published DKIM key (selector `default`).

## 4. DNS at the current provider (owner)

| Name | Type | Value | Why |
|---|---|---|---|
| `app-staging` | CNAME | the `*.onrender.com` host Render shows after adding the custom domain to the web service | Staging URL used in `render.yaml` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:postmaster@webcontentflow.com` | Start in monitoring mode; move to `p=quarantine` after reports look clean |

No SPF change is needed: mail leaves through `mail.webcontentflow.com`, which the existing SPF record already authorises.

The root domain `webcontentflow.com` currently points to a Hetzner server whose Traefik has no route for the app (default certificate, 404). It is not used by staging; decide separately whether it should serve the marketing site from Render or from Hetzner.

## 5. Deploy and verify

- [ ] Pre-deploy migrations run automatically (`pnpm migrate:production`); never seed staging.
- [ ] `/health/live` returns 200; `/health/ready` returns 200 with `migrations: ok` and `email: configured`.
- [ ] Worker heartbeat recorded; the hourly maintenance job completes.
- [ ] Add `app-staging.webcontentflow.com` as custom domain on the web service; TLS certificate issued.
- [ ] `noindex, nofollow` header present; registration closed; capture mode inaccessible.
- [ ] Password recovery for a controlled inbox delivers mail; headers show SPF and DKIM pass. This also proves Render can reach port 587 of the mail host.
- [ ] Choose the monitoring vendor; configure uptime, worker-heartbeat alert and an alert destination; trigger and resolve a synthetic alert.
- [ ] Verify a backup exists and run an isolated restore with `pnpm restore:verify`.
- [ ] Run the smoke package (`15-staging-smoke-test-package.md`).
- [ ] Rehearse rollback (`11-rollback-rehearsal.md`).
- [ ] Record every artefact in `14-staging-evidence-record.md`.
