# Test and Validation Matrix

## Commands executed

Durations are local wall-clock observations; CI may differ.

| Command | Result | Duration | Warnings / skipped | Evidence |
|---|---|---:|---|---|
| `pnpm install --frozen-lockfile` | PASS | 0.22s | Already up to date | terminal audit run |
| `pnpm prisma:generate` | FAIL then PASS | 0.57s + <1s | Bare command lacked `DATABASE_URL`; passed with audit URL | AUD-014 |
| `pnpm prisma:migrate` | PASS | 0.66s | 11 migrations applied from empty | temporary `wcf_audit` |
| `pnpm prisma:seed` | PASS | 0.97s | synthetic only | guarded seed |
| `pnpm format:check` | PASS | included | none | repository |
| `pnpm lint` | PASS | included | zero warnings | repository |
| `pnpm typecheck` | PASS | included | strict settings | repository |
| `pnpm tokens:check` | PASS | included | none | token verifier |
| `pnpm test` | PASS | 3.01s | 60 tests | Vitest |
| `pnpm test:provider` | PASS | 0.50s | 7 tests | deterministic providers |
| `pnpm test:prompts` | PASS | 0.55s | 2 tests | inventory/context only |
| `pnpm test:usage` | PASS | 0.41s | 2 tests | pricing |
| `pnpm test:quota` | PASS | 0.30s | 1 integration test | PostgreSQL |
| `pnpm test:email` | PASS | 0.55s | 3 tests | templates/hash only |
| `pnpm test:export` | PASS | 0.50s | 3 formatter tests | no service auth test |
| `pnpm test:security` | PASS | 0.49s | 1 rate-limit test; no health test | AUD-005 |
| `pnpm test:integration` | PASS | 0.65s | 8 tests | PostgreSQL |
| `pnpm test:worker` | PASS | 0.78s | 12 tests | PostgreSQL |
| `pnpm build` | PASS | 7.37s total | required Google Font access and synthetic staging env | Next.js production |
| `pnpm test:e2e` | PASS | 19.5s | 46 passed, 18 viewport-gated skipped | Chromium desktop/mobile |
| `pnpm check` | PASS | 9.6s | repeats format/lint/type/tokens/unit | repository |
| `pnpm audit --prod` | PASS | <1s with network | no known vulnerabilities | npm advisory endpoint |
| Prisma drift | PASS | <1s | migrated DB equals schema | `migrate diff` |
| Secret pattern scan | PASS WITH REVIEW | <1s | matches were placeholders/test credentials only | source + `.next/static` |
| Client secret sentinel scan | PASS | <1s | no server env names/audit sentinels in static bundle | `.next/static` |
| Licence inventory | FAIL | <1s | pnpm missing package index file | AUD-015 |
| Public responsive probe | PASS WITH ISSUE | ~1.1s | no overflow; small text links | five widths |
| Production headers/health | PASS WITH ISSUE | <1s | CSP inline allowance; migration false-positive | runtime curl |
| Synthetic password reset | PASS WITH ISSUE | <1s | localhost passes; 127.0.0.1 fails | direct service probe |
| Synthetic export lifecycle | PASS | <1s | foreign and expired denied | direct service probe |
| Database integrity SQL | PASS | <1s | all audited anomaly counts zero | temporary DB |

## Suite inventory

| Category | Evidence | Assessment |
|---|---:|---|
| Unit/schema/registry/component | 60 tests across 23 files | Good schema breadth; component breadth is low |
| Provider | 7 | Mock/fake/error normalization covered; no live calls |
| Prompt/context | 2 | Registry uniqueness/context covered; runtime registry use not covered |
| Usage/pricing/quota | 3 dedicated | Reservation idempotency covered; complete provider-suppression journey absent |
| Email | 3 | Template and token hash; no DB lifecycle/browser/mail sink |
| Export | 3 | Formatter safety only; manual service lifecycle passed |
| Security | 1 dedicated | Inadequate breadth |
| Integration/repository | 8 | Strong core owner/version checks; not every resource |
| Worker | 12 | Modules/partial/version behavior; no slow lease/automatic retry/crash matrix |
| E2E | 46 pass / 18 skip | Strong phase 1–4 UI; Phase 5/6 incomplete |
| Accessibility | no dedicated scanner | Manual/semantic and responsive evidence only |
| Performance | no automated budget | artifact and timing observations only |

