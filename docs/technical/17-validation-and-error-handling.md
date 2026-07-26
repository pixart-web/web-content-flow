# Validation and Error Handling

Validation is layered: browser/RHF for immediate help; Server Action/Route Handler Zod for all untrusted input; service invariant checks; database constraints; AI output Zod; export selection authorization/normalization. Client validation never substitutes server validation.

Use a discriminated `Result<T,E>` at service/transport boundaries and typed internal errors. Taxonomy: `VALIDATION`, `AUTH_REQUIRED`, `NOT_FOUND` (also unauthorized), `CONFLICT`, `RATE_LIMITED`, `DEPENDENCY_UNAVAILABLE`, `AI_*`, `JOB_STATE`, `STORAGE`, `INTERNAL`. Each error has safe code/message, retryability, field errors?, request/job ID; cause remains server-only.

- Forms return per-field and summary errors; preserve user input.
- Expected job errors persist safe category and affected scope; raw provider response never persists/logs.
- Route error boundaries handle unexpected failures with request ID and retry/navigation.
- Database unique/version conflicts map to idempotent existing result or explicit conflict.
- Retry only known transient categories within bounds; authorization, validation, safety, quota, and deterministic invalid output are not blindly retried.

Never expose stack traces, SQL/Prisma errors, provider internals, keys, or existence of another user’s resource. See [Result contract](../../architecture/contracts/result.ts) and [UX state copy](../ux/25-empty-loading-error-states.md).
