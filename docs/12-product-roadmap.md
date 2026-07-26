# Product Roadmap

This roadmap is staged by evidence, not committed dates. Capabilities move forward only after the preceding exit criteria are met.

## Stage 1 — Foundation prototype

- **Objective:** Prove the information model and complete connected workflow without production AI dependency.
- **Capabilities:** Clickable/product prototype; project wizard; representative brief; schema-valid mock Brand Profile; mock website, social, ads, video, and copy outputs; project workspace; basic edit/copy; job-state simulation.
- **Exclusions:** Production authentication, real AI, billing, publishing, collaboration, production reliability.
- **Validation goal:** Users understand the one-brief model, can complete the flow, and judge outputs/organization as useful.
- **Technical implications:** Define shared terminology, module registry, output schemas, context contract, and mock adapter before provider integration.
- **Exit criteria:** Core tasks are understandable in usability sessions; required schemas cover representative outputs; major brief abandonment issues are resolved; MVP implementation scope is reconfirmed.

## Stage 2 — MVP

- **Objective:** Validate willingness to use and pay for connected brand, website, and marketing content generation.
- **Capabilities:** Everything marked Must in [MVP Scope](06-mvp-scope.md): authentication, persistent projects, guided brief, Brand Profile, required modules, overview, jobs, editing/versioning, calendar, library, copy/basic export, mock mode, and one real AI adapter.
- **Exclusions:** Final media rendering, website building/hosting, direct publishing, advanced collaboration, native apps, full analytics, marketplace, custom training, complex billing, broad integrations.
- **Validation goal:** Qualified target users reach useful output, use/export content, return, and demonstrate willingness to pay.
- **Technical implications:** Managed persistence/auth; server-side authorization; durable simple job processing; versioned schemas; provider abstraction; observability; privacy and cost controls.
- **Exit criteria:** Acceptance criteria pass; reliability and AI-quality targets are near agreed thresholds; at least one persona shows repeated meaningful use and credible paid demand; support load is manageable.

## Stage 3 — Version 1

- **Objective:** Improve retention and professional repeatability for the best-supported paying persona.
- **Capabilities:** Deeper workflows for the chosen segment; stronger onboarding; better output controls and evaluation; richer export; simple billing; project duplication/templates; limited collaboration or client sharing if validated; selected integrations; improved multilingual support if prioritized.
- **Exclusions:** Full real-time collaboration, general marketplace, custom model training, full website builder/video editor, broad publishing automation unless evidence changes priorities.
- **Validation goal:** Establish recurring use, sustainable unit economics, and a clear expansion path.
- **Technical implications:** Formal migrations and schema governance; usage metering; permission model if collaboration enters; more robust jobs; provider evaluation/routing; integration boundary; support tooling.
- **Exit criteria:** Consistent cohort retention and paid conversion; acceptable gross margin; repeatable acquisition signal; quality/support incidents under control; selected expansion capability demonstrably improves retention or revenue.

## Stage 4 — Future platform

- **Objective:** Become a governed content operating layer across teams, channels, and existing production tools.
- **Capabilities:** Advanced collaboration/approvals; brand governance; reusable campaign systems; publishing and performance integrations; richer asset generation; workflow automation; ecosystem/API; multilingual operations; performance-informed recommendations.
- **Exclusions:** Features that duplicate mature specialist editors without a clear connected-workflow advantage; uncontrolled autonomous publishing; custom model training without proven need and governance.
- **Validation goal:** Demonstrate that platform breadth increases retention, expansion revenue, and content effectiveness without weakening usability or margins.
- **Technical implications:** Organization/role model, event architecture, scalable orchestration, auditability, integration platform, regional/privacy controls, mature evaluation and cost routing.
- **Exit criteria:** Defined per investment area; each major platform capability requires evidence, an owner, operational readiness, and sustainable economics.

## Sequencing rules

1. Reliability and content usefulness precede feature breadth.
2. Strengthen shared context before adding more generators.
3. Add collaboration only for observed multi-user workflows.
4. Add publishing only when users trust outputs and request closed-loop execution.
5. Add integrations based on downstream frequency, not logo value.
6. No roadmap stage overrides the exclusions in an earlier stage without an explicit recorded decision.

Related: [MVP Scope](06-mvp-scope.md), [Success Metrics](10-success-metrics.md), and [Open Decisions](13-open-decisions.md).