## User journeys

| Journey | Result | Evidence / gap |
|---|---|---|
| A New account → generation → export | PASS WITH ISSUE | registration/onboarding/project/Brand Profile E2E; module/edit E2E and export service separately, not one complete flow |
| B Returning user | PASS WITH ISSUE | dashboard/project/Library/edit/Calendar E2E; active-job/export continuity not one scenario |
| C Password recovery | PASS WITH ISSUE | direct synthetic reset passed; no browser/mail-sink or production delivery |
| D Partial generation | PASS | worker keeps valid children and partial status |
| E Regeneration conflict | NOT TESTED | optimistic manual conflict and invalid regeneration tested separately; exact concurrent race absent |
| F Usage limit | PASS WITH ISSUE | serialized reservation test; no asserted provider-not-called UI journey |
| G Export | PASS WITH ISSUE | direct owner/foreign/expiry passed; no browser format matrix/historical-version integration |
| H Worker interruption | NOT TESTED | queue persistence exists; no live interrupt/lease recovery test |
| I Brand Profile provenance | PASS WITH ISSUE | version references/worker tests and integrity; complete A→B UI journey absent |
| J Calendar source provenance | PASS WITH ISSUE | strict exact-source schemas and Calendar UI; full source A→B→refresh journey absent |

## Module matrix

| Module | Types / orchestration | Partial & retry | Editor/version/Library | Evidence | Audit result |
|---|---|---|---|---|---|
| Website | `WEBSITE_PAGE`; parent + page children | partial children retained; manual failed-scope path | section edit/regeneration, versions, Library | schema, worker, E2E | PASS WITH AUD-001/002 |
| Social | post/carousel/story/caption; child per item | partial retained; failed scope | item/field operations, versions, Library | schema, worker, E2E | PASS WITH AUD-001/002 |
| Ads | search/meta/LinkedIn/brief/prompt pack | independent assets/variants | structured variant/field editing | schema, worker, E2E | PASS WITH AUD-001/002 |
| Video | script/shot/VO/caption/production brief | independent planning assets | scene/shot/field patterns | schema, worker, E2E | PASS WITH AUD-001/002 |
| General Copy | 15 registered production types plus proof type | partial pack retained | section/field/item patterns | schema, worker, E2E | PASS WITH AUD-001/002 |
| Calendar | 3 types; weekly fan-out | valid weeks retained; failed period retry | exact source refs, versioned edits, Library | schema, worker, E2E | PASS WITH provenance journey gap |

## Security and operational controls

| Control | Result |
|---|---|
| Project/content route horizontal access | PASS in repository/E2E tests |
| Export owner/expiry | PASS in manual synthetic probe; missing CI integration |
| Reset token digest/single use/session invalidation | PASS in manual synthetic probe |
| Generated HTML execution | PASS static scan: no `dangerouslySetInnerHTML` |
| Arbitrary URL fetch | PASS static scan: only fixed Resend endpoint |
| Runtime security headers | PASS WITH ISSUE (AUD-010) |
| Readiness DB outage | PASS: live 200, ready 503 |
| Readiness migration mismatch | FAIL: AUD-004 |
| Worker heartbeat/lease renewal | FAIL: AUD-001 |
| Monitoring/alerts/backups/restore | UNVERIFIED: AUD-003 |
| Production environment validation | PASS synthetic: mock email, missing rate secret, fake AI rejected |

## Untested or unverified

- live OpenAI behavior, provider retention, Retry-After, refusal payloads, and real cost;
- Resend delivery, SPF/DKIM/DMARC, bounce/failure monitoring;
- production auth cookies behind the chosen proxy/domain;
- production database backups/PITR and restore;
- deployed worker/maintenance scheduler/alerts;
- account deletion and subprocessor workflow;
- full WCAG 2.2 AA, screen readers, zoom, reduced motion;
- Lighthouse/Web Vitals/authenticated query profiling/worker throughput;
- licences/SBOM;
- exact crash boundaries listed in Step 17.

