import type { z } from "zod";

import {
  FoundationCopySnapshotSchema,
  type ContentModule,
  type FoundationCopySnapshot,
} from "./content-schemas";
import {
  WebsitePageSnapshotSchema,
  type WebsitePageSnapshot,
} from "@/domain/website/website-schemas";
import {
  SocialCaptionSnapshotSchema,
  SocialCarouselSnapshotSchema,
  SocialPostSnapshotSchema,
  SocialSnapshotSchema,
  SocialStorySnapshotSchema,
  formatHashtags,
  type SocialCaptionSnapshot,
  type SocialCarouselSnapshot,
  type SocialPostSnapshot,
  type SocialSnapshot,
  type SocialStorySnapshot,
} from "@/domain/social/social-schemas";
import {
  AdsSnapshotSchema,
  CreativeBriefSnapshotSchema,
  GoogleSearchAdSnapshotSchema,
  ImagePromptPackSnapshotSchema,
  LinkedInAdSnapshotSchema,
  MetaAdSnapshotSchema,
  type AdsSnapshot,
  type CreativeBriefSnapshot,
  type GoogleSearchAdSnapshot,
  type ImagePromptPackSnapshot,
  type LinkedInAdSnapshot,
  type MetaAdSnapshot,
} from "@/domain/ads/ads-schemas";
import {
  ShotListSnapshotSchema,
  VideoCaptionSnapshotSchema,
  VideoProductionBriefSnapshotSchema,
  VideoScriptSnapshotSchema,
  VideoSnapshotSchema,
  VoiceOverScriptSnapshotSchema,
  type ShotListSnapshot,
  type VideoCaptionSnapshot,
  type VideoProductionBriefSnapshot,
  type VideoScriptSnapshot,
  type VideoSnapshot,
  type VoiceOverScriptSnapshot,
} from "@/domain/video/video-schemas";
import {
  GeneralCopyTypeSchema,
  getGeneralCopySchema,
  type GeneralCopySnapshot,
} from "@/domain/copy/copy-schemas";
import {
  CalendarContentTypeSchema,
  CalendarSnapshotSchema,
  type CalendarSnapshot,
} from "@/domain/calendar/calendar-schemas";

export type StructuredFieldDefinition<TSnapshot> = Readonly<{
  key: keyof TSnapshot & string;
  label: string;
  kind: "text" | "textarea";
  required: boolean;
}>;

export type ContentTypeDefinition<TSnapshot> = Readonly<{
  module: ContentModule;
  type: string;
  label: string;
  schemaVersion: string;
  snapshotSchema: z.ZodType<TSnapshot>;
  fields: readonly StructuredFieldDefinition<TSnapshot>[];
  copyFormatter: (snapshot: TSnapshot) => string;
  titleFromSnapshot: (snapshot: TSnapshot) => string;
  searchText: (snapshot: TSnapshot) => string;
  capabilities: Readonly<{
    wholeItemRegeneration: boolean;
    fieldRegeneration: boolean;
    sectionRegeneration: boolean;
    variantRegeneration?: boolean;
    sceneRegeneration?: boolean;
  }>;
}>;

const foundationCopyDefinition: ContentTypeDefinition<FoundationCopySnapshot> =
  {
    module: "COPY",
    type: "FOUNDATION_COPY",
    label: "Foundation copy (platform proof)",
    schemaVersion: "1.0",
    snapshotSchema: FoundationCopySnapshotSchema,
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      {
        key: "objective",
        label: "Objective",
        kind: "textarea",
        required: true,
      },
      { key: "headline", label: "Headline", kind: "text", required: true },
      { key: "body", label: "Body", kind: "textarea", required: true },
      {
        key: "callToAction",
        label: "Call to action",
        kind: "text",
        required: true,
      },
      { key: "notes", label: "Notes", kind: "textarea", required: false },
    ],
    copyFormatter: (snapshot) =>
      [
        snapshot.headline,
        snapshot.body,
        snapshot.callToAction,
        snapshot.notes ? `Notes: ${snapshot.notes}` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join("\n\n"),
    titleFromSnapshot: (snapshot) => snapshot.title,
    searchText: (snapshot) =>
      [snapshot.title, snapshot.headline, snapshot.objective].join(" "),
    capabilities: {
      wholeItemRegeneration: true,
      fieldRegeneration: false,
      sectionRegeneration: false,
    },
  };

