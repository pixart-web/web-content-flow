# Color System

## Color strategy

The interface uses neutral surfaces for most area, Indigo for primary interaction, Electric Blue for flow/energy, and Purple for transformation/completion accents. Status colors communicate meaning and must not be replaced by brand accents.

## Primitive brand scale

The scale is deliberately anchored to the existing colors at 500. Nearby steps supply interaction and surface roles.

| Token | Hex | Role |
|---|---|---|
| brand-blue-50 | `#EFF6FF` | Informational tint, flow background |
| brand-blue-100 | `#DBEAFE` | Stronger tint |
| brand-blue-200 | `#BFDBFE` | Decorative line |
| brand-blue-300 | `#93C5FD` | Dark-mode secondary text/accent |
| brand-blue-400 | `#60A5FA` | Dark-mode interaction accent |
| brand-blue-500 | `#3B82F6` | Approved Electric Blue; decorative/large UI only on white |
| brand-blue-600 | `#2563EB` | Accessible link/action on white |
| brand-blue-700 | `#1D4ED8` | Pressed action |
| brand-blue-800 | `#1E40AF` | High-contrast text/accent |
| brand-blue-900 | `#1E3A8A` | Deep accent |
| brand-blue-950 | `#172554` | Dark field |
| brand-indigo-50 | `#EEF2FF` | Selected surface |
| brand-indigo-100 | `#E0E7FF` | Primary tint |
| brand-indigo-200 | `#C7D2FE` | Accent border |
| brand-indigo-300 | `#A5B4FC` | Dark-mode secondary accent |
| brand-indigo-400 | `#818CF8` | Dark-mode primary interaction |
| brand-indigo-500 | `#4F46E5` | Approved Indigo; core brand/primary action |
| brand-indigo-600 | `#4338CA` | Hover and accessible text link |
| brand-indigo-700 | `#3730A3` | Pressed state |
| brand-indigo-800 | `#312E81` | High-contrast accent text |
| brand-indigo-900 | `#1E1B4B` | Deep field |
| brand-indigo-950 | `#111033` | Deepest field |
| brand-purple-50 | `#F5F3FF` | Transformation tint |
| brand-purple-100 | `#EDE9FE` | Accent surface |
| brand-purple-200 | `#DDD6FE` | Accent border |
| brand-purple-300 | `#C4B5FD` | Dark-mode accent |
| brand-purple-400 | `#A78BFA` | Dark-mode highlight |
| brand-purple-500 | `#7C3AED` | Approved Purple; secondary brand accent |
| brand-purple-600 | `#6D28D9` | Accessible action/accent text |
| brand-purple-700 | `#5B21B6` | Pressed/accent text |
| brand-purple-800 | `#4C1D95` | Deep accent |
| brand-purple-900 | `#3B0764` | Deep field |
| brand-purple-950 | `#2E1065` | Deepest field |

## Neutral scale

| Token | Hex | Primary role |
|---|---|---|
| neutral-0 | `#FFFFFF` | Elevated surface |
| neutral-50 | `#F8FAFC` | Approved light background |
| neutral-100 | `#F1F5F9` | Subtle surface |
| neutral-200 | `#E2E8F0` | Default border |
| neutral-300 | `#CBD5E1` | Strong border/disabled control |
| neutral-400 | `#94A3B8` | Placeholder/disabled icon |
| neutral-500 | `#64748B` | Secondary icon; avoid for small text on white |
| neutral-600 | `#475569` | Secondary text |
| neutral-700 | `#334155` | Strong secondary text |
| neutral-800 | `#1E293B` | Primary text alternative |
| neutral-900 | `#0F172A` | Approved Dark Navy; primary text |
| neutral-950 | `#020617` | Dark-mode canvas |

## Semantic status colors

| Status | Base | Text on light | Surface | Border |
|---|---|---|---|---|
| Success | `#10B981` | `#047857` | `#ECFDF5` | `#A7F3D0` |
| Warning | `#F59E0B` | `#92400E` | `#FFFBEB` | `#FDE68A` |
| Error | `#EF4444` | `#B91C1C` | `#FEF2F2` | `#FECACA` |
| Info | `#3B82F6` | `#1D4ED8` | `#EFF6FF` | `#BFDBFE` |

Base status colors are suitable for icons, indicators, and large shapes. Use the darker text values for normal text on light surfaces.

## Light-mode semantic assignments

| Purpose | Value |
|---|---|
| Application background | neutral-50 |
| Default/elevated surface | neutral-0 |
| Subtle surface | neutral-100 |
| Selected surface | brand-indigo-50 |
| Generated-content surface | neutral-0 with brand-indigo-200 leading accent only when needed |
| Primary text | neutral-900 |
| Secondary text | neutral-600 |
| Muted text | neutral-500 only at 14 px+; neutral-600 for smaller text |
| Inverse text | neutral-0 |
| Default border | neutral-200 |
| Strong border | neutral-300 |
| Primary interaction | brand-indigo-500 |
| Primary hover | brand-indigo-600 |
| Primary active | brand-indigo-700 |
| Link | brand-blue-700; hover brand-blue-800 |
| Focus ring | brand-blue-500 outer ring plus white separation |
| Overlay | `rgba(2, 6, 23, 0.56)` |

## Future dark-mode assignments

Dark mode is prepared, not required for MVP.

| Purpose | Value |
|---|---|
| Application background | neutral-950 |
| Default surface | neutral-900 |
| Elevated surface | neutral-800 |
| Subtle surface | `#172033` |
| Primary text | neutral-50 |
| Secondary text | neutral-300 |
| Muted text | neutral-400 |
| Default border | neutral-700 |
| Primary interaction | brand-indigo-400 |
| Primary hover | brand-indigo-300 |
| Focus ring | brand-blue-400 |
| Overlay | `rgba(2, 6, 23, 0.76)` |

## Gradients

- **Primary brand:** `linear-gradient(135deg, #3B82F6 0%, #4F46E5 50%, #7C3AED 100%)`.
- **Soft brand wash:** same stops at 10–16% opacity over white; marketing or selected onboarding only.
- **Flow line:** blue 500 → indigo 500 → purple 500; 2 px maximum, used in diagrams.
- Never use gradient behind body text, form fields, tables, or status messages.

## Contrast guidance

- Target WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text and essential component boundaries.
- White on Indigo `#4F46E5` and Purple `#7C3AED` is suitable for normal button text; verify implementation states.
- White on Electric Blue `#3B82F6` is not sufficient for normal text; use blue 700, Dark Navy text, or reserve blue 500 for non-text decoration.
- Neutral 500 on white is borderline for small text; use neutral 600 for captions below 14 px.
- Focus, error, selected, and module identity may not rely on color alone.

## Prohibited combinations

- Electric Blue 500 with white normal text.
- Success 500, Warning 500, or Error 500 as body-text colors on white.
- Purple text over Indigo or gradient backgrounds.
- Low-opacity neutral text over tinted surfaces.
- Gradient borders on form controls or status components.
- Module accents used as semantic error/success meaning.

Related: [Accessibility](12-accessibility.md), [UI Surfaces](07-ui-surfaces.md), and [Design Tokens](17-design-tokens.md).
