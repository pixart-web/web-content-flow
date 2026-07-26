# Technical Acceptance Checklist

## Scope and architecture

- [ ] Modular monolith, Node worker, PostgreSQL; no microservices/event sourcing/workflow engine/WebSocket requirement.
- [ ] Routes/modules match UX inventory; no publishing, rendered media, builder, teams, advanced integrations/analytics UI.
- [ ] Server Components default; client components only for interaction.

## Data and authorization

- [ ] Relational ownership indexed from every resource to Project.userId.
- [ ] Every resource command/query server-authorized; middleware is not sole control; neutral unauthorized response.
- [ ] Brief mutable with revision; profile/content versions immutable; explicit current FKs transactional.
- [ ] Jobs/items record exact profile version/job/mock/provenance; CalendarEntry references ContentItem.

## Jobs, AI, schemas, versions

- [ ] Jobs durable, idempotent, leased, bounded retry/concurrency/timeout, reconciled after crash.
- [ ] Mock runs full flow without key; OpenAI adapter shares interface; no provider routing.
- [ ] All AI outputs Zod-validated with bounds/version; partial persistence only at valid unit boundaries.
- [ ] Regenerate/restore creates snapshots and retains history; no keystroke versions.

## Export/storage

- [ ] Export reauthorizes selections and supports only approved Markdown/JSON/text; mock notice/filename limits.
- [ ] Plain text remains in Postgres; object storage delayed/private/signed/retained only when needed.

## Security/privacy/observability

- [ ] Generated text treated untrusted; no arbitrary HTML; XSS/CSRF/SSRF/IDOR/rate-limit mitigations tested.
- [ ] No briefs/prompts/content/secrets/keys/tokens/raw provider payloads in logs or analytics.
- [ ] Structured request/job IDs, safe errors, costs, queue/worker health, alerts exist.

## Quality and operations

- [ ] Unit/schema/repository/service/provider/job/export/component/E2E/accessibility/authorization tests pass.
- [ ] Environment isolation, validated secrets, forward migrations/backups, no production demo seeds.
- [ ] Query/item/context/export/rate/concurrency/cost caps configured and measured.
- [ ] Local/preview mock flow works; worker required/healthy where jobs enabled.
- [ ] ADRs accepted before dependent implementation; docs/contracts/examples remain aligned.

Related: [UX Acceptance](../ux/28-ux-acceptance-checklist.md) and [Implementation Phases](25-implementation-phases.md).
