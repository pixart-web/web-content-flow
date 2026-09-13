# Generation Job Architecture

> Current implementation: mutations are fenced by job ID, lease token, and worker owner; active leases renew before one third of their duration. Retryable provider failures return to `QUEUED` without sleeping in the worker. See [Pre-Beta Remediation](41-pre-beta-remediation-implementation.md).

## State machine

```text
PREPARING → QUEUED → RUNNING → VALIDATING → SAVING → COMPLETED
                    └──────────────────────────────→ PARTIAL
any nonterminal → FAILED or CANCELLED (when safe)
```

`RETRYING` is a UX projection of `attempt > 1` plus QUEUED/RUNNING, not a stored state. Invalid input fails before queueing or terminally without retry.

## Commands and scopes

Project pack creates a parent orchestration record and independent module jobs; item regeneration creates one item-scoped job. Idempotency unique scope examples: `project-create:user:key`, `brand-profile-generate:project:key`, `module-generate:project:module:key`, `content-item-regenerate:item:key`, `export-create:project:key`. Same key returns existing command outcome.

## Worker protocol

1. In a short transaction select eligible QUEUED job with `FOR UPDATE SKIP LOCKED`, set RUNNING, lease token/expiry, attempt+1.
2. Heartbeat renews lease; only token holder may transition/write result.
3. Build context and update truthful steps.
4. Provider call with timeout/abort; validate; normalize.
5. Transactionally insert immutable versions/items, update current pointers, and terminal job/steps.
6. On process death, reconciliation requeues expired lease if attempts remain and error is retryable.

Retries are bounded (recommend 2 total provider attempts initially), exponential/jittered, and controlled outside adapter. Never automatically retry safety rejection, invalid input, deterministic schema failure after repair limit, cancellation, or authentication/quota error. Provider rate-limit/unavailable/timeout may retry within cost ceiling.

Cancellation sets `cancelRequestedAt`; worker checks between steps and aborts provider when supported. Completed persistence wins over late cancellation only with explicit terminal rules; never silently discard/bind a late result.

Partial pack success is parent PARTIAL when at least one child completes and one fails/cancels. Module partial output persists only at documented independently valid item boundaries. Saving failure retries transaction safely using job/result uniqueness. Stale terminal/nonterminal jobs are monitored and reconciled; cleanup retains operational metadata per retention policy.

Worker concurrency and per-project/provider concurrency are bounded. Polling reads compact status; navigation never holds the request open.
