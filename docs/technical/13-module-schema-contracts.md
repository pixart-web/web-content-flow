# Module Schema Contracts

Zod schemas in [`architecture/schemas`](../../architecture/schemas/brand-profile.schema.ts) are versioned reference boundaries. Common rules: `schemaVersion` literal, opaque branded IDs where IDs occur, `mock`, provenance, trimmed bounded strings, strict enums, bounded arrays, and no arbitrary HTML.

| Schema | Required structure | Bounds recommendation |
|---|---|---|
| Brand Profile | all strategy, audience, voice, visual, messaging fields | 1–12 values/tags; text 1–4000 by field |
| Website | sitemap/pages/sections/SEO recommendations | 1–10 pages, 1–15 sections/page |
| Social | platform, format, objective, visual idea, caption, hashtags, CTA, date? | 1–30 items/job; hashtags ≤30 |
| Ads | campaigns/concepts/variations, angle/copy/visual/prompt | 1–10 concepts; 1–5 variations |
| Video | scripts, platform/duration/hook/scenes/CTA | 1–10 scripts; 1–30 scenes |
| Copy | category, purpose, fields/content | 1–20 items; content ≤12000 chars |
| Generation job | state/scope/mode/steps/error | explicit discriminated terminal/nonterminal statuses |
| Export | scope, formats, selected item IDs, mock inclusion | 1–500 IDs; Markdown/JSON/TEXT only baseline |

Provider output parses to schema, then normalization adds application IDs/version/provenance in a transaction. Unknown keys may be rejected at provider boundary. One bounded repair attempt may be permitted for syntactic/shape invalidity; still-invalid output fails safely.

Partial output persists only if the module schema defines independently valid units (pages/posts/concepts/scripts/copy items). Never persist half-valid required fields as complete; return valid units plus failed-unit summary and mark job PARTIAL.

Schema evolution adds a new version and migration/reader adapter. Persisted snapshot retains its original schema version; do not mutate historical JSON in place without an explicit migration.
