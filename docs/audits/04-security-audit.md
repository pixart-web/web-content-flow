# Security Audit

## Authentication

| Control | Evidence | Result |
|---|---|---|
| Password hashing | Argon2id options in auth/settings/reset | PASS |
| Email normalization | trim/lowercase in credentials/reset request | PASS |
| Database sessions | random 32-byte token, expiry, HTTP-only, Lax, Secure in production | PASS |
| Session invalidation | reset/change delete all user sessions | PASS |
| Reset storage | SHA-256 token digest, unique, 30-minute expiry, single-use update | PASS |
| Redirect safety | only relative `/app...`, rejects `//` | PASS |
| Brute force | DB rate buckets with HMAC identities | PASS WITH operational scaling unverified |
| Neutral reset | same response for missing/delivery failure | PASS |
| Neutral registration | duplicate says “Try signing in” | FAIL — AUD-008 |
| Verification | not enabled; rollout can restrict registration | ACCEPTED/UNRESOLVED |
| Account deletion | disabled and disclosed | UNRESOLVED — AUD-013 |

Auth.js supplies adapter/session reading, while credentials registration/sign-in and session cookies are implemented directly. No social provider buttons are exposed.

## Authorization

Project and content repositories derive ownership from the authenticated user. Generic item routes validate project, module, and item together. Export creation and download require session user, project ownership, selected item membership, export requester, status, and expiry. Integration/E2E tests verify representative project/content cross-user denial.

Coverage gaps remain for direct automated tampering of Brand Profile version IDs, job IDs, Calendar source IDs, usage records, reset records, and exports. Static service review found owner constraints in the relevant paths; missing tests are not proof of absence.

## Secrets and cryptography

- No real key/private key/credential was detected.
- Pattern matches were `.env.example`, CI/test credentials, and synthetic placeholders.
- Audit build sentinels and server env names were absent from `.next/static`.
- Reset/session tokens use cryptographic randomness.
- Provider request IDs are hashed before persistence.
- HMAC rate-limit fallback to `AUTH_SECRET` is allowed outside production; production requires a separate secret.

CI has no dedicated secret-scanning tool or history scan. The audit scan covered the current tree/build, not deleted Git history or hosted CI logs.

## Injection and unsafe execution

| Vector | Result |
|---|---|
| SQL injection | parameterized Prisma tagged raw SQL; no application `*RawUnsafe` |
| XSS | generated content rendered as text; no `dangerouslySetInnerHTML` |
| SSRF | no user-controlled fetch; only fixed Resend URL |
| Command injection | no application `child_process`; operational package scripts are fixed |
| Path traversal | export filenames sanitized; no user-selected filesystem paths |
| CSV injection | leading `= + - @` prefixed, values quoted |
| Open redirect | internal allowlist |
| Prototype/mass assignment | strict Zod objects and explicit data mapping |
| Generated keys | application assigns canonical IDs; model output schemas use bounded stable child IDs |

Prompt injection cannot enable tools, select another project/model, bypass owner queries, or bypass schema persistence. User content is serialized under `untrustedGenerationContext`. It can still influence generated text and factual accuracy; human review remains required.

## AI/provider security

Positive controls:

- OpenAI module is server-only;
- model policy is server-resolved;
- `store: false`;
- strict structured output and second Zod parse;
- no tools, browsing, URL fetch, or hidden-reasoning request;
- AbortController timeout and SDK retries disabled;
- safe error mapping and hashed request IDs;
- prompts/outputs absent from logging/analytics;
- fake provider in CI.

Findings:

- prompt registry bypass (AUD-006);
- retryable errors terminal (AUD-002);
- lease loss can overlap provider calls (AUD-001);
- rate-limit headers are not parsed into `retryAfterMs`;
- “repair” regenerates from context instead of repairing captured invalid output.

## Headers

Observed on production runtime:

- CSP with `default-src`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`;
- HSTS one year with subdomains;
- `nosniff`;
- strict-origin-when-cross-origin;
- restrictive Permissions-Policy;
- COOP/CORP same-origin;
- X-Frame-Options DENY;
- private app `Cache-Control: private, no-store` and noindex.

`unsafe-inline` remains for scripts/styles (AUD-010). Development alone adds `unsafe-eval`. CORS is not broadly enabled.

## Exports and storage

Exports are private expiring PostgreSQL blobs, not public object storage. The service validates production snapshots before formatting, caps 50 items and bytes, stores checksum/MIME, uses server filenames, and denies foreign/expired downloads. Manual audit confirmed owner access and foreign/expired denial.

There is no storage provider abstraction because uploads/large archives are absent. This is coherent with MVP scope. Canonical content remains PostgreSQL data.

## Email

Only reset/password-change transactional templates exist. URLs must be HTTPS or localhost, HTML contains no user content, provider endpoint is fixed, network has a 10-second timeout, and CI uses mock email. Production sender/domain/delivery/bounce monitoring is unverified. See AUD-007 and AUD-009.

## Dependencies

`pnpm audit --prod` returned no known vulnerabilities. Lockfile/frozen install passed. The application uses a beta Auth.js version, which increases upgrade/compatibility risk but no concrete vulnerability was identified. Licence inventory failed (AUD-015). No major dependency upgrade was performed.

## Privacy

The draft notice accurately states stored identity/project/version/usage/export data and AI transfer. Analytics currently has an allowlist but no vendor adapter. No content logging call was found. Account deletion, final retention, subprocessor inventory, provider terms, and legal approval remain unresolved.

## OWASP summary

| Risk | Assessment |
|---|---|
| Broken access control | representative controls pass; expand negative coverage |
| Cryptographic/auth failures | strong local controls; enumeration/delivery gaps |
| Injection/XSS/SSRF | no confirmed exploitable path |
| Insecure design | lease fencing and prompt authority are material |
| Misconfiguration | readiness migration false-positive; CSP exception |
| Vulnerable components | no known advisory; licence unverified |
| Integrity failures | migrations/drift pass; CI lacks SBOM/secret/drift gates |
| Logging/monitoring | no sensitive logging, but insufficient production detection |

## Unresolved threats

Public/controlled use requires remediation of AUD-001/002/004/006, operational evidence under AUD-003, and expanded CI under AUD-005. Public registration additionally requires AUD-008, legal approval, and a reviewed CSP/noindex position.

