export type ProductMediaStatus =
  | "planned"
  | "capture-ready"
  | "captured"
  | "edited"
  | "approved"
  | "published";

export type ProductMediaEntry = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly poster: string;
  readonly webm: string | null;
  readonly mp4: string | null;
  readonly aspectRatio: `${number}/${number}`;
  readonly width: number;
  readonly height: number;
  readonly duration: number | null;
  readonly autoplay: boolean;
  readonly loop: boolean;
  readonly muted: true;
  readonly mobileFallback: string;
  readonly reducedMotionFallback: string;
  readonly transcript: string;
  readonly status: ProductMediaStatus;
};

const still = (
  id: string,
  title: string,
  description: string,
): ProductMediaEntry => ({
  id,
  title,
  description,
  poster: `/marketing/posters/${id}.webp`,
  webm: null,
  mp4: null,
  aspectRatio: "16/9",
  width: 1600,
  height: 900,
  duration: null,
  autoplay: false,
  loop: false,
  muted: true,
  mobileFallback: `/marketing/posters/${id}-mobile.webp`,
  reducedMotionFallback: `/marketing/posters/${id}.webp`,
  transcript: description,
  status: "captured",
});

export const productMedia = {
  "hero-flow-demo": still(
    "hero-flow-demo",
    "Northstar Roasters project overview",
    "The fictional Northstar Roasters project shows a complete Brief, Brand Profile, connected content modules, Calendar, Library and Export workflow.",
  ),
  "brief-to-brand": still(
    "brief-to-brand",
    "Northstar Roasters Brand Profile",
    "A structured Brand Profile carries positioning, audience, voice and visual direction into new content.",
  ),
  "website-generation": still(
    "website-generation",
    "Structured website content",
    "Website pages and sections use the same Brand Profile and remain editable and versioned.",
  ),
  "social-studio": still(
    "social-studio",
    "Structured social content",
    "Platform-aware posts remain connected to the project context and version history.",
  ),
  "ads-creative": still(
    "ads-creative",
    "Ads and creative concepts",
    "Campaign angles, headlines and creative direction are organised as structured content.",
  ),
  "video-scripts": still(
    "video-scripts",
    "Video and Reel scripts",
    "Hooks, scenes, voice-over and visual direction are prepared without claiming rendered video.",
  ),
  "calendar-planning": still(
    "calendar-planning",
    "Campaign calendar",
    "Existing content items are referenced in a visible planning calendar without automatic publishing.",
  ),
  "library-export": still(
    "library-export",
    "Content Library and Export",
    "Search, versions and export keep useful content and its provenance within reach.",
  ),
} as const satisfies Record<string, ProductMediaEntry>;

export type ProductMediaId = keyof typeof productMedia;

export function getProductMedia(id: ProductMediaId) {
  return productMedia[id];
}
