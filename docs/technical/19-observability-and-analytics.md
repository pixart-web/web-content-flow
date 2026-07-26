# Observability and Analytics

Emit JSON structured logs with timestamp, level, service/runtime, environment, requestId, route template, user/project pseudonymous IDs when necessary, jobId, module, operation, duration, status, safe error code, attempt, provider/model identifiers, token counts/cost estimate. Centralize redaction and allowlists.

Never log full briefs, rendered prompts with customer content, generated/edited content, secrets, API keys, cookies/session tokens, auth credentials, raw provider request/response, or export bodies. Controlled local debug may use synthetic UrbanStride fixtures only.

Metrics: request latency/error, DB pool/query timing, job queue depth/age/lease expiry, generation latency/success/partial/failure/validation failure/retries, AI input/output tokens and estimated cost, export success/size, polling volume. Correlate request → command/job → provider via requestId/jobId without content.

Implement the event allowlist from [UX Analytics](../ux/26-analytics-events.md); server emits durable outcome events, client emits safe view/interaction events. Analytics failure is nonblocking and environments/internal accounts are identified safely.

Alerts: stuck/oldest queued jobs, elevated terminal failures, repeated authorization denial pattern, cost ceiling, DB availability, worker heartbeat, export/storage errors. Vendor remains unresolved; schemas remain portable.

Phase 5 additionally records normalized provider error codes, model tier, prompt key/version, generation purpose, provider attempts, repair state, usage source, reservation state, and safe hashed provider-request identity. Analytics may emit generation started/completed/failed, quota blocked, and repair attempted/completed/failed with opaque IDs and enums only. Prompt text, snapshots, titles, field values, and raw provider IDs remain prohibited.
