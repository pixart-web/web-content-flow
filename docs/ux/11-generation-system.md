# Generation System

## Job model

- **Project-level job:** content-pack request coordinating selected module jobs; summary can partially complete.
- **Module-level job:** creates/extends one module’s structured items.
- **Item-level job:** regenerates one item or supported field/section and creates a version.
- Sequential or modestly parallel execution is represented as independent durable module states, not a complex graph.

## Workflow

- **Trigger:** generate/regenerate action.
- **Prerequisites:** authorization, valid brief/current Brand Profile, supported module inputs, allowance/provider or mock availability.
- **Main path:** preparing → queued → running meaningful steps → validating → saving → complete.
- **Alternative:** navigate elsewhere, close browser, cancel when technically safe, or use mock mode when configured.
- **Failure:** provider/validation/quota/network/job timeout; mark exact scope failed and preserve valid content.
- **Recovery:** retry same scope idempotently; revise input when error is input-related; no automatic paid retry loop.
- **Completion/persistence:** job, status, profile version, result references, timestamps, safe error category persist.
- **Navigation:** remain on current screen or open results; completion toast is optional and status center is durable.

## State behavior

| State | Message/action | User may continue |
|---|---|---|
| Preparing | `Preparing project context` | Navigate; cancel before dispatch if supported |
| Queued | `Website generation is queued` | Full project use; cancel if supported |
| Running | Current truthful step, indeterminate | Navigate, review/edit unrelated content |
| Partial | `Some content could not be generated` + completed/failed scopes | Use completed items; retry failures |
| Complete | `Your website copy is ready` + open results | All normal actions |
| Failed | Scope + preserved-state statement + retry | All unaffected work |
| Cancelled | `Generation cancelled. Existing content is unchanged.` | Restart |
| Retrying | `Retrying Services page` | Navigate; duplicate action disabled |
| Mock | Same lifecycle plus persistent `Mock` label | Same actions; no external provider |

## Meaningful steps

Website: Preparing context → Generating structure → Creating page copy → Validating → Saving. Other modules replace structure/page copy with their truthful operations. Never show percentages unless completed units/total are known (for example 3 of 5 pages saved); label that as item count, not provider progress.

## Interaction rules

- Submit uses idempotency key; button becomes `Generation started`/disabled for duplicate scope.
- Cancellation is offered only when the backend can honor it; late results for cancelled jobs do not silently become current.
- Item regeneration states `Previous version retained` before confirmation.
- Profile edits mark existing items as using an older profile; they are not auto-regenerated.
- Status center groups active/recent failures; toasts do not steal focus.
- Return/refresh reconciles server state; stale client status is replaced without duplicating results.

## Screen contract

- **Route:** status center overlay from project shell; detailed module/item state on canonical routes.
- **Data/layout:** jobs, scopes, states, steps, timestamps, error categories; compact shell indicator + 360–480 px desktop panel/full mobile drawer.
- **States:** no jobs, loading, mixed partial, complete history, failed, offline, mock.
- **Security/accessibility/analytics:** owner-only; polite live region throttled to meaningful transitions; `*_generation_started/completed/failed`, `generation_cancelled`, `generation_retried` without content.
- **Acceptance:** navigation never blocked by ordinary generation; partial results usable; no invented progress.
- **Out of scope:** provider routing UI, priority controls, complex workflow visualization, background publishing.

Wireframe: [Generation status](../../wireframes/app/generation-status.md).
