# Database Architecture

PostgreSQL stores relational ownership/lifecycle and immutable snapshot metadata. Prisma handles ordinary CRUD/migrations; reviewed parameterized SQL may implement `FOR UPDATE SKIP LOCKED`, leases, or specialized indexes.

## Rules

- Transactions atomically create current versions, update parent current foreign keys, create result references, and complete jobs.
- JSONB is appropriate for versioned structured snapshots, provenance metadata, module settings, job request/result summaries, and safe usage data. Identity, ownership, status, current pointers, references, and dates remain columns/foreign keys.
- Every table uses UUID/CUID-like opaque ID, `createdAt`, `updatedAt` for mutable rows; immutable versions omit meaningful updates.
- Use database enum or constrained text status; map deliberately in Prisma.
- Unique constraints protect one Brief per Project, one ProjectModule per project/type, `(parentId, versionNumber)`, idempotency scope/key, and one CalendarEntry per item/date if product rule requires.
- Index `Project(userId, updatedAt)`, project FKs, job `(status, availableAt)`, lease expiry, content `(projectId,module,status,updatedAt)`, calendar `(projectId,plannedAt)`, and version parent/number.

## Deletion/retention

Recommend hard project deletion after explicit confirmation and a short recoverability/retention policy only if approved; do not implement ambiguous soft-delete behavior. If archive is approved, use explicit `archivedAt` on Project, not generic soft-delete everywhere. Cascades remove project-owned rows; external objects delete asynchronously with reconciliation. Auth/account deletion follows legal retention decision.

## Concurrency and authorization

Ownership queries join/index through `project.userId`; never trust client user/project relation. Use optimistic `updatedAt`/revision for Brief/settings and transactional current-version pointer updates. Worker leasing uses row locks and lease tokens.

Migrations are forward-only in production; backup/restore is rollback for destructive data changes. Seeds are synthetic and never automatic in production.
