# AI Context and Prompt Contracts

> Current implementation: real execution resolves the immutable Prompt Registry identity and uses its instructions, message builder, model policy, budgets, and repair policy. Historical `1.0.0` identities were not rewritten.

Prompts live under future `server/ai/prompts/`; module composition under `server/ai/modules/`; adapters under `server/ai/providers/`. UI components never contain prompt instructions.

## Context envelope

- system policy: role, structured-output requirement, factual/safety boundaries, no fabricated proof;
- sanitized Project Brief snapshot and revision;
- exact Brand Profile snapshot/version;
- module request or transformation request with bounded user instruction;
- output language, prompt version, schema version, mode;
- limits: requested item counts, string/array bounds, token/cost budget.

Transformation context includes current item snapshot and exact scope; it never asks for hidden reasoning. Treat user/reference text as data delimited from instructions to reduce prompt injection. Do not fetch reference URLs during generation in MVP.

## Versioning and provenance

Record provider, model, prompt version, schema version, Brand Profile version, brief revision, timestamp, mock flag, job ID, and usage/cost metadata where available. Store the prompt template identifier/version and safe parameters, not hidden chain-of-thought. Full rendered prompts containing customer data should not be retained by default.

## Budgets and trimming

Fail oversized direct inputs with actionable validation. Deterministically select required brief/profile fields, summarize only through an explicit versioned preprocessing step if later needed, and never silently drop essential audience/value/tone fields. Module count/output length caps determine max output tokens. Mock fixtures are deterministic and schema-valid.

Safety instructions prohibit fabricated statistics/testimonials/certifications, unsafe regulated claims, arbitrary HTML, secrets, and imitation requests. Provider safety rejection maps to terminal job error requiring revised input.
