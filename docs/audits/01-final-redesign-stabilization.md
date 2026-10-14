# Final redesign stabilization audit

**Baseline:** `main` at `3e626f3` and this stabilization successor<br>
**Audit date:** 14 October 2026<br>
**Decision:** not yet approved for production. The code, CI candidate and standalone package are validated locally, but the real cPanel runtime and the external Private Beta intake endpoint still require deployment checks.

## Scope and outcome

This audit closes the material redesign regressions without changing existing product contracts. It covers dependency security, authenticated product screens, navigation, responsive behavior, tests, the production build and separation of the institutional website from the private platform.

## Dependency security

The failing `pnpm audit --prod` reported 26 findings: 3 critical, 15 high, 7 moderate and 1 low. The critical findings affected Next.js 16.2.11: Windows RCE (`GHSA-p293-qw3h-jr36`), AVIF image-processing RCE (`GHSA-2xp9-vwfh-vxw4`) and `next/og` RCE (`GHSA-vcvr-r3jv-pc5j`). Other production advisories included Next.js SSRF/cache issues and vulnerable transitive versions of PostCSS, nanoid, browserslist, sharp, source-map-js, baseline-browser-mapping, fast-uri, deepmerge-ts and mysql2.

Resolution:

- upgraded Next.js and `eslint-config-next` from 16.2.11 to 16.4.0;
- upgraded Prisma packages from 7.9.0 to 7.10.0;
- moved and corrected security overrides in `pnpm-workspace.yaml`, the location used by pnpm 11;
- retained the security gate instead of suppressing advisories.

Final production audit: **0 known vulnerabilities**.

## Authenticated visual evidence

All captures use an isolated PostgreSQL database and fictional Northstar Roasters data. No customer data is present.

| Area | Desktop | Mobile |
| --- | --- | --- |
| Dashboard | [desktop](screenshots/dashboard.png) | [mobile](screenshots/dashboard-mobile.png) |
| Brand Profile | [desktop](screenshots/brief-to-brand.png) | [mobile](screenshots/brief-to-brand-mobile.png) |
| Website Content | [desktop](screenshots/website-generation.png) | [mobile](screenshots/website-generation-mobile.png) |
| Social Media | [desktop](screenshots/social-studio.png) | [mobile](screenshots/social-studio-mobile.png) |
| Ads & Creative | [desktop](screenshots/ads-creative.png) | [mobile](screenshots/ads-creative-mobile.png) |
| Video & Reels | [desktop](screenshots/video-scripts.png) | [mobile](screenshots/video-scripts-mobile.png) |
| Content Calendar | [desktop](screenshots/calendar-planning.png) | [mobile](screenshots/calendar-planning-mobile.png) |
| Content Library | [desktop](screenshots/library-export.png) | [mobile](screenshots/library-export-mobile.png) |

The project overview capture is also available at [desktop](screenshots/hero-flow-demo.png) and [mobile](screenshots/hero-flow-demo-mobile.png).

## Comparison with the approved mockup

### Aligned

- 240 px desktop sidebar, compact top bar, restrained light surfaces and indigo accent system;
- Poppins used selectively for display headings and Inter for dense interface text;
- dashboard hierarchy: greeting, primary creation action, module entry cards, recent content and calendar summary;
- consistent project-scoped navigation and module accents;
- desktop-first editing with usable single-column mobile layouts and 44 px interaction targets.

### Intentional differences

- Global navigation remains Dashboard, Projects and Settings. Project modules remain inside a selected project to preserve context and authorization boundaries.
- Search and notification controls from the concept mockup are not shown because no truthful MVP behavior exists for them.
- The dashboard calendar is a real operational summary rather than a decorative full-month replica.
- The Library shows real structured content metadata rather than a fabricated media gallery.
- Module screens expose structured content and explicit content-only limitations; they do not imply website publishing, social publishing, image rendering or video rendering.

