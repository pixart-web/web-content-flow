# Website Module

## Screen specification

- **Screen/route:** Website `/app/projects/:projectId/content/website`; item `/app/projects/:projectId/content/website/:itemId`.
- **Purpose/goal:** Generate and refine a structured sitemap and page copy for handoff—not build a website.
- **Entry/exit:** Overview/project nav → page item/editor/export.
- **Required data:** current Brand Profile, module selection/settings, sitemap, pages/sections, SEO fields, jobs, versions.
- **Hierarchy:** module header/status → sitemap page list → selected page overview → ordered sections → export readiness.
- **Desktop:** 240–280 px page list + main content; **tablet:** collapsible list; **mobile:** page selector then stacked sections.
- **Primary:** empty `Generate website`; populated `Open/Edit page`. **Secondary:** regenerate page/section, copy, versions, export.
- **Components:** module card/header, page list, section content cards, content-item actions, job indicator.
- **Default:** Home selected; **empty:** Add module or recommended pages/setup; **loading:** shell + page skeleton; **partial:** completed pages available, failed page named; **success:** `Your website copy is ready`; **error:** prior pages retained with scoped retry.
- **Security/accessibility/analytics:** owner-only; page list keyboard navigation but not necessarily tabs; section headings/labelled fields; module generation and item events.
- **Acceptance:** page/section regeneration preserves prior version; output visibly uses profile version; mobile can navigate/edit pages.
- **Out of scope:** visual builder, layout canvas, code generation guarantee, hosting/publishing, SEO audit.

## Content model

Initial selectable pages: Home, About, Products or Services, Contact, Landing Page. Sitemap item includes page name, slug suggestion, purpose, navigation label. Page includes SEO title/meta description as recommendations, purpose, audience/CTA, and ordered sections. Section includes type, eyebrow optional, headline, body, proof placeholder, CTA, notes. Never fabricate proof.

## Workflow

- **Trigger/prerequisites:** generate Website; module selected; valid profile.
- **Main path:** choose/review pages → job → page list appears as validated → open/edit/copy/export.
- **Alternative:** generate one page later; add/remove proposed page before generation where supported.
- **Failure/recovery:** structure failure yields no new sitemap; page failure preserves other pages; retry exact page/section.
- **Persistence/navigation:** each page or section is a content item/scope with versions; return to same selected page via route/query state.

Wireframe: [Website module](../../wireframes/app/website-module.md). Related: [Editor](19-content-item-editor.md).
