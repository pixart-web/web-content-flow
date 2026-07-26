# Phase 5 — Real AI provider implementation

## Scope and outcome

Phase 5 adds opt-in OpenAI text generation behind the existing durable job architecture. It retains deterministic mock generation and integrates Brand Profile, Website, Social, Ads, Video, General Copy, Calendar, and supported regeneration paths through one structured provider boundary. It adds no billing, publishing, browsing, tools, image/video rendering, or customer-supplied provider keys.

## Accepted implementation

- OpenAI is the first real provider; the adapter uses the official Responses API SDK, Zod structured output parsing, `store: false`, no tools, bounded timeout, abort support, and zero SDK retries.
- The provider registry resolves `MOCK` or `OPENAI`. A deterministic fake OpenAI transport exercises real-mode contracts in CI without network access.
- Model tiers are server-controlled: standard `gpt-5.6-terra`, premium `gpt-5.6-sol`, and repair `gpt-5.6-luna`. Environment overrides permit operational migration without accepting model IDs from clients.
- Prompt definitions are registered by immutable `key@version`, currently `1.0.0`, with purpose, module/content type, input/output schemas, budgets, safety notes, and a one-structure-repair policy.
- Context treats the brief, current Brand Profile version, module request, current snapshot, and selected source versions as untrusted data. Brand Profile remains authoritative. No hidden chain-of-thought is requested or stored.
- Provider output passes provider parsing, Zod module validation, existing domain invariants, and immutable version persistence. Application-issued/deterministic IDs remain authoritative.

## Generation and repair

Jobs capture generation mode, provider, model tier/ID, prompt key/version, purpose, brief revision, and Brand Profile version. Workers preserve leasing, idempotency, polling, partial success, and immutable versions.

Only a schema-validation failure may trigger structural repair. The repair model receives the schema, captured context, and an instruction to preserve meaning and add no facts. At most one repair call is made. Authorization, refusal, quota, oversized context, and configuration errors are never repaired. A failed repair leaves current content unchanged.

Provider retries remain outside the adapter. Transient network, timeout, rate-limit, and server failures are retryable within existing bounded job attempts. Invalid input/output after repair, authentication, configuration, refusal, quota, cancellation, and unsupported-model errors are terminal or require explicit recovery.

## Usage, pricing, quotas, and reservations

`GenerationUsage` records every real attempt with provider/model tier, prompt identity, purpose, repair marker, normalized tokens, safe hashed request ID, usage source, and optional calculated cost. Unknown price is stored as unknown—not zero. Prices are effective-dated, integer minor-unit configuration.

Before a provider call, a serializable transaction checks project daily/monthly and account daily token limits and creates one job-scoped reservation. Reservations are idempotent, expire after ten minutes, and reconcile to actual usage or release on failures without reported usage. Mock generation does not reserve or consume real quota. Repair usage is recorded separately.

Context size is estimated before execution and rejected at the configured bound. Output tokens, active provider calls, active project jobs, retries, and timeouts are bounded by environment configuration.

## Provenance, privacy, and security

Current versions record real/mock mode, provider, model, tier, prompt identity, purpose, Brand Profile version, repair state, and usage record references. Existing versions are never silently rewritten.

Generated content remains untrusted text and is never rendered as arbitrary HTML. Prompts isolate untrusted project data and disable tools/retrieval. Logs and analytics exclude briefs, prompts, generated snapshots, secrets, clipboard content, provider keys, and raw request IDs. Only safe enums, opaque internal IDs, counts, duration, job state, mock state, and normalized error codes are allowed.

## Database and migration

Migration `20260730120000_phase_5_real_ai` adds provider/model/prompt/attempt metadata to durable jobs plus `GenerationUsage` and `UsageReservation`. Existing rows are truthfully backfilled as `mode=MOCK` and `provider=MOCK`; unknown historical prompt information remains null. Indexes support provider work claims, usage windows, and active reservation checks.

## Configuration and operations

See [Configuration and secrets](15-configuration-and-secrets.md) and [Deployment and operations](22-deployment-and-operations.md). Real mode is opt-in and fails closed when its secret is unavailable. Settings exposes only safe operational availability and aggregate usage—not secrets or arbitrary model selection.

## Testing and CI

Unit suites cover normalized provider success/failures, prompt identities/policies, context bounds, and effective-dated pricing. PostgreSQL suites cover idempotent reservation/reconciliation alongside existing authorization, version, worker, and module suites. CI uses mock mode plus the fake OpenAI transport and never calls the live provider. A live production smoke test is a manual, restricted-key deployment operation.

Commands: `test:provider`, `test:prompts`, `test:usage`, `test:quota`, `test:integration`, `test:worker`, and `test:e2e`.

## Accepted ADRs

OpenAI-first/provider-neutral, structured Zod outputs, application-controlled IDs, immutable prompt versions, server model tiers, one structural repair, classified bounded retries, per-attempt usage, serialized reservations, effective-dated prices, fail-closed context budgets, content-free logs, no live CI calls, exact job context, and retained mock mode are accepted in [ADRs](27-architecture-decision-records.md).

## Deviations and unresolved decisions

- The requested new documentation numbers overlap existing Export and Local Development documents, so additive configuration and operations documents coexist with them.
- Infrastructure vendor, final launch models, price table approval, commercial quotas, provider data-retention settings, and production worker host remain operational decisions.
- Price entries are intentionally empty until finance/operations approve effective provider prices; token usage is still recorded.
- Live provider smoke testing cannot run without an approved restricted API key and must never run in CI.

## Acceptance status

The implementation is solo-developer compatible, provider-neutral at the application boundary, durable, version-preserving, mock-capable, and closed to external side effects. Final command results are recorded in the completion handoff.
