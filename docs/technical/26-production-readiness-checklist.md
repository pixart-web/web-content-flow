# Production Readiness Checklist

States: **Done**, **Blocked**, or **Not applicable**. Evidence must be a durable URL, log, command output, or approved document. “Planned” is not evidence.

| Area | Check | State | Owner | Evidence / blocker |
|---|---|---:|---|---|
| Scope | Phase 6 adds no new generation module | Done | Engineering | Phase 6 implementation record |
| Build | Frozen install, format, lint, types, unit, integration, worker, build, E2E pass | Blocked | Engineering | Attach CI run before release |
| Database | Production migration reviewed and backup taken | Blocked | Engineering/Ops | Provider not selected |
| Restore | Restore drill completed against non-production database | Blocked | Ops | Managed backup provider not selected |
| Auth | Reset email, expiry, single-use, session invalidation tested | Done | Engineering | Automated email/auth tests |
| Email | Sender domain SPF, DKIM, DMARC and delivery verified | Blocked | Ops | Provider/domain configuration required |
| Registration | Rollout and registration flags set deliberately | Done | Product/Ops | Environment contract |
| Legal | Privacy and Terms approved for launch jurisdictions | Blocked | Legal/Product | Current pages are labelled drafts |
| Privacy | Data inventory, retention, provider terms approved | Blocked | Legal/Security | Provider selection unresolved |
| Security | Headers, rate limits, ownership and export leakage checked | Done | Security/Engineering | Automated tests and security review |
| Secrets | Repository and image scanned; secrets stored in platform vault | Blocked | Ops | Run against release commit/environment |
| Exports | Owner scope, formula injection, expiry and size bounds verified | Done | Engineering | Export tests |
| Health | `/health/live` and `/health/ready` monitored separately | Done | Engineering | Implemented endpoints |
| Monitoring | Alert routing and error tracker configured | Blocked | Ops | Vendor not selected |
| Worker | One worker deployed, graceful shutdown and heartbeat verified | Blocked | Ops | Deployment target not selected |
| Maintenance | Scheduled maintenance command configured and monitored | Blocked | Ops | Scheduler not selected |
| Accessibility | Keyboard/mobile/browser smoke audit completed | Blocked | Design/QA | Requires release candidate |
| Performance | Public and core authenticated journeys meet agreed budgets | Blocked | Engineering | Requires deployed preview evidence |
| SEO | Public metadata, robots and sitemap inspected on production domain | Done | Engineering | Implemented; domain verification pending |
| Support | Support mailbox staffed with response ownership | Blocked | Product/Ops | Mailbox owner/SLA required |
| Rollback | Previous app release and compatible database recovery rehearsed | Blocked | Ops | Hosting provider not selected |
| Smoke | Production checklist completed after deployment | Blocked | Engineering/Ops | See operations smoke test |

## Launch recommendation

**Not ready for public production.** The repository is suitable for staging and controlled internal validation. Public launch is blocked by external operational and legal evidence, not by a claim that unfinished work is complete.

Review before every release and link the release evidence from [Release Management](24-release-management.md).
