# Open Decisions

All entries are unresolved. “Current recommendation” guides reversible foundation work but is not approval. Decision timing is expressed relative to delivery stages in [Product Roadmap](12-product-roadmap.md).

| Decision | Current recommendation | Alternatives | Decision criteria | Required by | Cost of delay |
|---|---|---|---|---|---|
| First paying persona | Test freelance marketers first, with entrepreneurs as a parallel comparison | Small agencies; e-commerce managers; creators/startup teams | Pain frequency, activation, recurring use, willingness to pay, reachable acquisition | Before pricing and MVP acquisition focus | Diffuse messaging, conflicting workflows, weak retention interpretation |
| Final pricing model | Simple recurring individual plan with clear generation allowance; manual test before complex billing | Project pass; credits; usage-based; tiered seats | Purchase behavior, recurring frequency, AI cost, predictability, support burden | Before paid MVP validation | Cannot test willingness to pay; architecture can remain simple temporarily |
| Free trial or freemium | Time- or generation-limited trial, not permanent freemium | Freemium; paid-only; money-back pilot | Activation time, AI cost, abuse risk, conversion | Before self-serve paid launch | Blocks acquisition experiment design; no need to block prototype |
| AI provider strategy | One production text provider behind a provider-neutral service plus mock adapter | Multi-provider routing; user-selected provider; BYOK only | Structured quality, latency, cost, privacy, availability, SDK stability | Before real-mode MVP implementation | Blocks real integration and quality evaluation |
| Image-generation provider | No rendered image generation in MVP; generate reusable prompts only | Integrate one provider in V1; user BYOK; multiple providers | Persona demand, rights/terms, quality, cost, moderation, asset storage | Before image rendering enters scope | Low for MVP; avoid premature integration |
| Database provider | Managed relational database with transactional support and JSON where useful | Serverless SQL; managed PostgreSQL variants; document database | Solo operations, migrations, auth/job fit, backups, region, cost | Before persistence implementation | Blocks data model and deployment |
| Authentication provider | Managed authentication integrated with server-side authorization | Application-managed auth; database-platform auth; specialist auth vendor | Security, recovery flows, cost, framework fit, lock-in, future organizations | Before authentication implementation | Blocks protected application testing |
| Background job architecture | Simple managed queue/worker or database-backed durable job mechanism with bounded retries | Serverless workflow; dedicated queue; synchronous-only generation | Maximum execution time, durability, observability, cost, local development | Before real generation jobs | Blocks reliable generation; wrong choice raises operations burden |
| Collaboration model | Single-user account for MVP; research lightweight project sharing for V1 | Multi-seat workspace; client viewer; comments/approvals; real-time editing | Agency demand, permission needs, support/security complexity | Before V1 collaboration design | Low for MVP; higher if agency becomes first persona |
| Export priorities | Ship copy plus one structured human-readable export; choose exact format via workflow tests | Markdown, DOCX, PDF, CSV, JSON, ZIP bundle | Downstream tools, formatting fidelity, implementation cost, client delivery needs | Before MVP export implementation | Risk of building low-use formats or blocking handoff |
| Supported languages | English interface first; project output language field, with non-English output labeled best effort until evaluated | Selected languages; full localization; English-only output | Target markets, provider quality, support, evaluation ability | Before public launch messaging | Ambiguous expectations and quality risk |
| Website publishing capabilities | Keep outside MVP; export structured copy for existing builders | HTML export; CMS integration; hosted pages; visual builder | User demand, differentiation, maintenance/security, SEO needs | Before V1 website investment | Low now; premature work could overwhelm scope |
| Social publishing capabilities | Keep outside MVP; calendar is planning only | Scheduler integrations; native publishing; export to scheduler | Recurring demand, API/platform policy, reliability, support burden | Before V1 integration roadmap | Low now; unclear messaging if left undefined |
| Provider key ownership | Prefer platform-managed key with strict allowances if economics permit | BYOK; hybrid; enterprise-managed key | Onboarding friction, margin, security, provider terms, abuse | Before real-mode public access | Blocks settings/security design and cost controls |
| Brand Profile approval behavior | Allow generation after profile creation with visible current version; explicit “approved” status is guidance, not a hard gate | Hard approval gate; automatic use; per-job profile choice | Speed, trust, confusion after edits, agency governance needs | Before Brand Profile implementation | Rework in job/context UX if delayed too long |
| Brief minimum required fields | Require identity, business/offer, audience, problem/value, objective/action, tone, language, and module selection | Fewer fields with inference; longer mandatory brief | Completion rate versus output quality | During foundation prototype | Directly affects activation and quality |
| Content version depth | Item-level snapshots with restore | Full diff; limited last version; event-sourced history | User recovery need, storage, UI complexity, audit requirements | Before editing implementation | Data model rework if postponed |
| Analytics and error tooling | Use privacy-conscious product events plus application/job monitoring | Self-hosted analytics; managed tools; logs only | Data residency, content privacy, solo operations, cost | Before closed MVP cohort | Weak evidence and slower incident diagnosis |
| Data retention and deletion | Define explicit account/project deletion and vendor retention before public real-mode use | Fixed retention; user-configurable; minimal/no prompt retention | Legal basis, vendor behavior, recovery needs, user trust | Before external real-mode testing | Privacy/compliance exposure |
| Content safety and regulated categories | General business use with prohibited/high-risk claim rules and human-review requirement | Exclude industries; enhanced vertical rules; broad allowance | Legal risk, provider policy, target persona needs, review capability | Before public real-mode access | Safety incidents and unclear support policy |

## Decision record template

When resolved, retain the entry below the open table in this form:

```text
Decision:
Status: Decided
Decision date:
Owner:
Choice:
Rationale and evidence:
Consequences:
Documents updated:
Review trigger:
```

## Immediate decision order

1. First prototype audience and brief minimum fields.
2. Database and authentication providers.
3. AI provider, key ownership, and background job architecture.
4. Export format and Brand Profile approval/version behavior.
5. Analytics, privacy retention, and safety policy before external real-mode testing.
6. Pricing/trial immediately before paid validation.

Related: [MVP Scope](06-mvp-scope.md), [Risks and Assumptions](11-risks-and-assumptions.md), and [Product Roadmap](12-product-roadmap.md).
