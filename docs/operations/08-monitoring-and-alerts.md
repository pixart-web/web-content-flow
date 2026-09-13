# Monitoring and Alerts

**Selected:** Better Stack plus Render native service/database metrics. **Status:** not configured.

| Alert | Proposed trigger | Severity | Owner | Destination | Runbook | Tested |
|---|---|---|---|---|---|---|
| Web readiness | 2 consecutive 503s / 2 min | SEV-2 | Operations | controlled project channel | deployment | No |
| Worker stale | newest heartbeat >90 s | SEV-2 | Operations | controlled project channel | worker | No |
| Worker crash loop | 3 restarts / 10 min | SEV-2 | Operations | controlled project channel | worker | No |
| Queue age | oldest ready job >5 min | SEV-2 | Operations | controlled project channel | worker | No |
| Terminal provider failure | 5 / 10 min | SEV-2 | Engineering | controlled project channel | incident | No |
| Email failures | 3 / 10 min | SEV-2 | Support/Ops | controlled project channel | incident | No |
| Maintenance failure | missed heartbeat or non-zero run | SEV-2 | Operations | controlled project channel | backup/maintenance | No |
| Database outage | readiness DB unavailable | SEV-1 | Operations | controlled project channel | restore | No |
| Backup stale | provider backup outside policy | SEV-1 | Database owner | controlled project channel | restore | No |

Required views: Application health, Worker health, Generation health, Email health, Database/backup health. Labels may include release, safe error code and job state; never content, prompts, email, credentials, tokens or project titles.