const websitePageDefinition: ContentTypeDefinition<WebsitePageSnapshot> = {
  module: "WEBSITE",
  type: "WEBSITE_PAGE",
  label: "Website page",
  schemaVersion: "1.0",
  snapshotSchema: WebsitePageSnapshotSchema,
  fields: [
    { key: "pageName", label: "Page name", kind: "text", required: true },
    { key: "purpose", label: "Purpose", kind: "textarea", required: true },
    {
      key: "targetAudience",
      label: "Target audience",
      kind: "textarea",
      required: true,
    },
  ],
  copyFormatter: (snapshot) =>
    [
      `# ${snapshot.pageName}`,
      `## ${snapshot.hero.headline}`,
      snapshot.hero.supportingText,
      `CTA: ${snapshot.hero.primaryCTA}`,
      ...snapshot.sections.map((section) => {
        if ("body" in section)
          return `## ${section.heading}\n${section.body}${"callToAction" in section ? `\nCTA: ${section.callToAction}` : ""}`;
        if ("items" in section)
          return `## ${section.heading}\n${section.items
            .map((item) =>
              "question" in item
                ? `### ${item.question}\n${item.answer}`
                : `### ${item.title}\n${item.description}`,
            )
            .join("\n\n")}`;
        return `## ${section.heading}\n${section.steps
          .map((step) => `### ${step.title}\n${step.description}`)
          .join("\n\n")}`;
      }),
    ].join("\n\n"),
  titleFromSnapshot: (snapshot) => snapshot.pageName,
  searchText: (snapshot) =>
    [
      snapshot.pageName,
      snapshot.seo.title,
      snapshot.hero.headline,
      snapshot.seo.primaryKeyword,
    ]
      .filter(Boolean)
      .join(" "),
  capabilities: {
    wholeItemRegeneration: true,
    fieldRegeneration: false,
    sectionRegeneration: true,
  },
};

const socialCapabilities = {
  wholeItemRegeneration: true,
  fieldRegeneration: true,
  sectionRegeneration: false,
} as const;

const socialPostDefinition: ContentTypeDefinition<SocialPostSnapshot> = {
  module: "SOCIAL",
  type: "SOCIAL_POST",
  label: "Social post",
  schemaVersion: "1.0",
  snapshotSchema: SocialPostSnapshotSchema,
  fields: [
    { key: "title", label: "Title", kind: "text", required: true },
    { key: "hook", label: "Hook", kind: "textarea", required: true },
    { key: "body", label: "Body", kind: "textarea", required: true },
    {
      key: "callToAction",
      label: "Call to action",
      kind: "text",
      required: false,
    },
    { key: "notes", label: "Notes", kind: "textarea", required: false },
  ],
  copyFormatter: (snapshot) =>
    [
      snapshot.platform,
      snapshot.objective,
      snapshot.hook,
      snapshot.body,
      snapshot.callToAction,
      formatHashtags(snapshot.hashtags),
    ]
      .filter(Boolean)
      .join("\n\n"),
  titleFromSnapshot: (snapshot) => snapshot.title,
  searchText: (snapshot) =>
    [snapshot.title, snapshot.hook, snapshot.campaignName]
      .filter(Boolean)
      .join(" "),
  capabilities: socialCapabilities,
};

function socialCarouselText(snapshot: SocialCarouselSnapshot) {
  return [
    snapshot.title,
    ...snapshot.slides.map(
      (slide) => `Slide ${slide.ordinal}\n${slide.headline}\n${slide.body}`,
    ),
    snapshot.caption,
    snapshot.closingCallToAction,
    formatHashtags(snapshot.hashtags),
  ]
    .filter(Boolean)
    .join("\n\n");
}

const socialCarouselDefinition: ContentTypeDefinition<SocialCarouselSnapshot> =
  {
    module: "SOCIAL",
    type: "SOCIAL_CAROUSEL",
    label: "Social carousel",
    schemaVersion: "1.0",
    snapshotSchema: SocialCarouselSnapshotSchema,
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "caption", label: "Caption", kind: "textarea", required: true },
      {
        key: "closingCallToAction",
        label: "Closing call to action",
        kind: "text",
        required: false,
      },
      { key: "notes", label: "Notes", kind: "textarea", required: false },
    ],
    copyFormatter: socialCarouselText,
    titleFromSnapshot: (snapshot) => snapshot.title,
    searchText: (snapshot) =>
      [snapshot.title, snapshot.campaignName].filter(Boolean).join(" "),
    capabilities: socialCapabilities,
  };

const socialStoryDefinition: ContentTypeDefinition<SocialStorySnapshot> = {
  module: "SOCIAL",
  type: "SOCIAL_STORY",
  label: "Social story",
  schemaVersion: "1.0",
  snapshotSchema: SocialStorySnapshotSchema,
  fields: [
    { key: "title", label: "Title", kind: "text", required: true },
    {
      key: "finalCallToAction",
      label: "Final call to action",
      kind: "text",
      required: false,
    },
    { key: "notes", label: "Notes", kind: "textarea", required: false },
  ],
  copyFormatter: (snapshot) =>
    [
      snapshot.title,
      ...snapshot.frames.map(
        (frame) =>
          `Frame ${frame.ordinal}\n${frame.headline ?? ""}\n${frame.body}\n${frame.callToAction ?? ""}`,
      ),
      snapshot.finalCallToAction,
    ]
      .filter(Boolean)
      .join("\n\n"),
  titleFromSnapshot: (snapshot) => snapshot.title,
  searchText: (snapshot) =>
    [snapshot.title, snapshot.campaignName].filter(Boolean).join(" "),
  capabilities: {
    ...socialCapabilities,
    fieldRegeneration: false,
  },
};

const socialCaptionDefinition: ContentTypeDefinition<SocialCaptionSnapshot> = {
  module: "SOCIAL",
  type: "SOCIAL_CAPTION",
  label: "Social caption",
  schemaVersion: "1.0",
  snapshotSchema: SocialCaptionSnapshotSchema,
  fields: [
    { key: "title", label: "Title", kind: "text", required: true },
    { key: "caption", label: "Caption", kind: "textarea", required: true },
    {
      key: "callToAction",
      label: "Call to action",
      kind: "text",
      required: false,
    },
    { key: "notes", label: "Notes", kind: "textarea", required: false },
  ],
  copyFormatter: (snapshot) =>
    [snapshot.caption, snapshot.callToAction, formatHashtags(snapshot.hashtags)]
      .filter(Boolean)
      .join("\n\n"),
  titleFromSnapshot: (snapshot) => snapshot.title,
  searchText: (snapshot) =>
    [snapshot.title, snapshot.campaignName].filter(Boolean).join(" "),
  capabilities: socialCapabilities,
};

const adsCapabilities = {
  wholeItemRegeneration: true,
  fieldRegeneration: true,
  sectionRegeneration: false,
  variantRegeneration: true,
} as const;

function adsCopy(snapshot: AdsSnapshot) {
  const header = [
    `${snapshot.campaignObjective}`,
    snapshot.channel,
    snapshot.title,
  ];
  if (snapshot.contentType === "GOOGLE_SEARCH_AD")
    return [
      ...header,
      ...snapshot.variants.map(
        (variant) =>
          `${variant.label}\nHeadlines\n${variant.headlines.join("\n")}\nDescriptions\n${variant.descriptions.join("\n")}\nDisplay path: ${[variant.pathOne, variant.pathTwo].filter(Boolean).join("/")}\nCTA: ${variant.callToAction ?? "—"}\nKeyword themes: ${variant.keywordThemes.join(", ")}`,
      ),
    ].join("\n\n");
  if (snapshot.contentType === "META_AD")
    return [
      ...header,
      ...snapshot.variants.map(
        (variant) =>
          `${variant.label}\n${variant.primaryText}\nHeadline: ${variant.headline}\nDescription: ${variant.description ?? "—"}\nCTA: ${variant.callToAction}\nCreative angle: ${variant.creativeAngle}\nVisual direction: ${variant.visualDirection ?? "—"}`,
      ),
    ].join("\n\n");
  if (snapshot.contentType === "LINKEDIN_AD")
    return [
      ...header,
      ...snapshot.variants.map(
        (variant) =>
          `${variant.label}\n${variant.introductoryText}\nHeadline: ${variant.headline}\nDescription: ${variant.description ?? "—"}\nCTA: ${variant.callToAction}\nProfessional angle: ${variant.professionalAngle}`,
      ),
    ].join("\n\n");
  if (snapshot.contentType === "CREATIVE_BRIEF")
    return [
      ...header,
      `Audience insight\n${snapshot.audienceInsight}`,
      `Campaign promise\n${snapshot.campaignPromise}`,
      `Key message\n${snapshot.keyMessage}`,
      `Support points\n${snapshot.supportPoints.join("\n")}`,
      `Visual direction\n${snapshot.visualDirection.concept}`,
      `Copy direction\n${snapshot.copyDirection.tone}`,
      `Deliverables\n${snapshot.deliverables.join("\n")}`,
      `Exclusions\n${snapshot.visualDirection.exclusions.join("\n")}`,
    ].join("\n\n");
  return [
    ...header,
    ...snapshot.prompts.map(
      (prompt, index) =>
        `Prompt ${index + 1}: ${prompt.label}\nPurpose: ${prompt.purpose}\n${prompt.prompt}\nAspect ratio: ${prompt.aspectRatio ?? "—"}\nComposition: ${prompt.composition ?? "—"}\nLighting: ${prompt.lighting ?? "—"}\nStyle direction: ${prompt.styleDirection ?? "—"}\nNegative instructions: ${prompt.negativeInstructions.join(", ")}\nOverlay-copy guidance: ${prompt.overlayCopyGuidance ?? "—"}`,
    ),
  ].join("\n\n");
}

const googleSearchAdDefinition: ContentTypeDefinition<GoogleSearchAdSnapshot> =
  {
    module: "ADS",
    type: "GOOGLE_SEARCH_AD",
    label: "Google Search ad",
    schemaVersion: "1.0",
    snapshotSchema: GoogleSearchAdSnapshotSchema,
    fields: [{ key: "title", label: "Title", kind: "text", required: true }],
    copyFormatter: adsCopy,
    titleFromSnapshot: (snapshot) => snapshot.title,
    searchText: (snapshot) =>
      [
        snapshot.title,
        snapshot.variants[0]?.headlines[0],
        snapshot.campaignName,
      ]
        .filter(Boolean)
        .join(" "),
    capabilities: adsCapabilities,
  };
const metaAdDefinition: ContentTypeDefinition<MetaAdSnapshot> = {
  module: "ADS",
  type: "META_AD",
  label: "Meta ad",
  schemaVersion: "1.0",
  snapshotSchema: MetaAdSnapshotSchema,
  fields: [{ key: "title", label: "Title", kind: "text", required: true }],
  copyFormatter: adsCopy,
  titleFromSnapshot: (snapshot) => snapshot.title,
  searchText: (snapshot) =>
    [snapshot.title, snapshot.variants[0]?.headline, snapshot.campaignName]
      .filter(Boolean)
      .join(" "),
  capabilities: adsCapabilities,
};
const linkedInAdDefinition: ContentTypeDefinition<LinkedInAdSnapshot> = {
  module: "ADS",
  type: "LINKEDIN_AD",
  label: "LinkedIn ad",
  schemaVersion: "1.0",
  snapshotSchema: LinkedInAdSnapshotSchema,
  fields: [{ key: "title", label: "Title", kind: "text", required: true }],
  copyFormatter: adsCopy,
  titleFromSnapshot: (snapshot) => snapshot.title,
  searchText: (snapshot) =>
    [snapshot.title, snapshot.variants[0]?.headline, snapshot.campaignName]
      .filter(Boolean)
      .join(" "),
  capabilities: adsCapabilities,
};
const creativeBriefDefinition: ContentTypeDefinition<CreativeBriefSnapshot> = {
  module: "ADS",
  type: "CREATIVE_BRIEF",
  label: "Creative brief",
  schemaVersion: "1.0",
  snapshotSchema: CreativeBriefSnapshotSchema,
  fields: [{ key: "title", label: "Title", kind: "text", required: true }],
  copyFormatter: adsCopy,
  titleFromSnapshot: (snapshot) => snapshot.title,
  searchText: (snapshot) =>
    [snapshot.title, snapshot.keyMessage, snapshot.campaignName]
      .filter(Boolean)
      .join(" "),
  capabilities: { ...adsCapabilities, variantRegeneration: false },
};
const imagePromptPackDefinition: ContentTypeDefinition<ImagePromptPackSnapshot> =
  {
    module: "ADS",
    type: "IMAGE_PROMPT_PACK",
    label: "Image prompt pack",
    schemaVersion: "1.0",
    snapshotSchema: ImagePromptPackSnapshotSchema,
    fields: [{ key: "title", label: "Title", kind: "text", required: true }],
    copyFormatter: adsCopy,
    titleFromSnapshot: (snapshot) => snapshot.title,
    searchText: (snapshot) =>
      [snapshot.title, snapshot.prompts[0]?.label, snapshot.campaignName]
        .filter(Boolean)
        .join(" "),
    capabilities: { ...adsCapabilities, variantRegeneration: false },
  };
const adsDefinitions = [
  googleSearchAdDefinition,
  metaAdDefinition,
  linkedInAdDefinition,
  creativeBriefDefinition,
  imagePromptPackDefinition,
] as const;

function videoCopy(snapshot: VideoSnapshot) {
  const header = [
    snapshot.title,
    snapshot.platform,
    snapshot.format,
    snapshot.objective,
  ];
  if (snapshot.contentType === "VIDEO_SCRIPT")
    return [
      ...header,
      `Target duration: ${snapshot.targetDurationSeconds}s`,
      `Hook\n${snapshot.hook.spokenText ?? ""}\n${snapshot.hook.onScreenText ?? ""}\n${snapshot.hook.visualDirection}`,
      ...snapshot.scenes.map(
        (scene) =>
          `Scene ${scene.ordinal}\nPurpose: ${scene.purpose}\nVisual: ${scene.visualDirection}\nShot: ${scene.shotDescription ?? "—"}\nPresenter: ${scene.presenterAction ?? "—"}\nSpoken: ${scene.spokenText ?? "—"}\nVoice-over: ${scene.voiceOver ?? "—"}\nOn-screen: ${scene.onScreenText ?? "—"}\nTransition: ${scene.transition ?? "—"}\nAudio: ${scene.audioDirection ?? "—"}\nEditing: ${scene.editingNotes ?? "—"}`,
      ),
      snapshot.captionSuggestion,
      snapshot.hashtags?.map((tag) => `#${tag}`).join(" "),
      snapshot.productionNotes,
    ]
      .filter(Boolean)
      .join("\n\n");
  if (snapshot.contentType === "SHOT_LIST")
    return [
      ...header,
      ...snapshot.shots.map(
        (shot) =>
          `Shot ${shot.ordinal}\nType: ${shot.shotType}\nFraming: ${shot.framing}\nSubject: ${shot.subject}\nAction: ${shot.action}\nLocation: ${shot.location ?? "—"}\nCamera: ${shot.cameraMovement ?? "—"}\nDuration: ${shot.estimatedDurationSeconds ?? "—"}s\nLighting: ${shot.lightingDirection ?? "—"}\nAudio: ${shot.audioRequirement ?? "—"}\nNotes: ${shot.notes ?? "—"}`,
      ),
      snapshot.productionNotes,
    ]
      .filter(Boolean)
      .join("\n\n");
  if (snapshot.contentType === "VOICE_OVER_SCRIPT")
    return [
      ...header,
      `Tone: ${snapshot.tone}`,
      `Target duration: ${snapshot.targetDurationSeconds}s`,
      ...snapshot.sections.map(
        (section) =>
          `Section ${section.ordinal}\n${section.text}\nDelivery: ${section.deliveryDirection ?? "—"}\nPause: ${section.pauseAfter ? "Yes" : "No"}`,
      ),
      `Pronunciation notes: ${snapshot.pronunciationNotes?.join(", ") ?? "—"}`,
      snapshot.pacingNotes,
    ]
      .filter(Boolean)
      .join("\n\n");
  if (snapshot.contentType === "VIDEO_CAPTION")
    return [
      ...header,
      snapshot.caption,
      `CTA: ${snapshot.callToAction ?? "—"}`,
      snapshot.hashtags.map((tag) => `#${tag}`).join(" "),
      snapshot.accessibilityDescription,
    ]
      .filter(Boolean)
      .join("\n\n");
  return [
    ...header,
    `Concept\n${snapshot.concept}`,
    `Audience\n${snapshot.targetAudience}`,
    `Core message\n${snapshot.coreMessage}`,
    `Desired response\n${snapshot.desiredResponse}`,
    `Visual direction\n${snapshot.visualDirection.style}`,
    `Presenter direction\n${snapshot.presenterDirection?.style ?? "—"}`,
    `Audio direction\n${snapshot.audioDirection?.musicMood ?? "—"}`,
    `Editing direction\n${snapshot.editingDirection.pace}`,
    `Deliverables\n${snapshot.deliverables.join("\n")}`,
    `Constraints\n${snapshot.productionConstraints?.join("\n") ?? "—"}`,
  ].join("\n\n");
}

