# Risks and Assumptions

Probability and impact use Low (L), Medium (M), and High (H) ratings for the pre-MVP stage. Owner type identifies responsibility, not a named person.

## Risk register

| Category / risk | Prob. | Impact | Mitigation | Validation method | Owner type |
|---|:---:|:---:|---|---|---|
| Market: users prefer existing tool combinations | H | H | Focus on connected workflow; test replacement and complement behavior | Problem interviews, prototype tests, paid smoke test | Product |
| Market: target audience is too broad | H | H | Select first paying persona using acquisition, activation, retention, and willingness-to-pay evidence | Segmented cohorts and pricing interviews | Product/Growth |
| Product: long brief causes abandonment | H | H | Progressive steps, saved drafts, essential fields first, examples | Funnel by step and usability sessions | Product/Design |
| Product: Brand Profile edits do not propagate clearly | M | H | Version provenance and explicit future-generation behavior | Task tests and support/error review | Product/Engineering |
| Product: required module breadth produces shallow experiences | H | H | Shared primitives, constrained schemas, minimum useful output per module | Acceptance tests and module quality rubric | Product/Engineering |
| Technical: asynchronous jobs become operationally complex | M | H | Use managed/simple queue, durable states, bounded retry, idempotency | Failure injection and stuck-job monitoring | Engineering |
| Technical: provider coupling blocks changes | M | M | Provider-neutral interface, normalized schemas, mock adapter | Adapter contract tests | Engineering |
| Technical: authorization exposes another project | L | H | Server-side ownership checks on every project resource | Automated authorization tests and security review | Engineering/Security |
| AI quality: generic or inconsistent output | H | H | Strong Brand Profile, context composition, schemas, evaluation set, item feedback | Cross-module rubric and user ratings | AI/Product |
| AI quality: fabricated claims or facts | M | H | Separate facts from recommendations, prompt constraints, placeholders, human-review notice | Grounding test set and incident review | AI/Product |
| AI quality: invalid structured responses | H | M | Schema validation, constrained output, bounded repair/retry | Validation/repair telemetry | AI/Engineering |
| Cost: full packs create unsustainable model spend | M | H | Output/concurrency limits, cost logging, efficient model routing later, clear allowance | Cost per activated project and stress scenarios | Product/Engineering/Finance |
| Cost: retries duplicate provider charges | M | M | Idempotent submission, retry limits, clear job state | Billing/log reconciliation | Engineering |
| Privacy: sensitive client/business data reaches vendors | M | H | Data minimization, vendor review, retention controls, disclosure, no raw analytics | Privacy review and data-flow audit | Product/Legal/Engineering |
| Privacy: user-supplied API keys leak | L | H | Prefer server-managed keys initially or encrypt BYOK; never log/display secrets | Secret scanning and security tests | Engineering/Security |
| Copyright: generated content resembles protected work | M | H | Terms, user review, avoid imitation prompts, provider safeguards, complaint process | Legal review and incident tracking | Legal/Product |
| Copyright: reference inputs lack permission | M | H | Clear user responsibility, limited ingestion, provenance where possible | UX/terms review and support cases | Legal/Product |
| Operational: solo developer cannot support broad MVP | H | H | Managed services, scope guardrails, mock mode, simple operations | Delivery review and incident load | Product/Engineering |
| Operational: provider outage blocks demonstrations | M | M | Mock mode, clear degradation, retry later | Outage drill | Engineering |
| Scope: publishing/collaboration enters MVP | H | H | Enforce [MVP Scope](06-mvp-scope.md) and decision log | Scope review per milestone | Product |
| Scope: complex billing delays validation | M | M | Manual/simple plan gate until demand is proven | Delivery dependency review | Product/Engineering |
| Trust: mock output is confused with live AI | M | M | Persistent mock labels and separate telemetry | Usability test | Product/Design |
| Compliance: unsupported regulated claims are generated | M | H | Prohibit unsupported claims, human-review warnings, acceptable-use policy | Red-team prompts and incident review | Legal/AI/Product |

## Assumptions table

| Assumption | Type | Evidence now | How to test | Falsification signal |
|---|---|---|---|---|
| One brief can supply enough context for useful first drafts | Product | Product hypothesis only | Observe 10–15 guided tasks across personas | Most users must add extensive context in every module |
| A generated Brand Profile improves cross-channel consistency | AI/Product | Architectural rationale only | Blind compare connected pack with independent prompts | Reviewers find no meaningful consistency difference |
| Users want structured items more than chat transcripts | Product | Inferred from workflow problems | Prototype comparison and usage events | Users repeatedly export to chat/doc before editing |
| Freelancers or entrepreneurs can be the first paying segment | Market | Initial targeting hypothesis | Segment acquisition and paid tests | Low activation or willingness to pay despite qualified demand |
| Website, social, and ads create the core value bundle | Market | MVP hypothesis | Module selection and usage analysis | Other modules dominate value or bundle feels excessive |
| Item-level regeneration reduces rework | Product | Principle-based recommendation | Measure use and satisfaction after regeneration | Users regenerate full packs or abandon items instead |
| One real text provider is sufficient for MVP | Technical | Scope recommendation | Quality/cost evaluation against rubric | Provider cannot meet structured quality, policy, or cost needs |
| Managed infrastructure is adequate at MVP scale | Technical | Standard solo-development assumption | Load/failure tests and operational monitoring | Reliability limits appear within validation cohort |
| Users accept human review before publishing | Product | Product boundary | Interviews and task tests | Direct publishing is a consistent purchase blocker |
| Basic copy/export supports handoff | Product | Scope assumption | Observe downstream workflows | Users cannot deliver work without manual restructuring |
| Recurring use exists beyond a one-time launch | Business | Unvalidated | 4–8 week cohort behavior and interviews | Strong activation followed by no project/content return |
| English-first interface is acceptable for initial validation | Market | Recommendation only | Recruit target cohort and track language requests | Qualified users cannot evaluate or buy without localization |
| Mock mode accurately exercises application behavior | Technical | Design intent | Contract tests shared by mock and real adapters | Mock succeeds while real lifecycle regularly breaks |

## Review cadence

Review high-probability/high-impact risks at each delivery milestone. Update assumptions when evidence arrives; do not convert an assumption to fact based on a single interview. Material changes should update [Open Decisions](13-open-decisions.md), [MVP Scope](06-mvp-scope.md), and [Success Metrics](10-success-metrics.md) together.