### Corrections made

- authenticated capture now opens a fresh page per route, waits for fonts and resets scroll position;
- development indicators are disabled only during controlled marketing capture;
- synthetic capture seeding is idempotent;
- dashboard and project-navigation E2E assertions match the redesigned interface;
- recent-content links and every rendered project navigation link are exercised directly.

No cosmetic change was made where it would have weakened a truthful state or existing product contract.

## Navigation verification

The E2E suite signs in, opens a recent-content entry and visits every rendered project navigation destination. It verifies HTTP success and rejects the neutral unavailable state. Cross-user and missing-resource checks remain neutral and do not expose metadata.

## Test and build results

| Gate | Result |
| --- | --- |
| Formatting | Passed |
| ESLint | Passed |
| TypeScript strict check | Passed |
| Design-token consistency | Passed |
| Unit tests | 30 files, 80 tests passed |
| Provider tests | 2 files, 7 tests passed |
| Prompt/context tests | 2 files, 2 tests passed |
| Usage tests | 1 file, 2 tests passed |
| Quota integration | 1 test passed |
| PostgreSQL integration | 2 files, 8 tests passed |
| Durable worker | 1 file, 13 tests passed |
| Email | 2 files, 6 tests passed |
| Export | 1 file, 3 tests passed |
| Security/health | 2 files, 6 tests passed |
| E2E | 63 passed, 19 conditionally skipped, 0 failed |
| Accessibility smoke | Passed on desktop and mobile within E2E |
| Production build | Passed; 44 routes generated |
| Production dependency audit | 0 known vulnerabilities |

The E2E result above comes from a clean isolated database, serial CI execution and a real worker process. An earlier exploratory parallel run against capture-mutated data was rejected and is not counted as evidence.

## Standalone institutional website

Artifact: `dist/webcontentflow-institutional-cpanel.zip`<br>
SHA-256: `b6b1b3b7c92bdcfe55cfb0b203ece144a05467cf519276413ac56240649abf2e`

The ZIP contains the public Next.js website, authentic product media, installation documentation and boundary tests. It excludes private platform routes, authentication, Prisma, the worker, generation services, database migrations and private APIs.

Clean-extraction validation:

- `npm ci`, lint, typecheck, boundary tests and production build passed;
- `npm audit --omit=dev` reports 0 vulnerabilities;
- `/`, `/contact`, `/product` and `/legal/privacy` return 200;
- `/app`, `/api/auth` and `/health/live` return 404.

The complete installation and runtime contract is in `INSTALL-CPANEL.md` inside the ZIP.

## Private Beta infrastructure contract

The separated contact form posts JSON directly to the HTTPS URL configured as `NEXT_PUBLIC_BETA_FORM_ENDPOINT`. The receiving service must:

1. accept `POST` and JSON from the institutional website origin through an explicit CORS allowlist;
2. validate the request again on the server and discard honeypot submissions;
3. apply IP/origin rate limiting and request-size limits;
4. durably store the request or deliver it to a monitored mailbox/CRM;
5. return a 2xx response only after successful acceptance;
6. avoid returning secrets or provider diagnostics to the browser;
7. provide retention, access and deletion procedures matching the published privacy notice.

If the endpoint is absent, the form presents a truthful unavailable state and offers the configured contact email. A browser-level submission to the real endpoint, receipt persistence and operator notification have **not** been validated because no production endpoint was supplied.

## Remaining release gates

- deploy the ZIP to the real cPanel Node.js runtime and validate startup, proxying, TLS and all public routes;
- provision `NEXT_PUBLIC_BETA_FORM_ENDPOINT`, verify CORS from the production origin and confirm durable receipt plus operator notification;
- repeat the dependency audit and smoke checks in the deployment environment;
- confirm production environment variables, legal contact details, backups and operational ownership.

Until those checks pass, the delivery is a validated release candidate, not a production-ready declaration.
