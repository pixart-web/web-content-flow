# Web Content Flow — Technical Architecture Index

## Purpose

This architecture defines an implementation-ready MVP monolith, durable generation model, relational data model, AI contracts, security boundaries, testing, operations, and staged delivery. Reference TypeScript and JSON artifacts are specifications, not application implementation.

## Reading order

1. [Architecture Overview](01-architecture-overview.md), [Technology Decisions](02-technology-decisions.md), [Repository Structure](03-repository-structure.md)
2. [Runtime](04-runtime-and-deployment.md), [Database](05-database-architecture.md), [Data Model](06-data-model.md), [Authentication](07-authentication-and-authorization.md)
3. [Server](08-server-application-architecture.md), [Frontend](09-frontend-architecture.md), [Generation Jobs](10-generation-job-architecture.md)
4. [AI Provider](11-ai-provider-architecture.md), [Context/Prompts](12-ai-context-and-prompt-contracts.md), [Module Schemas](13-module-schema-contracts.md), [Versions](14-versioning-and-provenance.md)
5. [Export](15-export-architecture.md), [Storage](16-storage-architecture.md), [Validation](17-validation-and-error-handling.md), [Security](18-security-and-privacy.md)
6. [Observability](19-observability-and-analytics.md), [Testing](20-testing-strategy.md), [Performance/Cost](21-performance-and-cost-controls.md)
7. [Local Development](22-local-development.md), [Environments](23-deployment-and-environments.md), [Migrations](24-migrations-and-seeding.md)
8. [Implementation Phases](25-implementation-phases.md), [Risks](26-technical-risks.md), [ADRs](27-architecture-decision-records.md), [Acceptance](28-technical-acceptance-checklist.md)
9. [Phase 0 Implementation Record](29-phase-0-implementation.md), [Phase 1 Implementation Record](30-phase-1-implementation.md), [Phase 2 Implementation Record](31-phase-2-implementation.md), [Phase 3 Implementation Record](32-phase-3-implementation.md), [Phase 4.1 Website Implementation Record](33-phase-4-1-website-implementation.md), [Phase 4.2 Social Implementation Record](34-phase-4-2-social-implementation.md), [Phase 4.3 Ads & Creative Implementation Record](35-phase-4-3-ads-creative-implementation.md), [Phase 4.4 Video & Reels Implementation Record](36-phase-4-4-video-reels-implementation.md), [Phase 4.5 General Copy Implementation Record](37-phase-4-5-general-copy-implementation.md), [Phase 4.6 Content Calendar Implementation Record](38-phase-4-6-content-calendar-implementation.md), [Phase 5 Real AI Provider Record](39-phase-5-real-ai-provider-implementation.md), [Phase 6 Production Readiness Record](40-phase-6-production-readiness-launch.md)
10. Operations: [Deployment](../operations/01-deployment-runbook.md), [Worker](../operations/02-worker-operations.md), [Backup/Restore](../operations/03-backup-and-restore.md), [Incidents](../operations/04-incident-response.md), [Release/Rollback](../operations/05-release-and-rollback.md), [Smoke Tests](../operations/06-production-smoke-tests.md)
11. Security: [Review](../security/01-security-review.md), [Retention](../security/02-data-retention-and-deletion.md), [Abuse](../security/03-abuse-and-rate-limits.md), and [Production Readiness Checklist](26-production-readiness-checklist.md)

Reference artifacts: [diagrams](../../architecture/diagrams/system-context.md), [schemas](../../architecture/schemas/brand-profile.schema.ts), [contracts](../../architecture/contracts/ai-provider.ts), and [fixtures](../../architecture/examples/mock-brand-profile.json).

## Authority

[MVP Scope](../06-mvp-scope.md) controls scope; [Product Principles](../05-product-principles.md) control trade-offs; [UX Screen Inventory](../ux/27-screen-inventory.md) controls routes/screens; [UX Generation](../ux/11-generation-system.md) controls observable job behavior; design tokens remain canonical for UI values. This set controls technical boundaries subject to those documents.

## Handoff

Approve proposed ADRs, initialize Phase 0, translate the reference model into Prisma/Zod/application code, and verify each phase against [Technical Acceptance](28-technical-acceptance-checklist.md). Reference files must not be imported as production code without review.

## Decision process

Use an ADR for durable architectural choices. Status moves Proposed → Accepted before dependent implementation. Record context, decision, consequences, alternatives, migration path, and review trigger. Product-impacting choices also update [Open Decisions](../13-open-decisions.md).

## Unresolved decisions

- Managed PostgreSQL, deployment, monitoring, analytics, email, and optional object-storage vendors.
- Password-recovery email delivery and the long-term managed identity/provider strategy.
- Worker host/trigger and database-queue leasing mechanism compatible with chosen deployment.
- Platform-managed OpenAI key versus BYOK; model names and budgets.
- Final account-deletion workflow and legally approved retention periods.
- Whether staging is needed before external MVP testing.
- Production email, monitoring, hosting, database backup, and alert-routing evidence.

All baseline choices are **Proposed**, not vendor commitments.
