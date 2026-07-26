# Success Metrics

## Measurement principles

- Measure a small funnel from project creation to content use before adding broad analytics.
- Separate behavioral evidence from self-reported satisfaction.
- Segment mock-mode activity from real AI generation.
- Treat proposed thresholds as **MVP targets**, not facts or published claims.
- Track events without sending raw briefs, generated copy, or secrets to analytics tools.

## MVP validation metrics

| Area | Metric and definition | Initial target hypothesis | Decision supported |
|---|---|---:|---|
| Acquisition | Qualified sign-ups from target personas / qualified landing visitors | Establish baseline; no fixed target before channel tests | Message/channel fit |
| Activation | New accounts that complete a brief, generate a Brand Profile, and complete one content module within 7 days | ≥35% | Core journey clarity |
| Time to first value | Median active elapsed time from project creation to first viewed completed content item | ≤15 minutes for a prepared user | Setup burden |
| Generation completion | Started real-mode jobs ending with valid saved output, excluding user cancellation | ≥90% | Technical and schema viability |
| Full-pack completion | Selected module packs reaching complete or acknowledged partial-complete state | ≥80% | Workflow reliability |
| Content usage | Activated projects with at least one edit, copy, calendar assignment, or export within 7 days | ≥60% | Practical usefulness |
| Retention | Activated users returning and performing a meaningful action in weeks 2–4 | ≥25% for mixed cohort; segment launch-only users | Recurring value |
| Conversion | Users exposed to a real purchase decision who pay | Measure after pricing test; target set by persona/channel | Willingness to pay |
| Satisfaction | Post-pack “How useful is this output?” 1–5 | Median ≥4 and <15% ratings ≤2 | Output usefulness |
| AI quality | Evaluated items passing factual grounding, brand consistency, structure, and channel-fit rubric | ≥80% overall; zero tolerance for critical fabricated claims in test set | Launch quality |

Targets should be revised after the first small usability cohort and recorded with cohort size and mode.

## Business metrics

- Qualified visitor-to-sign-up rate by acquisition source.
- Trial/start-to-paid conversion by persona.
- Monthly recurring revenue and new recurring revenue once recurring billing exists.
- Average revenue per paying account.
- Paid logo retention and revenue retention.
- AI cost per activated account, per completed generation job, and as a percentage of revenue.
- Support time per active account.
- Gross margin after model, hosting, storage, and payment costs.

Business metrics must exclude internal/demo accounts and identify refunds or manual plans.

## Product health metrics

### Funnel and use

- Project creation rate per new account.
- Brief completion rate and abandonment step.
- Brand Profile generation and approval/edit rate.
- Module generation mix per activated project.
- Content-item edit, regeneration, copy, calendar, and export rates.
- Projects with activity on more than one module.
- Return-to-existing-project versus create-new-project activity.

### AI output quality

- Schema validation pass rate before and after repair.
- User rating by module and project type.
- Regeneration rate and repeated-regeneration rate.
- Edit distance or proportion of fields materially edited, interpreted cautiously.
- Brand-consistency rubric score across a sampled multi-module pack.
- Factual-grounding violations and safety/policy rejection rate.

### System reliability

- Successful authentication/session rate.
- Project/brief save success rate.
- Generation queue delay and end-to-end latency at p50 and p95 by module.
- Job failure rate by safe error category and provider.
- Jobs stuck beyond a defined service threshold.
- Export success rate.
- Application error-free session rate and availability.
- Duplicate-charge/duplicate-job incidents.

## Event vocabulary recommendation

Minimum privacy-conscious events:

```text
account_created
project_created
brief_step_saved
brief_completed
brand_profile_job_started/completed/failed
module_job_started/completed/failed
content_item_viewed/edited/regenerated/copied
content_item_calendar_assigned
export_started/completed/failed
generation_mode_selected
quality_rating_submitted
```

Include account/project pseudonymous identifiers, module, mode, status, duration, and schema version where needed. Do not include generated content bodies.

## Metrics not measurable in the initial MVP

- Marketing performance lift caused by generated content without publishing/analytics integrations.
- Revenue attribution for downstream campaigns.
- Long-term annual retention or lifetime value.
- Team productivity improvements in multi-user workflows.
- Quality compared with professional agencies at representative scale.
- Number of external tools permanently replaced.
- Reliable multilingual quality across unsupported languages.
- Automated content approval or publishing success.

Use interviews, task observation, and export/use signals as interim evidence; do not represent proxies as direct business outcomes.

Related: [Value Proposition](04-value-proposition.md) and [Risks and Assumptions](11-risks-and-assumptions.md).
