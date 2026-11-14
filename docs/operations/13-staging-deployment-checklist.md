# Staging Deployment Checklist

Decisions of 2026-11-13: **Render** for staging and the private beta (ADR-058), **SMTP of the domain's mail host** for transactional email (ADR-078), **DNS stays with the current provider** (`wtservers.com` nameservers, managed by the product owner). Monitoring vendor is still open.

All evidence fields remain incomplete until an operator with provider access executes them. Steps marked **(owner)** need the product owner's accounts, payment method or DNS panel; the assistant prepares values and verifies results but does not create accounts or paid resources.

## 1. Repository

- [ ] Merge the approved commit to `main` with CI green (validate + e2e).
- [ ] Decide repository visibility (D-7). Render can deploy from a public or a private GitHub repository.

## 2. Render (owner)

Full procedure, environment inventory, costs, smoke checks and rollback: [18-render-staging-setup.md](18-render-staging-setup.md).

- [ ] **New → Blueprint**, select `pixart-web/web-content-flow`, branch `main`. Render reads `render.yaml` and proposes: PostgreSQL 16 `web-content-flow-staging-db` (`0.1c-256mb`, Frankfurt, no external access), web `web-content-flow-staging-web`, worker `web-content-flow-staging-worker`, cron `web-content-flow-staging-maintenance` (all `0.5c-512mb`), and the environment group `web-content-flow-staging-config`. Estimated ≈ $20.55/month on the Hobby workspace.
- [ ] Fill the values Render asks for (`sync: false`):

| Key | Services | Value |
|---|---|---|
| `SMTP_USER` | web, worker, cron | Mailbox login on the mail host, e.g. `noreply@webcontentflow.com` |
| `SMTP_PASSWORD` | web, worker, cron | That mailbox's password |
| `APP_RELEASE` | web, worker | Release label, e.g. the commit SHA (optional) |

`AUTH_SECRET` and `RATE_LIMIT_SECRET` are generated on the web service and copied to worker and cron by the Blueprint (`fromService`); nothing to paste. Auto-deploy is off: deploys are manual (web first, then worker and cron). All three services pass the server env schema with the Blueprint's values (verified locally on 2026-11-14).

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
