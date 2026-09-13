# Product Data Inventory

This is a factual review aid, not legal advice.

| Area | Data / purpose | Status | Decision needed |
|---|---|---|---|
| Accounts | Name, email, password hash, sessions | Implemented | Retention and minimum age |
| Password recovery | Email, one-time token digest, expiry | Implemented; delivery externally unverified | Sender/legal notices |
| Projects and Briefs | Business strategy, audience, references | Implemented | Content restrictions and retention |
| Brand Profile | Structured strategy and immutable versions | Implemented | Customer IP terms |
| Generated content | Structured drafts, versions, provenance | Implemented | IP allocation and provider role |
| AI provider | Necessary Brief/Profile/request context | Configured but real use disabled by default | DPA, transfer basis, retention |
| Usage records | Token/cost/job metadata without content | Implemented | Retention |
| Beta interest | Name, email, company/project, role, challenge, tools, usage range, consent time | Implemented | Legal basis and retention |
| Exports | Selected content, temporary database bytes | Implemented | Retention confirmation |
| Logs | Request/job/error metadata; content prohibited | Implemented locally | External retention |
| Monitoring | Health/log/alert metadata | Planned, not provisioned | Provider configuration |
| Backups | Managed PostgreSQL snapshots/PITR | Planned, not provisioned | Retention/location |
| Cookies | Necessary session cookies | Implemented | Jurisdiction review |
| Analytics | No provider | Disabled | Consent model before activation |
| Email | Transactional password recovery | Adapter implemented; provider unconfigured | DPA and sender setup |
| Deletion | Reviewed support process; self-service disabled | Requires legal decision | Scope, delay, exceptions |
