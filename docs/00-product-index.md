# Web Content Flow — Product Documentation Index

## Purpose

This documentation defines the product foundation for Web Content Flow before design or implementation. It aligns product, design, engineering, and AI work around one vocabulary, an achievable MVP, and explicit unresolved decisions.

## Recommended reading order

1. [Product Vision](01-product-vision.md) — direction, category, boundaries, and three-year ambition.
2. [Problem and Solution](02-problem-and-solution.md) — user problems, current alternatives, and solution boundaries.
3. [Target Users and Personas](03-target-users-and-personas.md) — priority users, needs, triggers, and objections.
4. [Value Proposition](04-value-proposition.md) — benefits, differentiation, and messaging hypotheses.
5. [Product Principles](05-product-principles.md) — decision rules for product, design, and engineering.
6. [MVP Scope](06-mvp-scope.md) — binding scope, acceptance criteria, and launch constraints.
7. [User Journeys](07-user-journeys.md) — expected end-to-end behavior and recovery paths.
8. [Information Architecture](08-information-architecture.md) — navigation, workspace hierarchy, and URLs.
9. [Functional Modules](09-functional-modules.md) — module-level product requirements.
10. [Success Metrics](10-success-metrics.md) — validation, business, quality, and reliability measures.
11. [Risks and Assumptions](11-risks-and-assumptions.md) — risks, mitigations, and testable assumptions.
12. [Product Roadmap](12-product-roadmap.md) — staged evolution without calendar commitments.
13. [Open Decisions](13-open-decisions.md) — unresolved choices and decision deadlines.

## Authority and precedence

- The supplied product concept, terminology, and product principles are approved facts for this foundation.
- [MVP Scope](06-mvp-scope.md) is authoritative for what must and must not be built for MVP.
- [Product Principles](05-product-principles.md) is authoritative when evaluating product and experience trade-offs.
- [Functional Modules](09-functional-modules.md) is authoritative for module behavior, subject to MVP scope.
- [User Journeys](07-user-journeys.md) is authoritative for end-to-end experience and recovery behavior.
- [Open Decisions](13-open-decisions.md) is authoritative for unresolved choices; recommendations there are not final decisions.
- If documents conflict, MVP Scope takes precedence for delivery, then Product Principles, then Functional Modules and User Journeys. Record and resolve the conflict rather than silently choosing.

## Decision recording

New product decisions must be added to [Open Decisions](13-open-decisions.md) with owner, criteria, deadline, and status. Once approved, move the conclusion into the relevant authoritative document and retain a short decision record in `13-open-decisions.md` containing the decision, date, rationale, and affected documents. Scope additions must update the MoSCoW table, roadmap, risks, and affected journeys/modules in the same change.

## Terminology

- **Project:** the workspace for one customer business, brand, product, service, or campaign.
- **Brand Profile:** the shared brand context inherited by every generation module.
- **Generation job:** an asynchronous content-generation operation.
- **Content item:** one generated output, such as a post, page section, advertisement, or script.
- **Mock mode:** deterministic or fixture-based generation that requires no external AI API key.

## Document status

All documents in this index are **Foundation v1 recommendations** unless a section is explicitly labeled as fact, hypothesis, or unresolved decision. They describe intended behavior; they do not imply that the product, users, integrations, or revenue already exist.
