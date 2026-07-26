# Typography

## Typeface roles

- **Poppins:** display headlines, marketing section headings, product page titles when spacious, and selected high-emphasis labels. Use selectively.
- **Inter:** interface, body copy, forms, tables, editors, metadata, navigation, and all dense content.
- **System fallback:** the interface must remain legible and stable if web fonts fail.

## Font stacks

```text
Display: "Poppins", "Avenir Next", "Segoe UI", sans-serif
Interface: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
Mono/data fallback: "SFMono-Regular", Consolas, "Liberation Mono", monospace
```

Do not distribute font files. Confirm licensing and loading strategy before implementation.

## Type scale

| Style | Font | Desktop size / line | Weight | Tracking | Use |
|---|---|---|---:|---:|---|
| Display XL | Poppins | 64 / 72 px | 600 | -0.035em | Marketing hero only |
| Display L | Poppins | 52 / 60 px | 600 | -0.03em | Major marketing headline |
| Display M | Poppins | 40 / 48 px | 600 | -0.025em | Marketing sections |
| Heading 1 | Poppins | 32 / 40 px | 600 | -0.02em | Page title |
| Heading 2 | Poppins | 24 / 32 px | 600 | -0.015em | Major section |
| Heading 3 | Inter | 20 / 28 px | 600 | -0.01em | Card/panel section |
| Heading 4 | Inter | 16 / 24 px | 600 | 0 | Small section/card |
| Body L | Inter | 18 / 28 px | 400 | 0 | Marketing lead text |
| Body M | Inter | 16 / 24 px | 400 | 0 | Default body/editor |
| Body S | Inter | 14 / 20 px | 400 | 0 | Supporting interface text |
| Label M | Inter | 14 / 20 px | 600 | 0 | Form label/navigation |
| Label S | Inter | 12 / 16 px | 600 | 0.01em | Metadata/status label |
| Caption | Inter | 12 / 16 px | 400 | 0.005em | Noncritical metadata |
| Button | Inter | 14 / 20 px | 600 | 0 | Default controls |
| Button L | Poppins or Inter | 16 / 24 px | 600 | -0.005em | Marketing/primary large action |

## Numerical data

Use Inter with tabular numerals for dates, counts, progress, job duration, and tables. Use the monospace stack only for identifiers, schema/code-like content, or diagnostic references—not ordinary metrics.

## Rules

- Use weights 400, 500, and 600. Reserve 700 for rare marketing emphasis; do not use thin weights.
- Do not use Poppins below 14 px or for paragraphs, editors, tables, and long navigation lists.
- Buttons are sentence case; labels are sentence case; avoid all caps except compact technical abbreviations.
- Underline links in prose or provide another persistent non-color cue.
- Keep line length at 45–75 characters for body copy; marketing lead maximum 60 characters; forms/help text maximum 70 characters.
- Default generated-content editor width: 72ch maximum. Long-form preview may use 68ch.
- Avoid more than three type sizes in one card or compact panel.

## Responsive behavior

- Display XL becomes 40/48 px on mobile; Display L becomes 36/44; Display M becomes 32/40.
- Heading 1 becomes 28/36; Heading 2 becomes 22/30.
- Body sizes remain unchanged; never shrink interface body below 14 px.
- Prefer line wrapping and shorter copy over condensed tracking or smaller type.

## Accessibility and performance

- Text zoom to 200% must not hide actions or cause horizontal page scrolling.
- Respect user font rendering and do not disable selection in content.
- Use `font-display: swap` or equivalent and fallback metrics where implementation permits.
- Ensure font weight and color both support hierarchy; light gray alone is not a hierarchy system.
- Do not encode status through italic or weight alone.

Related: [Spacing and Layout](06-spacing-and-layout.md), [Content Design](14-content-design.md), and [Accessibility](12-accessibility.md).
