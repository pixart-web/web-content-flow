# Phase 21 — Marketing Website Implementation

## Executive summary

Phase 21 introduces a distinct public brand identity and a production-oriented marketing website inside the existing Next.js application. The authenticated SaaS workflows and immutable Brand Profile model are unchanged.

## Brand and positioning

The category is “content operations platform”. The proposition is “From one Brief to your entire content system.” The principal tagline is “Create once. Flow everywhere.” Public copy emphasises shared context, structured outputs, versions and human control rather than generic AI volume.

## Visual identity

The selected Flow Mark uses one continuous input path, a controlled central structure and three outputs. Production SVG lockups, monochrome mark, favicon, Apple touch icon and default Open Graph image are included.

Marketing colours are scoped CSS variables: Midnight, Orbit, Slate Core, Cloud, Mist, Drift, Flow Violet, Signal Cyan and Growth Mint. Existing authenticated-product tokens remain intact.

Geist Sans and Geist Mono are loaded through `next/font/google` for the public site without distributing font files. Existing application Inter/Poppins loading remains unchanged.

## Motion

The Content Constellation uses semantic HTML and CSS animation. It communicates Brief → Brand Profile → channel outputs and resolves to a complete static state under reduced-motion preferences. No motion library was added.

## Information architecture and routes

Implemented:

- `/`
- `/product` and `/product/{brand-profile,website,social,ads,video,calendar,library}`
- `/solutions/{founders,marketing-teams,agencies}`
- `/pricing`
- `/resources`, `/resources/guides`, `/resources/blog`
- `/about`, `/contact`, `/security`
- `/legal/{privacy,terms,cookies}`

Resource routes use truthful limited editorial states. Pricing shows plan dimensions without permanent prices.

## Components

`MarketingHeader`, `MarketingFooter`, `MarketingPage`, `LogoLockup`, `Section`, `SectionHeader`, `BetaCta`, `FlowDiagram`, `ContentConstellation`, `ProductMockup`, `ProductDetailPage`, `SolutionPage`, `EditorialIndex`, and `BetaForm`.

## Beta form

The form uses a Server Action, Zod validation, bounded values, a honeypot, existing database-backed rate limiting and a dedicated `BetaInterest` table. Duplicate email submissions update one record. It sends no email and activates no automation. Errors expose no database detail.

Migration: `20260802120000_marketing_beta_interest`.

## SEO

Global Open Graph/Twitter media, unique route metadata, canonicals, a controlled sitemap and robots policy are implemented. Indexing requires both production environment and `MARKETING_INDEXING_ENABLED=true`. Staging remains `noindex, nofollow`.

The homepage emits factual `SoftwareApplication` structured data without ratings, prices or fabricated proof.

## Accessibility and performance

Server Components remain the default. The only new Client Component is the form. Mobile navigation uses native disclosure; skip link, semantic landmarks, visible focus, 44 px targets, reduced motion and non-horizontal mobile flow are implemented.

No large motion, video, CMS or analytics dependencies were added. Below-fold authentic videos remain deferred rather than eagerly loaded.

## Security and privacy

No arbitrary generated HTML, external URL fetching, analytics provider, session replay or outbound form automation was introduced. Interest-form values are not logged or sent to analytics. Security claims distinguish local implementation from unverified external operations.

## Dependencies

No new dependency was added.

## Validation result

- Formatting, ESLint and strict TypeScript: passed.
- Unit/component: 73 tests passed.
- PostgreSQL integration: 8 tests passed.
- Browser: 58 passed and 18 intentional viewport-gated tests skipped.
- Automated homepage accessibility: passed in desktop and mobile Chromium.
- Production build: passed; application compilation completed in approximately 2 seconds.
- Design tokens, source secret scan, client-bundle scan, licence inventory and production dependency audit: passed.
- New migration: applied successfully after all 12 existing migrations in an isolated PostgreSQL database.

Visual review was completed at desktop and 320 px. No horizontal overflow was detected at 320 px.
Lighthouse was not available in the repository, so no Lighthouse score or representative-network Core Web Vitals claim is made.

## Media still required

Authentic hero and module captures, feature posters, WebM/MP4 exports and production social templates remain in the [Media Production Plan](../marketing/04-media-production-plan.md).

Phase 22 subsequently added authentic stills and poster integration. Final
WebM/MP4 capture remains pending; see
[Phase 22](44-product-media-and-launch-readiness.md).

## Legal review

Public legal structures are factual but final policy language, retention periods, controller details, governing law and effective dates require qualified legal review before indexing or public launch.

## Deployment requirements

Apply the new migration, provide the canonical production origin, keep `MARKETING_INDEXING_ENABLED=false` until launch approval, and verify generated social images and DNS. This document does not claim deployment.
