# Ads & Creative Module

## Screen specification

- **Screen/route:** Ads & Creative `/app/projects/:projectId/content/ads`; item `/content/ads/:itemId`.
- **Purpose/goal:** Create organized campaign concepts and copy variations with production guidance.
- **Entry/exit:** Overview/nav → concept item/editor/export.
- **Required data:** profile, campaign name/objective/platform/audience/offer, concepts/variations, jobs/versions.
- **Hierarchy:** module header → campaign groups → creative-concept cards → variation detail.
- **Desktop:** campaign list/filters + 2-column concepts; **tablet/mobile:** stacked groups/cards.
- **Primary:** `Create campaign`; **secondary:** add variation, edit, regenerate variation/concept, copy prompt/copy, export.
- **Components:** campaign header, concept card, structured fields, variation badges, job status.
- **Default:** campaigns newest; **empty:** campaign setup; **loading:** concept skeletons; **partial:** completed variations usable; **success:** concepts ready; **error:** failed scope and preserved concepts.
- **Security/accessibility/analytics:** owner-only; grouped headings, variation labels, prompt copy announcement; standard events with module `ads`.
- **Acceptance:** never implies rendered image/ad; fabricated performance/claims prohibited; regeneration versions only selected scope.
- **Out of scope:** image rendering/editing, media buying, audience sync, policy checker, publishing.

## Content model/workflow

Campaign groups contain platform, audience, objective, offer. Concept contains sales angle, concept rationale, headline, primary text, description, CTA, visual concept, image-generation prompt, and variations labelled A/B/C as identifiers—not experiment results.

Trigger Create campaign → configure → generate → validate/save concepts. Alternative: add variation. Partial/failed output keeps successful concepts; retry exact concept/variation. Current profile version and human-review note remain visible. Export includes text/prompt only.

Wireframe: [Ads module](../../wireframes/app/ads-module.md).