const videoCapabilities = {
  wholeItemRegeneration: true,
  fieldRegeneration: true,
  sectionRegeneration: false,
  variantRegeneration: false,
} as const;
const videoScriptDefinition: ContentTypeDefinition<VideoScriptSnapshot> = {
  module: "VIDEO",
  type: "VIDEO_SCRIPT",
  label: "Video script",
  schemaVersion: "1.0",
  snapshotSchema: VideoScriptSnapshotSchema,
  fields: [{ key: "title", label: "Title", kind: "text", required: true }],
  copyFormatter: videoCopy,
  titleFromSnapshot: (value) => value.title,
  searchText: (value) =>
    [value.title, value.conceptSummary, value.hook.spokenText]
      .filter(Boolean)
      .join(" "),
  capabilities: { ...videoCapabilities, sceneRegeneration: true },
};
const shotListDefinition: ContentTypeDefinition<ShotListSnapshot> = {
  module: "VIDEO",
  type: "SHOT_LIST",
  label: "Shot list",
  schemaVersion: "1.0",
  snapshotSchema: ShotListSnapshotSchema,
  fields: [{ key: "title", label: "Title", kind: "text", required: true }],
  copyFormatter: videoCopy,
  titleFromSnapshot: (value) => value.title,
  searchText: (value) => value.title,
  capabilities: { ...videoCapabilities, sceneRegeneration: true },
};
const voiceOverDefinition: ContentTypeDefinition<VoiceOverScriptSnapshot> = {
  module: "VIDEO",
  type: "VOICE_OVER_SCRIPT",
  label: "Voice-over script",
  schemaVersion: "1.0",
  snapshotSchema: VoiceOverScriptSnapshotSchema,
  fields: [{ key: "title", label: "Title", kind: "text", required: true }],
  copyFormatter: videoCopy,
  titleFromSnapshot: (value) => value.title,
  searchText: (value) => value.title,
  capabilities: videoCapabilities,
};
const videoCaptionDefinition: ContentTypeDefinition<VideoCaptionSnapshot> = {
  module: "VIDEO",
  type: "VIDEO_CAPTION",
  label: "Video caption",
  schemaVersion: "1.0",
  snapshotSchema: VideoCaptionSnapshotSchema,
  fields: [{ key: "title", label: "Title", kind: "text", required: true }],
  copyFormatter: videoCopy,
  titleFromSnapshot: (value) => value.title,
  searchText: (value) => [value.title, value.caption].join(" "),
  capabilities: videoCapabilities,
};
const videoProductionBriefDefinition: ContentTypeDefinition<VideoProductionBriefSnapshot> =
  {
    module: "VIDEO",
    type: "VIDEO_PRODUCTION_BRIEF",
    label: "Video production brief",
    schemaVersion: "1.0",
    snapshotSchema: VideoProductionBriefSnapshotSchema,
    fields: [{ key: "title", label: "Title", kind: "text", required: true }],
    copyFormatter: videoCopy,
    titleFromSnapshot: (value) => value.title,
    searchText: (value) => [value.title, value.concept].join(" "),
    capabilities: videoCapabilities,
  };
