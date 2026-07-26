# Security Review

## Trust boundaries

Browser input is untrusted. Server actions and routes validate with Zod, derive identity from the session, and scope resources through Project ownership. PostgreSQL is authoritative. AI output is untrusted structured text and is validated before immutable persistence. Email and AI providers receive only purpose-limited data.

## Principal threats and controls

| Threat | Control | Residual risk |
|---|---|---|
| IDOR / metadata leakage | Owner-scoped repositories and neutral not-found responses | Regression requires recurring tests |
| Credential attacks | Argon2, rate limits, database sessions, single-use reset | Credentials remain higher-maintenance than managed identity |
| Reset-token theft | Random token, digest-only storage, short expiry, session invalidation | Mailbox compromise remains external |
| XSS/generated HTML | Generated text is never trusted HTML; CSP and escaping | Inline CSP compatibility exception |
| CSRF | Auth.js protections, same-site secure cookies, server actions | Review every new mutation |
| Prompt injection | Structured contracts, no tool execution or URL fetch from content | Model can still produce inaccurate text |
| Export leakage | Ownership, selection verification, expiry, bounds, safe formats | Downloaded files leave platform control |
| CSV formula injection | Prefix formula-leading cells | Spreadsheet behavior varies |
| Secret/log leakage | Env isolation and prohibited payload logging | Vendor consoles require configuration review |
| Cost abuse | Registration control, HMAC rate limits, quotas, bounded retries | Distributed abuse needs managed edge controls later |

## Launch blockers

Complete legal/privacy review, production email/DNS, secret scan, dependency review, backup restore drill, monitoring, and production smoke tests before public launch.
