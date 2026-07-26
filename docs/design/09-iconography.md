# Iconography

## Recommendation

Use **Lucide** as the initial implementation library because its consistent outline language, broad coverage, and lightweight individual imports fit the product. Do not install it during this documentation step. Create custom icons only for the logo and genuinely product-specific concepts not covered by the library.

## Style rules

- Outline icons, rounded joins/caps, geometric but human.
- Default stroke: 1.75 px at 20/24 px; use 2 px at 16 px where clarity requires it.
- Sizes: 16 px metadata, 18 px compact controls, 20 px default controls/navigation, 24 px feature/module, 32 px empty-state/marketing diagram.
- Align to the icon’s optical center, not only its bounding box.
- Use current text color; semantic icons use semantic text colors.
- Filled icons are reserved for selected state or compact status where Lucide supplies a coherent filled form; never mix styles within one control group.
- Pair module and status icons with labels. Color is secondary.

## Suggested Lucide mappings

| Concept | Suggested icon | Notes |
|---|---|---|
| Dashboard | `LayoutDashboard` | Global overview |
| Projects | `FolderKanban` | Project workspace, not file storage |
| Brand Profile | `Fingerprint` | Identity/context; avoid brain/personality cliché |
| Website | `PanelsTopLeft` | Structure and page copy, not globe-only publishing |
| Social Media | `MessagesSquare` | Multi-platform content; not generic chatbot use |
| Ads & Creative | `Megaphone` | Campaign communication |
| Video & Reels | `Clapperboard` | Script/production planning |
| General Copy | `FileText` | Structured written output |
| Calendar | `CalendarDays` | Planning only |
| Library | `Library` | Canonical reusable outputs |
| Export | `Download` or `FileDown` | Choose by surrounding label |
| Generate | `Play` or `Workflow` | Prefer “start process”; avoid Sparkles/Wand |
| Regenerate | `RefreshCw` | Always pair with scope label |
| Versions | `History` | Item snapshots |
| Settings | `Settings` | Standard global behavior |

## Status icons

- Queued: `Clock3`
- Running: `LoaderCircle` with reduced-motion static alternative
- Complete: `CircleCheck`
- Partial/warning: `TriangleAlert`
- Failed: `CircleX`
- Cancelled: `Ban`
- Edited: `PencilLine`
- Mock mode: `FlaskConical` plus “Mock” text

## Module identifiers

| Module | Icon | Subtle accent recommendation |
|---|---|---|
| Brand Profile | Fingerprint | Indigo |
| Website | PanelsTopLeft | Blue |
| Social Media | MessagesSquare | Purple |
| Ads & Creative | Megaphone | Indigo→purple accent line only |
| Video & Reels | Clapperboard | Purple |
| General Copy | FileText | Blue-indigo |
| Calendar | CalendarDays | Neutral with indigo selected state |
| Library | Library | Neutral with purple accent |

Accents are navigation aids, not independent color brands.

## Product-specific concepts

- **Source-to-system:** one filled/outlined central block connected to three aligned output blocks; use in marketing diagrams, not as an everyday action icon.
- **Shared context:** stacked cards with one continuous left edge or a small linked-node mark.
- **Content pack:** grouped module cards inside one bounding structure.
- **Profile provenance:** Brand Profile icon plus version label, not a chain-link icon alone.

## Prohibitions

- Sparkles as the default AI/generate icon.
- Mixed 16/24 px icons without optical normalization.
- Emoji, multicolor icons, or module identity through color alone.
- Icon-only navigation on mobile without accessible labels.
- Custom icons that duplicate a suitable library icon.

Related: [Logo System](03-logo-system.md), [Component Foundations](08-component-foundations.md), and [Application Shell Direction](16-application-shell-direction.md).
