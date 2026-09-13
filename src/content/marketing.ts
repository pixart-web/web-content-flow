export const canonicalFlow = [
  ["Brief", "Capture the strategy, audience and objective."],
  ["Brand Profile", "Set the shared positioning, voice and visual direction."],
  ["Website", "Create website structure and page copy."],
  ["Social", "Shape platform-aware posts and campaign ideas."],
  ["Ads", "Develop angles, copy and creative direction."],
  ["Video", "Build hooks, scenes and production-ready scripts."],
  ["Copy", "Create reusable marketing copy for specific purposes."],
  ["Calendar", "Arrange content into a visible publishing plan."],
  ["Library", "Find every item, version and source."],
  ["Export", "Take structured work into the tools you already use."],
] as const;

export const productStories = [
  {
    slug: "brand-profile",
    name: "Brand Profile",
    eyebrow: "One source of truth",
    title: "Your brand context stays with the work.",
    description:
      "Define strategy, audience, positioning and voice once. New content records the exact Brand Profile version that shaped it.",
  },
  {
    slug: "website",
    name: "Website",
    eyebrow: "Website content",
    title: "Move from sitemap to structured page copy.",
    description:
      "Create website content and structure, then review and refine every section. Web Content Flow does not deploy the website.",
  },
  {
    slug: "social",
    name: "Social",
    eyebrow: "Social content",
    title: "Adapt one direction to each social format.",
    description:
      "Create editable platform-aware posts, captions and visual ideas without copying the brief into another tool.",
  },
  {
    slug: "ads",
    name: "Ads & Creative",
    eyebrow: "Campaign direction",
    title: "Develop angles before producing the creative.",
    description:
      "Build structured ad concepts, messaging and image direction. Publishing and rendered advertisements remain outside the product.",
  },
  {
    slug: "video",
    name: "Video & Reels",
    eyebrow: "Video planning",
    title: "Turn the message into a scene-by-scene script.",
    description:
      "Create hooks, scenes, voice-over and visual direction. The product prepares scripts; it does not render video.",
  },
  {
    slug: "calendar",
    name: "Calendar",
    eyebrow: "Content planning",
    title: "See the system before you publish.",
    description:
      "Reference existing content in a practical calendar. Scheduled and published states are planning records, not automatic publishing.",
  },
  {
    slug: "library",
    name: "Library",
    eyebrow: "Connected history",
    title: "Keep every useful version within reach.",
    description:
      "Review, edit, restore and export content without losing the Brand Profile and generation history behind it.",
  },
] as const;

export const solutions = {
  founders: {
    label: "Solo founders",
    title:
      "Run a clearer content operation without building a full marketing team.",
    summary:
      "Replace repeated blank-page work with one strategic foundation and a repeatable path across your core channels.",
    outcomes: [
      "Clear priorities",
      "Consistent voice",
      "Reusable content",
      "Faster first drafts",
    ],
  },
  "marketing-teams": {
    label: "Small marketing teams",
    title: "Give every channel the same strategic starting point.",
    summary:
      "Keep shared context, structured reviews, versions and planning together as the campaign moves across channels.",
    outcomes: [
      "Shared context",
      "Visible versions",
      "Connected planning",
      "Consistent execution",
    ],
  },
  agencies: {
    label: "Agencies and consultants",
    title: "Turn client strategy into a repeatable delivery system.",
    summary:
      "Keep every project’s brand context separate and move from strategy to organised deliverables through the same workflow.",
    outcomes: [
      "Separate projects",
      "Reusable workflow",
      "Organised delivery",
      "Stronger first drafts",
    ],
  },
} as const;
