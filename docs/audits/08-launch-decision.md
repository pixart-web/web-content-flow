# Launch Decision and Remediation Roadmap

## Finding totals

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 6 |
| Medium | 7 |
| Low | 3 |
| Informational | 1 |

## Private beta recommendation

**Status: NOT READY**

- **Supporting evidence:** core mock workflows, owner scoping, migrations, immutable data, modules, build, and E2E are functional.
- **Blocking findings:** AUD-001, AUD-003, AUD-005. AUD-002/006 also block if real generation is enabled.
- **Required conditions:** configure backup/PITR; deploy/monitor one worker; prove major-failure detection; fence/renew leases; add recovery/export/worker-interruption tests; keep real AI disabled until AUD-002/006 are fixed.
- **Accepted risks:** draft legal copy may be accepted only for named internal testers under an explicit agreement; no billing/publishing/deletion self-service.
- **Owner:** Engineering + Operations + Product/Security.
- **Target verification:** isolated deployed beta environment, backup evidence, smoke record, slow/crash worker suite.
- **Retest:** journeys A, C, G, H and health/alerts.

## Controlled production recommendation

**Status: NOT READY**

- **Supporting evidence:** production build/env guards, secure headers, reset/export service behavior, quota reservation, and runbooks exist.
- **Blocking findings:** AUD-001–007 and AUD-009.
- **Required conditions:** bounded automatic retries; authoritative prompts; reliable transactional email; deployed worker/maintenance; monitoring/alerts; backup plus isolated restore; migration-aware readiness; expanded CI.
- **Accepted risks:** CSP inline exception can be time-bound with explicit security acceptance; account deletion may use a documented support process after legal approval.
- **Owner:** Engineering, Operations/SRE, Security, Product.
- **Target verification:** production-like staging and release candidate with no live customer content.
- **Retest:** all ten audit journeys, restore drill, rollback, provider failure matrix, export lifecycle.

## Public launch recommendation

**Status: NOT READY**

- **Supporting evidence:** truthful public product boundaries and broad MVP implementation.
- **Blocking findings:** every unresolved High plus AUD-008–013 and accessibility/operations evidence gaps.
- **Required conditions:** no open High blocker; legal/privacy/subprocessor approval; deliberate registration/support ownership; active monitoring; verified backup/restore; accessibility audit; performance baseline; production smoke and rollback rehearsal; evidence-backed checklist.
- **Accepted risks:** Medium risks must be individually signed by Product/Security/Legal with expiry and owner.
- **Owner:** Product launch owner with Engineering, Security, Legal, Support, Operations.
- **Target verification:** public production candidate and post-deploy smoke.
- **Retest:** complete Step 17 audit delta plus external infrastructure evidence.

## Prioritized remediation roadmap

### P0 — Must fix before any external beta

| Findings | Objective | Components | Dependencies | Size | Owner | Tests / acceptance evidence |
|---|---|---|---|---:|---|---|
| AUD-001 | renewable, fenced job ownership | worker, handlers, provider abort | PostgreSQL | M | Backend/AI | two-worker slow call, lease loss, crash at persistence, no duplicate usage/version |
| AUD-003 | minimum backup and failure detection | managed DB, worker host, monitor | vendor selection | L | Ops/SRE | backup ID, alert test, worker-down detection, beta smoke |
| AUD-005 | cover beta-critical journeys | tests/CI | mail sink, test DB | M | QA/Engineering | recovery/export/interruption E2E green |

### P1 — Must fix before controlled production

| Findings | Objective | Components | Dependencies | Size | Owner | Tests / acceptance evidence |
|---|---|---|---|---:|---|---|
| AUD-002 | bounded transient retries | executor/queue/usage | AUD-001 | M | AI/Backend | timeout/429/5xx retry, refusal terminal, Retry-After, cost attempts |
| AUD-004 | truthful readiness | health/release metadata | migration contract | S | Platform | unfinished/failed/missing expected migration returns 503 |
| AUD-006 | authoritative prompt resolution | registry/executor/handlers | prompt migration policy | M | AI Platform | unknown key rejected; exact registered message/budgets/provenance |
| AUD-007/009 | reliable recovery/change notifications | email/auth/settings | provider/DNS | M | Auth/Ops | mock sink E2E, sender DNS, failure-after-commit behavior |
| AUD-003 | restore and operations proof | DB/deploy/runbooks | selected vendors | L | Ops/SRE | isolated restore validates all canonical tables/current pointers |

### P2 — Must fix before public launch

| Findings | Objective | Components | Dependencies | Size | Owner | Tests / acceptance evidence |
|---|---|---|---|---:|---|---|
| AUD-008 | neutral registration | auth | email/verification decision | XS | Auth | known/unknown response equivalence |
| AUD-010 | CSP review/hardening | Next.js headers | deployment nonce support | M | Security/Frontend | runtime CSP and browser regression |
| AUD-011 | explicit noindex | auth/health metadata | none | XS | Frontend | header/metadata tests |
| AUD-012 | reconcile current-state docs | technical/product docs | technical remediations | S | Architecture | doc-code checklist |
| AUD-013 | approved legal/deletion/subprocessors | legal/settings/support | vendor inventory | M | Legal/Product | approved versions and tested request workflow |
| AUD-016 | target-size verification | public/auth UI | accessibility audit | XS | Frontend/Design | WCAG target-size/spacing evidence |

### P3 — Improve after launch

| Findings | Objective | Components | Size | Owner | Evidence |
|---|---|---|---:|---|---|
| AUD-014 | smoother Prisma DX | Prisma config/docs | XS | Platform | generate works/documented |
| AUD-015 | SBOM/licence governance | CI | S | Security/Ops | reproducible report |
| AUD-017 | automate integrity checks | release/restore tooling | S | Data/Ops | read-only report in restore/release |
| Performance observations | route/query/queue budgets | app/worker/observability | M | Platform | dashboards and thresholds |

## Audit limitations

- no live commercial provider, email, production database, DNS, deployment, monitoring, or backup access;
- no real customer data;
- no external penetration test;
- no full Git-history/hosted-CI secret scan;
- no complete WCAG conformance or assistive-technology audit;
- no production load, Web Vitals, provider latency, or restore;
- audit commands used local Node 25 for some probes while the repository target/CI is Node 24.14;
- licence command failed and remains unverified.

No new product phase or feature was implemented. Audit output consists only of these reports.
