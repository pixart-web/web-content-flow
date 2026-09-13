# Beta Readiness Checklist

- [ ] Capture mode is false and unavailable in staging.
- [ ] Public indexing and registration remain disabled.
- [ ] Legal decisions and external counsel review are complete.
- [ ] Authentic stills are reviewed; video status is not overstated.

| Gate | Status | Evidence |
|---|---|---|
| No Critical findings | PASS | audit |
| AUD-001 fully closed | BLOCKED | crash matrix incomplete |
| Web/worker/cron deployed | BLOCKED | no staging |
| Worker restart supervised | BLOCKED | no staging |
| Backup and PITR enabled | BLOCKED | no managed DB |
| Isolated restore passed | BLOCKED | no backup |
| Password recovery delivered | BLOCKED | provider/domain absent |
| Major outage detection | BLOCKED | monitoring absent |
| Synthetic alert delivered | BLOCKED | destination absent |
| Combined beta journeys | BLOCKED | staging absent |
| Rollback and incident process | PARTIAL | runbook exists; rehearsal absent |
| Real AI disabled | PASS BY CONFIGURATION | Blueprint sets false |
| Cohort limited | PASS BY CONFIGURATION | invite-only and registration false |

**Private beta: NOT READY.** Named owners and deadlines must be assigned during provisioning; this document does not invent them.
