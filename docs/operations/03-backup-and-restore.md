# Backup and Restore

## Backup

Require provider-managed encrypted daily backups and point-in-time recovery. Before schema changes, capture and record a recovery point. Restrict dump access and never place dumps in source control or support tickets.

## Restore drill

1. Create an isolated database in the same region/class.
2. Restore the selected recovery point.
3. Point a non-production release at it using isolated secrets.
4. Run `/health/ready` and integrity checks for users, projects, current version pointers, jobs, exports, and migration history.
5. Open one synthetic project and verify version history without running paid generation.
6. Delete the isolated restore securely and record RPO/RTO achieved.

Escalate mismatched migration history, dangling version pointers, authorization anomalies, or missing encrypted backups. A backup that has never been restored is not verified.
