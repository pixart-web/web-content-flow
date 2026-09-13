# AI Provider Architecture

> Current implementation: provider retries are scheduled durably by the job boundary, not by the SDK. Retry-After is normalized and clamped. Live-provider behavior remains operationally unverified.

One application-facing `AiProvider` supports `mock` and `openai` implementations. The selected provider is configured server-side per job mode; there is no production routing or model chooser in MVP.

The contract accepts request metadata, typed input, a runtime schema, timeout/cancellation signal, prompt/schema/model configuration, and returns validated candidate data plus normalized provider/model/usage metadata. Provider adapters do not retry or persist; the job handler controls attempts and transactions.

Errors are discriminated: `AUTHENTICATION`, `PERMISSION`, `RATE_LIMIT`, `QUOTA`, `TIMEOUT`, `UNAVAILABLE`, `INVALID_RESPONSE`, `SAFETY_REJECTION`, `CANCELLED`, `UNKNOWN`. Each includes retryable boolean determined by safe mapping, provider request ID when non-sensitive, and no raw body.

Mock provider is deterministic from fixture/scenario/seed, requires no API key/network, exercises the same schema and lifecycle, and records provider/model as `mock`. OpenAI uses structured output capability where supported, explicit model/config, abort timeout, and usage collection. Model names/budgets remain environment configuration approved before real-mode rollout.

See [contract](../../architecture/contracts/ai-provider.ts), [Job Architecture](10-generation-job-architecture.md), and [Prompt Contracts](12-ai-context-and-prompt-contracts.md).
