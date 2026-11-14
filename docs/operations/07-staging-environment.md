# Staging Environment

The staging contract additionally requires `MARKETING_INDEXING_ENABLED=false`
and `MARKETING_CAPTURE_MODE=false`. Capture fixtures are local/test-only and
must never be seeded into external staging automatically.

## Target

- URL: `https://app-staging.webcontentflow.com` — **selected, DNS unverified**
- Region: Frankfurt
- Rollout: `INVITE_ONLY`; public registration false
- AI: mock only; real AI false
- Data: synthetic only; separate paid PostgreSQL
- Indexing: application/authenticated routes must return noindex; verify the public staging hostname is also protected from indexing before beta.

## Provisioning checklist

Procedure: [18-render-staging-setup.md](18-render-staging-setup.md).


| Gate | Owner | Date | Evidence | Status / blocker | Rollback |
|---|---|---|---|---|---|
| Git remote connected | Project owner | | | Ready: `pixart-web/web-content-flow` on GitHub (visibility D-7 open) | disconnect Blueprint |
| Render Blueprint applied | Release manager | | | Pending owner: workspace exists, Blueprint ready for review ([18](18-render-staging-setup.md)) | delete staging services |
| DNS/TLS valid | Domain owner | | | BLOCKED: domain unverified | remove DNS record |
| Separate database migrated | Database owner | | | BLOCKED | destroy staging DB |
| Web ready | Release manager | | | BLOCKED | rollback release |
| Worker heartbeat/restart | Operations | | | BLOCKED | suspend worker |
| Manual + scheduled maintenance | Operations | | | BLOCKED | suspend cron |
| Security/smoke checklist | QA/Security | | | BLOCKED | maintenance mode |

Do not paste secrets, reset tokens, connection strings, emails, or customer content into evidence.
