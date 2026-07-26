# Logo System

## Status

This document is a production brief. No production-ready logo or vector source is claimed to exist.

## Concept

**Working recommendation:** Build the symbol from one central rounded module that resolves into three connected output blocks along a controlled path. Negative space or shared edges should make the relationship legible at small sizes. The geometry should imply orchestration and structured transformation without using a standalone arrow.

## Symbol rationale

- One source represents the project brief and Brand Profile.
- Linked blocks represent independent content modules.
- Repeated corner geometry represents system structure.
- A directional shift from blue through indigo to purple represents transformation.
- The symbol must remain recognizable in monochrome; gradient is enhancement, not structure.

Avoid literal letters unless an abstract “W” or “flow” relationship emerges naturally from the geometry rather than being forced.

## Wordmark direction

Use a custom-refined or carefully typeset geometric sans wordmark with strong legibility. Poppins SemiBold is an initial construction reference, not an automatic final wordmark. Preserve readable spacing between “Web,” “Content,” and “Flow”; do not use multicolor letters or gradient text in the primary lockup.

## Lockups

- **Horizontal:** symbol left, wordmark right; default for navigation, product sign-in, and wide marketing placements.
- **Stacked:** symbol centered above wordmark; use in square or centered marketing compositions only.
- **Icon-only:** symbol without wordmark; use when the brand is already identified, including favicon, app switcher, compact sidebar, and social avatar.

## Small-size behavior

- Reduce internal detail rather than merely shrinking the full symbol.
- Use a simplified one-color or two-tone mark below 24 px.
- Ensure at least 1 device pixel between negative-space elements at rendered size.
- Do not place the wordmark where its cap height would fall below 12 CSS px.

## Clear space

Define `x` as the height of the symbol’s central module. Minimum clear space around every lockup is `0.5x`; use `1x` in marketing hero placements. No text, border, crop, or competing mark may enter this area.

## Minimum sizes

- Horizontal digital lockup: 120 CSS px wide.
- Stacked digital lockup: 88 CSS px wide.
- Icon-only: 16 CSS px only with simplified favicon artwork; 20 CSS px for interface use; 32 CSS px preferred.
- Print horizontal lockup: 30 mm wide; icon-only: 6 mm.

Final values must be rechecked against approved vector geometry.

## Background use

- **Light backgrounds:** full-gradient symbol with Dark Navy wordmark; white or Light Background preferred.
- **Dark backgrounds:** full-gradient symbol only if edge contrast remains clear; white wordmark. Provide a thin optical separation only within the asset, never a CSS glow.
- **Monochrome:** Dark Navy or black on light; white on dark. Use for single-ink print, embossing, and constrained exports.
- Do not place the gradient mark on busy photography without a solid quiet field.

## Favicon and app icon

- Favicon must use the simplified icon-only geometry at 16, 32, and scalable SVG sizes.
- App icon uses the icon centered on Dark Navy or a restrained brand-gradient field with 18–22% optical padding.
- App icon corners belong to the platform mask; do not bake platform-specific rounding into the master symbol.
- Test monochrome pinned-tab and high-contrast variants.

## Misuse

- Do not redraw, rotate, skew, outline, add glow, or separate symbol parts.
- Do not reverse gradient direction arbitrarily.
- Do not use the symbol as a generic “generate” icon inside the product.
- Do not place it inside another arbitrary shape.
- Do not use unapproved shadows, animated gradients, or color-per-module versions.
- Do not typeset substitute wordmarks when approved artwork is available.

## Production deliverables required

A vector designer or vector design platform must create and approve:

- master SVG, print PDF, and EPS;
- high-resolution transparent PNG exports at documented scales;
- icon-only, horizontal, and stacked SVG lockups;
- full-color, one-color dark, one-color light, and grayscale variants;
- simplified favicon artwork and app-icon master;
- outlined-print version where vendor compatibility requires it;
- geometry, grid, clear-space, and minimum-size specification sheet;
- color-profile guidance for RGB and CMYK output.

All exports must use clean paths, no embedded raster images, accessible SVG titles where used inline, and expanded or licensed wordmark lettering as appropriate.

Related: [Color System](04-color-system.md), [Iconography](09-iconography.md), and [Marketing Website Direction](15-marketing-website-direction.md).
