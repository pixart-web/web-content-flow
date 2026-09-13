export const socialAssetFormats = {
  linkedinLandscape: { width: 1200, height: 627 },
  instagramPortrait: { width: 1080, height: 1350 },
  instagramSquare: { width: 1080, height: 1080 },
  xLandscape: { width: 1200, height: 675 },
  youtubeThumbnail: { width: 1280, height: 720 },
  openGraph: { width: 1200, height: 630 },
} as const;

export const socialAssetTemplates = [
  {
    id: "launch-announcement",
    headline: "Content that flows from strategy.",
    media: "hero-flow-demo",
  },
  {
    id: "private-beta",
    headline: "A connected content workflow is taking shape.",
    media: "hero-flow-demo",
  },
  {
    id: "product-workflow",
    headline: "One brief. One brand. Every channel.",
    media: "hero-flow-demo",
  },
  {
    id: "brand-profile",
    headline: "Give every channel the same strategic starting point.",
    media: "brief-to-brand",
  },
  {
    id: "website",
    headline: "Shape website content from the same brand foundation.",
    media: "website-generation",
  },
  {
    id: "social",
    headline: "Adapt the message without losing the brand.",
    media: "social-studio",
  },
  {
    id: "calendar",
    headline: "See the campaign as a system.",
    media: "calendar-planning",
  },
  {
    id: "library",
    headline: "Keep every useful version within reach.",
    media: "library-export",
  },
  {
    id: "founder-message",
    headline: "Marketing should not restart every Monday.",
    media: "hero-flow-demo",
  },
  {
    id: "product-principle",
    headline: "Build systems, not isolated content.",
    media: "hero-flow-demo",
  },
] as const;
