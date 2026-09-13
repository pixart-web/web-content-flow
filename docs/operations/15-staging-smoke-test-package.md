# Staging Smoke-Test Package

## Automated

- CI: format, lint, typecheck, unit/component, PostgreSQL integration, worker, build, Playwright, axe, tokens, secret and client-bundle scans.
- HTTP: homepage 200, security headers, staging `noindex,nofollow`, robots disallow, live 200, ready 200 only with required dependencies.
- Browser: sign-in, onboarding/project creation, Brief, Brand Profile, Website, Social, Ads, Video, Copy, Calendar, Library, versions and Export.

## Semi-automated

- Restart worker during an active mock job and verify lease recovery.
- Run maintenance and record structured result.
- Request password recovery to a controlled inbox and verify one-use/expiry.
- Export each supported format and inspect content boundary.
- Run Lighthouse desktop/mobile against the deployed URL.

## Manual

- Keyboard-only navigation and focus order.
- 320, 375, 768, 1280 and 1440 px; 200% zoom.
- Reduced motion, video poster/fallback, pause/controls and alternative text.
- Legal and Security copy review against the approved claim register.
- Visual check of all Northstar Roasters stills for synthetic-only data.

## External-provider evidence

- Render deployment/release, worker, cron and database metrics.
- Resend sender/DNS, controlled delivery and event evidence.
- Better Stack uptime, heartbeat and synthetic alert.
- Cloudflare DNS/TLS.
- Render backup/PITR and isolated restore.
- Optional controlled real-AI smoke only after approval.
- Rollback to the prior saved version.

Never label semi-automated, manual or provider checks as automated.
