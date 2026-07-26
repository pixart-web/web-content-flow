# MVP Scope

## MVP objective

Validate whether freelancers, entrepreneurs, and small agencies will pay for a workspace that converts one guided brief into a consistent Brand Profile, website copy, and ready-to-use marketing content.

The MVP must prove the connected workflow, not broad automation or production tooling.

## Required capabilities

- Account creation and sign-in.
- Project creation, draft saving, and guided briefing.
- Brand Profile generation, editing, and shared-context use.
- Selection and generation of required content modules.
- Project Overview and module navigation.
- Asynchronous generation-job states and recovery.
- Structured content-item storage and rendering.
- Item editing, copying, regeneration, and basic version history.
- Basic content calendar and asset/content library.
- Basic export.
- Mock mode with no AI API key.
- Provider-neutral AI service layer ready for one real provider integration.

## In-scope features

1. Email/password or managed authentication with password recovery as supported by the chosen provider.
2. Dashboard listing projects, status, last activity, and new-project action.
3. Multi-step project wizard covering the fields defined in [Functional Modules](09-functional-modules.md).
4. Central editable project brief with required/optional validation.
5. Structured Brand Profile with all specified sections.
6. Project Overview showing brief, Brand Profile, selected modules, job status, and recent items.
7. Website structure and copy.
8. Social media content.
9. Advertisements and creative concepts.
10. Video and Reel scripts.
11. General copy templates.
12. Basic manually adjustable content calendar populated from generated items.
13. Search/filter-light asset and content library for project outputs.
14. Manual editing, item-level regeneration, and versions.
15. Clipboard copy plus basic Markdown, plain-text, or JSON export; final export priority remains open.
16. Mock and real generation adapters behind the same interface.
17. Basic settings for account, generation mode, and provider key/configuration if user-supplied keys are adopted.

## Out of scope

- Final AI video rendering or professional image editing.
- Drag-and-drop website building, hosting, or full Webflow replacement.
- Automatic social or advertising publishing.
- Advanced collaboration, approval portals, granular roles, or real-time editing.
- Native mobile applications.
- Full analytics or attribution.
- Marketplace, custom model training, or advanced workflow automation.
- Complex billing, enterprise procurement, or usage reconciliation. A simple plan gate may be added only if required for paid validation.
- Broad third-party integrations.
- Full localization of the interface or guaranteed multilingual quality.

## MoSCoW priorities

| Priority | Capability | Rationale |
|---|---|---|
| Must | Authentication, dashboard, project CRUD | Required persistent user workflow |
| Must | Guided brief and editable Brand Profile | Core source-of-truth promise |
| Must | Website, social, ads/concepts, video/Reels, and general copy generation | Required hypothesis coverage |
| Must | Generation-job lifecycle, mock adapter, one real adapter boundary | Reliable implementation and evaluation |
| Must | Structured outputs, editing, item regeneration, copy, basic versions | User control and usefulness |
| Must | Project Overview, basic calendar, content/asset library | Connected workspace and organization |
| Must | Basic export | Deliverable portability |
| Should | Brief autosave, job retry, library filters, export selection | Reduces data loss and improves regular use |
| Should | Brand Profile completeness guidance and content provenance | Improves trust and consistency |
| Could | Project duplication, limited onboarding checklist, shareable read-only export | Useful after core flow is stable |
| Won't | Publishing, website builder, video rendering, advanced collaboration, native apps | Explicitly outside MVP hypothesis |

## MVP acceptance criteria

The MVP is acceptable when a test user can:

1. Register, sign in, and create a project.
2. Complete and later edit the required brief fields.
3. Generate a complete, editable Brand Profile in mock mode and through the configured real AI adapter.
4. Generate every selected required module using the same Brand Profile context.
5. Leave and return without losing completed content or visible job state.
6. Edit a content item and retain its prior version.
7. Regenerate one item without changing unrelated items.
8. Copy an item and export selected project content in at least one structured, usable format.
9. Observe clear empty, loading, success, and error states for all generation modules.
10. Complete the core journey without an AI API key in mock mode.

## Definition of done

- Acceptance criteria pass in supported desktop browsers and a functional mobile web layout.
- Core journeys have automated happy-path coverage where practical and manual recovery-path checks.
- Generation schemas validate before completed content is persisted.
- Authorization prevents cross-account project access.
- Sensitive configuration is not exposed to the client or routine logs.
- Error monitoring and basic product events support the metrics in [Success Metrics](10-success-metrics.md).
- Seed/demo data and mock generation are clearly labeled.
- Accessibility basics cover keyboard use, labels, focus, contrast, and error association.
- Documentation reflects delivered behavior and known limitations.

## Launch constraints

- Solo developer using AI-assisted development.
- Light-mode web application first; dark mode only prepared at token/architecture level.
- One deployment region and one primary application language initially, unless validation changes the decision.
- One real text-generation provider at launch, with a mock adapter and replaceable boundary.
- Concurrency and output limits protect cost and reliability.
- Human review is required; no automatic publishing.
- Simple operational support and manual account intervention are acceptable during validation.

## Dependencies

- Decisions on database, authentication, hosting, AI provider, background jobs, and export format.
- Generation schemas and prompt/context contracts for each module.
- Privacy terms, acceptable-use rules, retention policy, and provider data-processing review.
- Error monitoring, product analytics, and AI cost tracking.
- A realistic evaluation set spanning target personas and project types.

## Solo-developer feasibility guardrails

- Implement modules through shared primitives: module definition, schema, generation-job lifecycle, item editor, and export renderer.
- Use managed authentication, database, storage, and deployment where reasonable.
- Keep calendar to organization and manual date changes; no scheduling integration.
- Keep the library project-scoped with basic filtering; no digital asset management system.
- Keep versions item-scoped and simple; no branching, merging, or multiplayer conflict resolution.
- Integrate one real provider only; validate abstraction through mock mode, not multiple production providers.
- Use sequential or modestly parallel module jobs with explicit limits rather than complex orchestration.

Related: [User Journeys](07-user-journeys.md), [Functional Modules](09-functional-modules.md), and [Open Decisions](13-open-decisions.md).
