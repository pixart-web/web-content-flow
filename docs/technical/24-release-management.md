# Release Management

Each release uses an immutable commit, frozen lockfile, reviewed Prisma migration, green CI, and an environment-specific deployment. Preview and test databases are isolated from production.

## Sequence

1. Confirm the readiness checklist and external gates.
2. Back up the production database and record the identifier.
3. Apply forward-compatible migrations once.
4. Deploy web and worker from the same commit.
5. Run liveness, readiness, authentication, owned-project, generation, export, and sign-out smoke checks.
6. Monitor errors, job age, provider failures, and database saturation.

Application rollback redeploys the prior immutable artifact. Database migrations use forward fixes unless a reviewed reverse migration is demonstrably safe. Disable risky capability flags before rollback when possible. See [Release and Rollback](../operations/05-release-and-rollback.md).
