# Proposed Processor Register

No DPA or provider provisioning is claimed.

| Provider | Purpose / data | Status | Potential location | DPA / retention | Open questions |
|---|---|---|---|---|---|
| Render | Web/worker runtime, PostgreSQL, account/project/content data | Selected, not provisioned | Frankfurt configuration proposed; provider subprocessors may be global | Not signed; retention unconfigured | Entity, transfer terms, backup location |
| Resend | Transactional recipient, subject and recovery link | Selected, not configured | Unknown pending contract review | Not signed; retention unconfigured | EU routing, event retention, suppression data |
| Better Stack | Operational logs, uptime, alert metadata; content prohibited | Selected, not configured | Unknown pending account selection | Not signed; retention unconfigured | Region, log retention, alert recipients |
| Cloudflare | DNS/TLS and potentially network metadata | Selected, DNS unconfigured | Global network | Not signed/reviewed | Proxy mode, logs, transfer mechanism |
| OpenAI | Necessary project context and structured generated result | Adapter implemented; real generation disabled | Depends on approved account/terms | Not reviewed/signed | Controller/processor role, retention, region, opt-out settings |
