# Security and Privacy

| Threat | MVP mitigation |
|---|---|
| Broken access/IDOR | owner-scoped server queries for every resource; neutral not-found; authorization tests |
| Prompt injection | treat brief/reference text as delimited data; fixed system policy; no tool/URL execution; output validation |
| XSS/generated HTML | generated content is untrusted text; React escaping; never `dangerouslySetInnerHTML`; sanitize only if a future rich-text format is approved |
| CSRF | Auth.js cookie controls; same-origin Server Actions; validate origin/token for custom state-changing handlers |
| SSRF | no arbitrary server URL fetching in MVP; validate/allowlist future ingestion; block private networks/redirect abuse |
| Upload/malware | delay uploads; later private signed upload, MIME/signature/size, quarantine/scanning |
| Secret exposure | server-only env; secret manager; no client/provider keys in logs; scan repository/build |
| Sensitive logs | allowlisted metadata only; no briefs/prompts/content/tokens/keys |
| Provider retention | vendor DPA/settings review, disclosure, minimize transmitted context, deletion policy |
| Abuse/cost | account/IP rate limits, item/token/concurrency caps, bounded retries, usage monitoring |
| Generated claims | prompt rules, placeholders, schemas, human-review notice, regulated-category policy |
| Export leakage | reauthorize selection, project-scoped IDs, attachment headers, short-lived URLs, audit destructive/download anomalies if needed |

Use secure headers/CSP appropriate to Next.js, dependency scanning, parameterized queries, encrypted transport/managed DB encryption, least-privilege DB/worker/storage credentials, and separate environment secrets. Account/project deletion requires an approved retention contract and external-object reconciliation.

Privacy analytics use allowlisted enums/counts only. Local debug content is synthetic; production debug sampling with customer content is prohibited by default.

Phase 5 sends only the context required for the selected generation to the approved provider with storage disabled and tools/retrieval unavailable. Provider output is untrusted text. Model IDs are server-controlled, real mode fails closed without a server secret, and structural repair is limited to one schema-only attempt that may not invent facts. See [Configuration and secrets](15-configuration-and-secrets.md).
