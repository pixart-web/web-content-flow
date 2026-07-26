# Migrations and Seeding

Prisma schema changes create reviewed migrations locally; CI applies to ephemeral DB and runs schema/repository tests. Production uses `prisma migrate deploy` or equivalent release step, never development migration commands.

Use expand/backfill/switch/contract for incompatible changes. Data migrations are idempotent, batched, observable scripts or SQL with pre/post counts. Do not edit applied migrations. Rollback for destructive change is backup restore or forward fix; rehearse before risky migration.

Seeds are explicit environment-guarded commands. The demo project is **UrbanStride**, fictional and labelled mock-generated. Seed user uses synthetic reserved-domain email; project includes Brief, Brand Profile v1, module items/versions, jobs, and Calendar references conforming to schemas. Never include real personal/customer data.

Production seeds do not run automatically. Operational lookup data uses migrations or idempotent bootstrap clearly separated from demo data. Mock fixtures are versioned and schema-tested; when schema version changes, add/migrate fixtures deliberately.
