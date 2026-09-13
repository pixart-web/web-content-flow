# Backup and Recovery

> Current implementation: `pnpm restore:verify` provides a read-only relational integrity check. Managed backup, PITR, retention, alerts, and an actual restore remain **EXTERNAL VERIFICATION REQUIRED**.

## Required production contract

The managed PostgreSQL provider must offer encrypted automated backups and point-in-time recovery. Target working assumptions are 24-hour RPO and 4-hour RTO; Product/Ops must approve them before launch.

Before a migration, record the backup identifier and retention. At least quarterly, restore the latest backup into an isolated non-production database, run migrations only if required, execute readiness and integrity queries, and record duration and result.

Exports are derived, short-lived data and do not replace database backups. No object-storage backup is required while exports remain in PostgreSQL and uploads are absent.

Never use a production dump as a development fixture. Restore access is limited, audited, and handled as customer data. See [Backup and Restore](../operations/03-backup-and-restore.md).
