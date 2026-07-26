# General Copy Module

## Screen specification

- **Screen/route:** General Copy `/app/projects/:projectId/content/copy`; item `/content/copy/:itemId`.
- **Purpose/goal:** Create and refine common structured marketing copy outside specialist modules.
- **Entry/exit/data:** Overview/nav → item/editor/export; profile, category, objective/audience/length/source facts, items/versions/jobs.
- **Hierarchy:** module header → category chooser/filter → item collection → item actions.
- **Desktop:** category rail/filter + list; **tablet/mobile:** selector/chips + single list.
- **Primary:** `Create copy`; **secondary:** edit, copy, regenerate, shorten, expand, change tone, restore.
- **Components:** category cards, content items, transformation menu, editor, status.
- **States:** empty category chooser; loading; partial variants; success; failed generation/save; filtered empty; mock.
- **Security/accessibility/analytics:** owner-only; category and transformation labels; module/item/transformation events without copy body.
- **Acceptance:** source facts are not invented; same-purpose transformations create versions; distinctly requested deliverables create new items.
- **Out of scope:** unrestricted chatbot, email sending/automation, campaign publishing.

## Categories and version rule

Slogans, headlines, product descriptions, institutional copy, calls to action, emails, ads copy, social biography, company introduction. Shorten/expand/change tone/regenerate the same purpose creates a new version of the same item and retains the previous version. “Create another product description for Product B” creates a new content item.

## Workflow

Choose category → enter bounded inputs → generate → review/edit/transform/copy/export. Transformation preview may be confirmed before current version changes. Failure leaves current version unchanged. Provenance includes transformation instruction type, not raw sensitive prompt.

Wireframe: [Copy module](../../wireframes/app/copy-module.md).
