# Release and Rollback

Every release record must name the responsible role, verification date, status, blocker, expected migration identity, evidence links, and rollback action. A release is blocked when readiness does not confirm the compiled expected migration.

Use progressive rollout: deploy privately, verify, invite controlled accounts, then enable public registration only with approval.

Release evidence includes commit, migration, CI URL, backup identifier, environment diff, smoke result, operator, and time. Feature flags are not a substitute for authorization, but may disable registration, exports, project packages, real generation, or place the app in maintenance.

For application failure, redeploy the last compatible immutable release. For migration failure, stop rollout and prefer a forward corrective migration. Restore the database only for corruption or irrecoverable migration impact and only under the restore runbook. Web and worker should remain on compatible commits.
