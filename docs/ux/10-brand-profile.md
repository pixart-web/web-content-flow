# Brand Profile

## Screen specification

- **Screen/route:** Brand Profile `/app/projects/:projectId/brand-profile`.
- **Purpose/goal:** Generate, review, edit, and version the shared context used by future module jobs.
- **Entry/exit:** wizard/Overview/project nav/content provenance → modules/version history.
- **Required data:** brief revision, profile versions/current version, section values, provenance, job state, mode.
- **Hierarchy:** profile title/version/mock/state → future-generation impact notice → summary → strategy → audience/problem → voice/writing → visual direction → messages/CTAs → versions/actions.
- **Desktop:** 720–960 px content with section index; **tablet/mobile:** stacked cards, expanded editing full width.
- **Primary:** empty `Generate Brand Profile`; existing `Edit profile` or next module action. **Secondary:** regenerate section/full, versions, copy prompt/palette/message.
- **Components:** structured section cards, editable fields, tags/palette, job indicator, provenance, warning/confirmation dialog.
- **States:** empty/incomplete brief; preparing/queued/running; partial invalid sections; complete; mock; edit/saving; failed generation/save; outdated relative to brief.
- **Security/accessibility/analytics:** owner-only; headings, labelled fields, palette text values, live job state; `brand_profile_generation_*`, `brand_profile_section_edited`, `brand_profile_regenerated`.
- **Acceptance:** all required profile fields are present; current version is explicit; new jobs use current version; existing content never changes automatically.
- **Out of scope:** production logo/font assets, professional brand-book layout, automatic downstream rewriting.

## Required presentation sections

Summary; positioning; value proposition; mission; vision; values; target audience; customer problem; brand promise; slogan; personality; tone of voice; writing guidelines; words to use/avoid; visual direction; colors; typography recommendations; image direction; reusable image prompt; marketing messages; calls to action.

## Workflow

- **Generate:** valid brief → job → validate sections → save version → mark current.
- **Inline edit:** short fields/tags; explicit save creates manually edited profile version. Expanded editor handles long guidance.
- **Regenerate section:** confirmation names section and states current profile remains in history; successful result creates a new full profile snapshot with changed section.
- **Regenerate full:** stronger confirmation; previous version retained; job failure leaves current unchanged.
- **Impact:** after save, show `New content will use Brand Profile vN. Existing content still uses its original version.` Mark older items `Uses vN−1`/outdated only as provenance, not error.
- **Mock:** shell and profile display `Mock mode`/`Mock content`; exports include a mock notice if mock content is selected.

Wireframe: [Brand Profile](../../wireframes/app/brand-profile.md).
