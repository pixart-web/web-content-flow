# Product Principles

These rules apply to product, design, engineering, and AI behavior. Exceptions require an explicit entry in [Open Decisions](13-open-decisions.md).

## 1. One source of truth

- **Meaning:** Each project has one versioned Brand Profile that defines shared context.
- **Practical application:** Every generation job references the current Brand Profile version; users see when content was created from an older version.
- **Positive example:** Updating the primary call to action affects future social, website, and advertising generation.
- **Anti-pattern:** Each module stores an independent tone-of-voice field with conflicting values.
- **Design implication:** Brand Profile is a first-class workspace section with clear status and edit controls.
- **Engineering implication:** Shared context is referenced centrally and composed through one generation service, not duplicated in module code.

## 2. Outcomes over tools

- **Meaning:** Users choose goals and deliverables, not models or prompt mechanics.
- **Practical application:** Offer “Build a website” or “Plan a month of content,” with advanced controls revealed only when relevant.
- **Positive example:** The wizard recommends modules based on the project objective.
- **Anti-pattern:** The primary action asks users to choose a model, temperature, and token count.
- **Design implication:** Navigation and calls to action use user outcomes and content types.
- **Engineering implication:** Provider settings remain behind service abstractions and administrative configuration.

## 3. Connected generation

- **Meaning:** Outputs across modules must express one strategy while respecting channel format.
- **Practical application:** Generation context includes common key messages and module-specific constraints.
- **Positive example:** A Reel hook and landing-page headline express the same promise in format-appropriate language.
- **Anti-pattern:** “Consistency” means copying identical text to every channel.
- **Design implication:** Show shared source context and cross-links between campaign items.
- **Engineering implication:** Use common context assembly, schemas, and evaluation checks across adapters.

## 4. User control

- **Meaning:** AI proposes; the user owns review and change decisions.
- **Practical application:** Every content item supports edit, copy, regenerate, and version history.
- **Positive example:** A user regenerates one advertisement variation while preserving manual edits elsewhere.
- **Anti-pattern:** Full-project regeneration silently replaces accepted content.
- **Design implication:** Destructive replacement requires warning; version restoration is discoverable.
- **Engineering implication:** Store immutable versions or change snapshots and preserve provenance.

## 5. Progressive complexity

- **Meaning:** The default path is short; optional control appears in context.
- **Practical application:** The brief asks essential questions first and groups optional references and constraints.
- **Positive example:** New users generate with recommended defaults; experienced users expand channel settings.
- **Anti-pattern:** A single long form exposes every module field before a project can be created.
- **Design implication:** Use steps, summaries, defaults, and expandable advanced settings.
- **Engineering implication:** Define safe defaults and allow partial drafts without corrupting project state.

## 6. Structured outputs

- **Meaning:** Generated results conform to validated content-type structures.
- **Practical application:** A social post contains platform, objective, caption, call to action, and optional hashtags as separate fields.
- **Positive example:** Invalid output is repaired or fails visibly before being saved as complete.
- **Anti-pattern:** Store a long Markdown response and parse headings in the interface.
- **Design implication:** Render fields with content-appropriate controls rather than a generic transcript.
- **Engineering implication:** Use schemas, validation, versioned contracts, and provider-response normalization.

## 7. Commercial usefulness

- **Meaning:** Outputs must fit a real production or client-delivery task.
- **Practical application:** Each module provides appropriate formats, labels, variants, and export structure.
- **Positive example:** Website output separates navigation, page purpose, sections, headlines, body copy, and calls to action.
- **Anti-pattern:** Generate inspirational paragraphs without channel constraints or actionability.
- **Design implication:** Preview content in realistic structures while keeping it easy to edit.
- **Engineering implication:** Test representative schemas and quality rubrics, not only request success.

## 8. Modular architecture

- **Meaning:** Modules share project context but can generate, fail, and evolve independently.
- **Practical application:** A failed video-script job does not block completed website content.
- **Positive example:** A new module consumes the shared context contract and implements its own output schema.
- **Anti-pattern:** One monolithic prompt generates and replaces the entire project.
- **Design implication:** Workspace modules have independent status, actions, and empty states.
- **Engineering implication:** Separate module definitions and generation jobs behind common interfaces.

## 9. Transparent AI behavior

- **Meaning:** Users understand what is generated, what context was used, and when review is required.
- **Practical application:** Label generated recommendations, job status, Brand Profile version, and retry behavior.
- **Positive example:** An error states that no content was replaced and offers retry.
- **Anti-pattern:** Present inferred claims as supplied business facts.
- **Design implication:** Distinguish user input, AI recommendation, and user-approved content.
- **Engineering implication:** Retain provenance and avoid logging sensitive prompt content unnecessarily.

## 10. Scope earns complexity

- **Meaning:** Features enter the product when they validate the core workflow or solve observed retention problems.
- **Practical application:** Defer real-time collaboration and publishing until individual generation and reuse work reliably.
- **Positive example:** Improve item-level regeneration based on usage before adding a marketplace.
- **Anti-pattern:** Build broad integrations to compensate for weak core output.
- **Design implication:** Keep MVP navigation focused on required modules.
- **Engineering implication:** Prefer replaceable boundaries and simple operations over premature platform infrastructure.