const videoDefinitions = [
  videoScriptDefinition,
  shotListDefinition,
  voiceOverDefinition,
  videoCaptionDefinition,
  videoProductionBriefDefinition,
] as const;

const labelCopyType = (type: string) =>
  type
    .toLocaleLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (value) => value.toLocaleUpperCase());
const formatList = (label: string, values?: readonly string[]) =>
  values?.length
    ? `${label}\n${values.map((value) => `- ${value}`).join("\n")}`
    : null;
const formatSections = (
  values: readonly {
    ordinal: number;
    heading?: string | undefined;
    body?: string | undefined;
    question?: string | undefined;
    answer?: string | undefined;
    keyPoints?: readonly string[] | undefined;
    callToAction?: string | undefined;
  }[],
) =>
  values
    .map((value) =>
      [
        `Section ${value.ordinal}${value.heading ? ` — ${value.heading}` : ""}`,
        value.question,
        value.answer,
        value.body,
        value.keyPoints?.map((point) => `- ${point}`).join("\n"),
        value.callToAction ? `CTA: ${value.callToAction}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

function generalCopyFormatter(snapshot: GeneralCopySnapshot): string {
  const header = [snapshot.title, `Purpose: ${snapshot.purpose}`];
  switch (snapshot.contentType) {
    case "MARKETING_EMAIL":
      return [
        ...header,
        `Subject: ${snapshot.subjectLine}`,
        snapshot.previewText ? `Preview: ${snapshot.previewText}` : null,
        snapshot.greeting,
        snapshot.opening,
        formatSections(snapshot.bodySections),
        snapshot.callToAction
          ? `CTA: ${snapshot.callToAction.label}${snapshot.callToAction.destinationDescription ? ` — ${snapshot.callToAction.destinationDescription}` : ""}`
          : null,
        snapshot.closing,
        snapshot.signatureGuidance,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "NEWSLETTER":
      return [
        ...header,
        `Subject: ${snapshot.subjectLine}`,
        snapshot.previewText,
        snapshot.editionLabel,
        snapshot.introduction,
        formatSections(snapshot.sections),
        snapshot.closing,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "PRODUCT_DESCRIPTION":
      return [
        ...header,
        snapshot.productName,
        snapshot.shortDescription,
        snapshot.fullDescription,
        formatList("Benefits", snapshot.keyBenefits),
        formatList("Features", snapshot.keyFeatures),
        formatList("Ideal for", snapshot.idealFor),
        formatList("Differentiators", snapshot.differentiators),
        snapshot.callToAction ? `CTA: ${snapshot.callToAction}` : null,
        snapshot.seoTitle ? `SEO title: ${snapshot.seoTitle}` : null,
        snapshot.metaDescription
          ? `Meta description: ${snapshot.metaDescription}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "SERVICE_DESCRIPTION":
      return [
        ...header,
        snapshot.serviceName,
        snapshot.shortDescription,
        snapshot.fullDescription,
        formatList("Client challenges", snapshot.clientChallenges),
        formatList("Approach", snapshot.approach),
        formatList("Deliverables", snapshot.deliverables),
        formatList("Benefits", snapshot.benefits),
        snapshot.callToAction ? `CTA: ${snapshot.callToAction}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "BLOG_OUTLINE":
      return [
        ...header,
        snapshot.workingTitle,
        `Thesis: ${snapshot.thesis}`,
        snapshot.introductionGuidance,
        formatSections(snapshot.sections),
        snapshot.conclusionGuidance,
        snapshot.callToAction,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "ARTICLE_DRAFT":
      return [
        ...header,
        snapshot.headline,
        snapshot.dek,
        snapshot.introduction,
        formatSections(snapshot.sections),
        snapshot.conclusion,
        snapshot.callToAction,
        snapshot.seoTitle ? `SEO title: ${snapshot.seoTitle}` : null,
        snapshot.metaDescription
          ? `Meta description: ${snapshot.metaDescription}`
          : null,
        formatList("Fact-check notes", snapshot.factCheckNotes),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "PRESS_RELEASE":
      return [
        ...header,
        snapshot.headline,
        snapshot.subheadline,
        snapshot.dateline,
        snapshot.lead,
        formatSections(snapshot.bodySections),
        ...(snapshot.quotePlaceholders ?? []).map(
          (quote) => `Draft quote — ${quote.speakerRole}\n${quote.quoteDraft}`,
        ),
        `Boilerplate\n${snapshot.boilerplate}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "ANNOUNCEMENT":
      return [
        ...header,
        snapshot.headline,
        `Audience: ${snapshot.audience}`,
        snapshot.opening,
        formatSections(snapshot.details),
        snapshot.requiredAction,
        snapshot.callToAction,
        snapshot.closing,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "FAQ_DOCUMENT":
      return [
        ...header,
        snapshot.introduction,
        ...snapshot.entries.map(
          (entry) =>
            `${entry.ordinal}. ${entry.question}\n${entry.answer}${entry.category ? `\nCategory: ${entry.category}` : ""}`,
        ),
        snapshot.closing,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "CASE_STUDY_OUTLINE":
      return [
        ...header,
        snapshot.executiveSummaryGuidance,
        `Challenge\n${snapshot.challenge.summary}`,
        formatList("Evidence needed", snapshot.challenge.evidenceNeeded),
        `Approach\n${snapshot.approach.summary}`,
        formatList("Steps", snapshot.approach.steps),
        `Results guidance\n${snapshot.results.summaryGuidance}`,
        formatList("Metrics needed", snapshot.results.metricsNeeded),
        formatList("Lessons", snapshot.lessons),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "PROPOSAL_SUMMARY":
      return [
        ...header,
        snapshot.clientContext,
        formatList("Objectives", snapshot.objectives),
        formatList("Approach", snapshot.proposedApproach),
        formatList("Deliverables", snapshot.deliverables),
        formatList("Assumptions", snapshot.assumptions),
        formatList("Exclusions", snapshot.exclusions),
        snapshot.timelineGuidance,
        snapshot.investmentGuidance,
        formatList("Success criteria", snapshot.successCriteria),
        formatList("Next steps", snapshot.nextSteps),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "SALES_ONE_PAGER":
      return [
        ...header,
        snapshot.headline,
        snapshot.subheadline,
        `Problem\n${snapshot.problem}`,
        `Solution\n${snapshot.solution}`,
        formatList("Benefits", snapshot.benefits),
        formatList("Differentiators", snapshot.differentiators),
        formatList("Proof points", snapshot.proofPoints),
        formatList("How it works", snapshot.howItWorks),
        `CTA: ${snapshot.callToAction}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "COMPANY_BIO":
      return [
        ...header,
        `Short bio\n${snapshot.shortBio}`,
        `Medium bio\n${snapshot.mediumBio}`,
        `Long bio\n${snapshot.longBio}`,
        formatList("Key facts", snapshot.keyFacts),
        snapshot.positioningStatement,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "EXECUTIVE_BIO":
      return [
        ...header,
        `${snapshot.personNamePlaceholder} — ${snapshot.rolePlaceholder}`,
        `Short bio\n${snapshot.shortBio}`,
        `Long bio\n${snapshot.longBio}`,
        formatList("Expertise", snapshot.expertiseAreas),
        formatList(
          "Achievement placeholders",
          snapshot.achievementPlaceholders,
        ),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "COPY_BLOCK":
      return [
        ...header,
        `Block type: ${snapshot.blockType}`,
        snapshot.text,
        ...(snapshot.alternatives ?? []).map(
          (alternative) => `${alternative.label}\n${alternative.text}`,
        ),
        snapshot.usageGuidance,
      ]
        .filter(Boolean)
        .join("\n\n");
  }
}

const generalCopyCapabilities = {
  wholeItemRegeneration: true,
  fieldRegeneration: true,
  sectionRegeneration: false,
  variantRegeneration: false,
} as const;
const generalCopyDefinitions = GeneralCopyTypeSchema.options.map((type) => ({
  module: "COPY" as const,
  type,
  label: labelCopyType(type),
  schemaVersion: "1.0",
  snapshotSchema: getGeneralCopySchema(type),
  fields: [
    {
      key: "title" as const,
      label: "Title",
      kind: "text" as const,
      required: true,
    },
  ],
  copyFormatter: generalCopyFormatter,
  titleFromSnapshot: (value: GeneralCopySnapshot) => value.title,
  searchText: (value: GeneralCopySnapshot) => {
    const formatted = generalCopyFormatter(value);
    return `${value.title} ${formatted.slice(0, 1000)}`;
  },
  capabilities: {
    ...generalCopyCapabilities,
    sectionRegeneration: [
      "MARKETING_EMAIL",
      "NEWSLETTER",
      "BLOG_OUTLINE",
      "ARTICLE_DRAFT",
      "PRESS_RELEASE",
      "ANNOUNCEMENT",
      "FAQ_DOCUMENT",
    ].includes(type),
    sceneRegeneration: false,
  },
}));

function calendarFormatter(snapshot: CalendarSnapshot) {
  if (snapshot.contentType === "CAMPAIGN_PLAN")
    return [
      snapshot.title,
      `Campaign: ${snapshot.campaign.name}`,
      `Period: ${snapshot.campaign.startDate} to ${snapshot.campaign.endDate}`,
      `Objective: ${snapshot.campaign.objective}`,
      ...snapshot.channelPlan.map(
        (plan) =>
          `${plan.channel} · ${plan.module}\n${plan.roleInCampaign}\n${plan.plannedContent.map((item) => `- ${item.scheduledDate ?? "Unscheduled"} · ${item.title}`).join("\n")}`,
      ),
      formatList("Risks and dependencies", snapshot.risksOrDependencies),
    ]
      .filter(Boolean)
      .join("\n\n");
  const heading = [
    snapshot.title,
    `Period: ${snapshot.planningPeriod.startDate} to ${snapshot.planningPeriod.endDate}`,
    `Timezone: ${snapshot.planningPeriod.timezone}`,
  ];
  const entries = snapshot.entries.map((entry) =>
    [
      `${entry.scheduledDate}${entry.scheduledTime ? ` ${entry.scheduledTime}` : ""}`,
      `${entry.channel} · ${entry.module}`,
      entry.title,
      `Status: ${entry.status}`,
      entry.objective ? `Objective: ${entry.objective}` : null,
      entry.source.type === "CONTENT_ITEM"
        ? `Source: ${entry.source.sourceTitleSnapshot}`
        : "Source: Planned placeholder",
      "desiredAction" in entry && entry.desiredAction
        ? `Action: ${entry.desiredAction}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    ...heading,
    "strategySummary" in snapshot ? snapshot.strategySummary : null,
    ...entries,
    "recommendations" in snapshot
      ? formatList("Recommendations", snapshot.recommendations)
      : null,
    "risksOrGaps" in snapshot
      ? formatList("Risks or gaps", snapshot.risksOrGaps)
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
const calendarDefinitions = CalendarContentTypeSchema.options.map((type) => ({
  module: "CALENDAR" as const,
  type,
  label: labelCopyType(type),
  schemaVersion: "1.0",
  snapshotSchema: CalendarSnapshotSchema,
  fields: [
    {
      key: "title" as const,
      label: "Title",
      kind: "text" as const,
      required: true,
    },
  ],
  copyFormatter: calendarFormatter,
  titleFromSnapshot: (value: CalendarSnapshot) => value.title,
  searchText: (value: CalendarSnapshot) =>
    calendarFormatter(value).slice(0, 4000),
  capabilities: {
    wholeItemRegeneration: true,
    fieldRegeneration: true,
    sectionRegeneration: true,
    variantRegeneration: false,
    sceneRegeneration: false,
  },
}));

export function getContentTypeDefinition(module: string, type: string) {
  if (module === "COPY" && type === "FOUNDATION_COPY")
    return foundationCopyDefinition;
  if (module === "COPY")
    return (
      generalCopyDefinitions.find((definition) => definition.type === type) ??
      null
    );
  if (module === "CALENDAR")
    return (
      calendarDefinitions.find((definition) => definition.type === type) ?? null
    );
  if (module === "WEBSITE" && type === "WEBSITE_PAGE")
    return websitePageDefinition;
  if (module === "SOCIAL" && type === "SOCIAL_POST")
    return socialPostDefinition;
  if (module === "SOCIAL" && type === "SOCIAL_CAROUSEL")
    return socialCarouselDefinition;
  if (module === "SOCIAL" && type === "SOCIAL_STORY")
    return socialStoryDefinition;
  if (module === "SOCIAL" && type === "SOCIAL_CAPTION")
    return socialCaptionDefinition;
  if (module === "ADS")
    return (
      adsDefinitions.find((definition) => definition.type === type) ?? null
    );
  if (module === "VIDEO")
    return (
      videoDefinitions.find((definition) => definition.type === type) ?? null
    );
  return null;
}

export function getWebsitePageDefinition() {
  return websitePageDefinition;
}

export function parseRegisteredContentSnapshot(
  module: string,
  type: string,
  snapshot: unknown,
):
  | {
      success: true;
      data:
        | FoundationCopySnapshot
        | WebsitePageSnapshot
        | SocialSnapshot
        | AdsSnapshot
        | VideoSnapshot
        | GeneralCopySnapshot
        | CalendarSnapshot;
      title: string;
    }
  | { success: false } {
  if (module === "COPY" && type === "FOUNDATION_COPY") {
    const parsed = FoundationCopySnapshotSchema.safeParse(snapshot);
    return parsed.success
      ? { success: true, data: parsed.data, title: parsed.data.title }
      : { success: false };
  }
  if (module === "COPY") {
    const parsedType = GeneralCopyTypeSchema.safeParse(type);
    if (!parsedType.success) return { success: false };
    const parsed = getGeneralCopySchema(parsedType.data).safeParse(snapshot);
    if (!parsed.success || parsed.data.contentType !== type)
      return { success: false };
    return { success: true, data: parsed.data, title: parsed.data.title };
  }
  if (module === "CALENDAR") {
    const parsed = CalendarSnapshotSchema.safeParse(snapshot);
    if (!parsed.success || parsed.data.contentType !== type)
      return { success: false };
    return { success: true, data: parsed.data, title: parsed.data.title };
  }
  if (module === "WEBSITE" && type === "WEBSITE_PAGE") {
    const parsed = WebsitePageSnapshotSchema.safeParse(snapshot);
    return parsed.success
      ? { success: true, data: parsed.data, title: parsed.data.pageName }
      : { success: false };
  }
  if (module === "SOCIAL") {
    const parsed = SocialSnapshotSchema.safeParse(snapshot);
    if (parsed.success && parsed.data.contentType !== type)
      return { success: false };
    return parsed?.success
      ? {
          success: true,
          data: parsed.data as SocialSnapshot,
          title: parsed.data.title,
        }
      : { success: false };
  }
  if (module === "ADS") {
    const parsed = AdsSnapshotSchema.safeParse(snapshot);
    if (!parsed.success || parsed.data.contentType !== type)
      return { success: false };
    return { success: true, data: parsed.data, title: parsed.data.title };
  }
  if (module === "VIDEO") {
    const parsed = VideoSnapshotSchema.safeParse(snapshot);
    if (!parsed.success || parsed.data.contentType !== type)
      return { success: false };
    return { success: true, data: parsed.data, title: parsed.data.title };
  }
  return { success: false };
}

export function getFoundationCopyDefinition() {
  return foundationCopyDefinition;
}

export function getSocialDefinition(type: string) {
  return getContentTypeDefinition("SOCIAL", type);
}

export function formatSocialContentForCopy(snapshot: SocialSnapshot) {
  if (snapshot.contentType === "SOCIAL_POST")
    return socialPostDefinition.copyFormatter(snapshot);
  if (snapshot.contentType === "SOCIAL_CAROUSEL")
    return socialCarouselDefinition.copyFormatter(snapshot);
  if (snapshot.contentType === "SOCIAL_STORY")
    return socialStoryDefinition.copyFormatter(snapshot);
  return socialCaptionDefinition.copyFormatter(snapshot);
}

export function getAdsDefinition(type: string) {
  return getContentTypeDefinition("ADS", type);
}

export function formatAdsContentForCopy(snapshot: AdsSnapshot) {
  return adsCopy(snapshot);
}

export function getVideoDefinition(type: string) {
  return getContentTypeDefinition("VIDEO", type);
}

export function formatVideoContentForCopy(snapshot: VideoSnapshot) {
  return videoCopy(snapshot);
}

export function getGeneralCopyDefinition(type: string) {
  return getContentTypeDefinition("COPY", type);
}

export function formatGeneralCopyForCopy(snapshot: GeneralCopySnapshot) {
  return generalCopyFormatter(snapshot);
}

export function getCalendarDefinition(type: string) {
  return getContentTypeDefinition("CALENDAR", type);
}

export function formatCalendarForCopy(snapshot: CalendarSnapshot) {
  return calendarFormatter(snapshot);
}
