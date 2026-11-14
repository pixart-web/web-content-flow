import "server-only";

import type { z } from "zod";

import {
  loadPromptCatalog,
  getPrompt,
  CURRENT_PROMPT_VERSION,
} from "@/ai/prompts/registry";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import {
  CopyGenerationRequestSchema,
  getGeneralCopySchema,
  type GeneralCopyType,
} from "@/domain/copy/copy-schemas";
import { AdsSnapshotSchema } from "@/domain/ads/ads-schemas";
import {
  CalendarGenerationRequestSchema,
  EditorialCalendarSnapshotSchema,
} from "@/domain/calendar/calendar-schemas";
import { SocialSnapshotSchema } from "@/domain/social/social-schemas";
import { VideoSnapshotSchema } from "@/domain/video/video-schemas";
import { WebsitePageSnapshotSchema } from "@/domain/website/website-schemas";
import { MockProvider } from "@/server/ai/providers/mock-provider";

// Fixed, synthetic evaluation inputs (fictional UrbanStride brand). The suite
// version changes whenever cases or scoring change, so reports stay comparable.
export const EVALUATION_SUITE_VERSION = "1.4.0";

const brief = {
  schemaVersion: "1.0",
  project: {
    projectName: "UrbanStride Launch",
    brandName: "UrbanStride",
    projectType: "E-commerce",
    businessDescription: "An online footwear business for urban commuters.",
    productOrService: "Comfortable walking shoes designed for daily city use.",
    currentWebsite: "https://example.invalid",
  },
  audience: {
    targetAudience: "Urban professionals who walk or commute daily",
    ageRange: "25–45",
    location: "European cities",
    interests: ["walking", "design"],
    customerProblem: "Daily footwear is uncomfortable or visually generic.",
    valueProposition: "Comfort and considered design for every city journey.",
  },
  objective: {
    primaryObjective: "Launch the first direct-to-consumer collection",
    desiredCustomerAction: "Explore the collection",
    primaryOffer: "Versatile city shoes with all-day comfort",
    campaignContext: "Fictional launch campaign",
  },
  direction: {
    toneOfVoice: "Clear, confident, practical",
    visualStyle: "Editorial urban photography with structured layouts",
    preferredColors: ["navy", "blue"],
    colorsToAvoid: ["neon"],
    keywords: ["movement", "comfort"],
    competitors: [],
    referenceWebsites: [],
  },
  languageModules: {
    outputLanguage: "English",
    selectedModules: ["WEBSITE", "SOCIAL"],
  },
} as const;

export type EvaluationCase = Readonly<{
  id: string;
  promptKey: string;
  schema: z.ZodType<unknown>;
  context: unknown;
  systemInstructions: string;
  userMessage: string;
  maximumOutputTokens: number;
  repair: "NONE" | "STRUCTURE_ONCE";
  safetyNotes: readonly string[];
  wordsToAvoid: readonly string[];
}>;

const copyTypes: readonly GeneralCopyType[] = [
  "MARKETING_EMAIL",
  "PRODUCT_DESCRIPTION",
  "FAQ_DOCUMENT",
];

export async function buildEvaluationCases(): Promise<EvaluationCase[]> {
  await loadPromptCatalog();
  const brandProfile = (
    await new MockProvider().generateStructured(
      {
        input: brief,
        requestId: "evaluation-brand-profile",
        model: "deterministic-mock-v1",
        promptVersion: CURRENT_PROMPT_VERSION,
        schemaVersion: "1.0",
        timeoutMs: 10_000,
      },
      BrandProfileSchema,
    )
  ).data;
  const settings = CopyGenerationRequestSchema.parse({
    schemaVersion: "1.0",
    campaignName: "UrbanStride fictional launch",
    copyTypes,
    quantity: copyTypes.length,
    purpose: "CONVERT",
    topic: "Comfort and considered design for every city journey",
    audience: {
      summary: "Urban professionals who walk or commute daily",
      awarenessLevel: "SOLUTION_AWARE",
      painPoints: ["Uncomfortable daily footwear"],
      desiredOutcomes: ["Comfort throughout the day"],
    },
    productOrServiceFocus: "UrbanStride city footwear",
    desiredAction: "Explore the fictional collection",
    toneOverride: "BRAND_DEFAULT",
    lengthPreference: { value: "MEDIUM" },
    outputLanguage: "English",
  });

  const calendarSettings = CalendarGenerationRequestSchema.parse({
    schemaVersion: "1.0",
    calendarType: "EDITORIAL_CALENDAR",
    planningPeriod: {
      startDate: "2026-12-07",
      endDate: "2027-01-03",
      timezone: "Europe/Lisbon",
    },
    modules: ["WEBSITE", "SOCIAL", "ADS", "VIDEO"],
    channels: ["WEBSITE", "INSTAGRAM", "META_ADS"],
    cadence: {
      weeklyTarget: 4,
      preferredWeekdays: ["MONDAY", "WEDNESDAY", "FRIDAY", "SATURDAY"],
      preferredTimeSlots: ["MORNING", "EVENING"],
    },
    objectives: ["PRODUCT_LAUNCH", "AWARENESS"],
    sourceSelection: {
      strategy: "MIX_EXISTING_AND_NEW",
      includeUnscheduledExistingContent: true,
      allowPlannedPlaceholders: true,
    },
    outputLanguage: "English",
  });
  const calendarWeek = { startDate: "2026-12-07", endDate: "2026-12-13" };
  const calendarSources = (
    [
      ["website-home", "Home", "HOME", "WEBSITE"],
      ["social-post", "Launch post", "SOCIAL_POST", "SOCIAL"],
      ["meta-ad", "City collection ad", "META_AD", "ADS"],
      ["reel-script", "Launch reel", "VIDEO_SCRIPT", "VIDEO"],
    ] as const
  ).map(([key, title, type, module]) => ({
    contentItemId: `evaluation-item-${key}`,
    contentItemVersionId: `evaluation-version-${key}`,
    sourceTitleSnapshot: title,
    sourceType: type,
    sourceModule: module,
    sourceMock: true,
    sourceBrandProfileVersionId: "evaluation-brand-profile-v1",
  }));

  const definitions: {
    id: string;
    promptKey: string;
    schema: z.ZodType<unknown>;
    context: unknown;
  }[] = [
    {
      id: "brand_profile",
      promptKey: "brand_profile.brand_profile.generation",
      schema: BrandProfileSchema,
      context: { briefRevision: 1, brief },
    },
    ...copyTypes.map((contentType, index) => ({
      id: `copy.${contentType.toLocaleLowerCase()}`,
      promptKey: `copy.${contentType.toLocaleLowerCase()}.generation`,
      schema: getGeneralCopySchema(contentType) as z.ZodType<unknown>,
      context: {
        request: {
          kind: "COPY_ITEM_NEW",
          itemKey: `evaluation-${contentType.toLocaleLowerCase()}`,
          contentType,
          ordinal: index + 1,
          settings,
          brandProfileVersionId: "evaluation-brand-profile-v1",
        },
        brandProfile,
      },
    })),
    // One representative item per remaining module, with the same
    // { request, brandProfile } context the worker handlers send.
    {
      id: "website.home",
      promptKey: "website.home.generation",
      schema: WebsitePageSnapshotSchema,
      context: {
        request: {
          kind: "WEBSITE_PAGE_NEW",
          pageKey: "home",
          pageType: "HOME",
          pageName: "Home",
          purpose: "Introduce UrbanStride and lead visitors to the collection",
          brandProfileVersionId: "evaluation-brand-profile-v1",
        },
        brandProfile,
      },
    },
    {
      id: "social.instagram_post",
      promptKey: "social.social_post.generation",
      schema: SocialSnapshotSchema,
      context: {
        request: {
          kind: "SOCIAL_ITEM_NEW",
          itemKey: "evaluation-social-post",
          contentType: "SOCIAL_POST",
          platform: "INSTAGRAM",
          objective: "LAUNCH",
          ordinal: 1,
          campaignName: "UrbanStride fictional launch",
          topic: "Comfort and considered design for every city journey",
          includeHashtags: true,
          primaryCallToAction: "Explore the collection",
          brandProfileVersionId: "evaluation-brand-profile-v1",
        },
        brandProfile,
      },
    },
    {
      id: "ads.meta_ad",
      promptKey: "ads.meta_ad.generation",
      schema: AdsSnapshotSchema,
      context: {
        request: {
          kind: "ADS_ITEM_NEW",
          itemKey: "evaluation-meta-ad",
          contentType: "META_AD",
          channel: "META_INSTAGRAM",
          campaignObjective: "PRODUCT_LAUNCH",
          variantsPerAsset: 3,
          campaignName: "UrbanStride fictional launch",
          offerName: "City collection",
          offerDescription: "Versatile city shoes with all-day comfort",
          conversionAction: "Explore the collection",
          keywordThemes: ["city walking shoes", "comfortable commuter shoes"],
          brandProfileVersionId: "evaluation-brand-profile-v1",
        },
        brandProfile,
      },
    },
    {
      id: "video.reel_script",
      promptKey: "video.video_script.generation",
      schema: VideoSnapshotSchema,
      context: {
        request: {
          kind: "VIDEO_ITEM_NEW",
          itemKey: "evaluation-video-script",
          contentType: "VIDEO_SCRIPT",
          platform: "INSTAGRAM_REELS",
          format: "REEL",
          objective: "PRODUCT_LAUNCH",
          targetDurationSeconds: 30,
          conceptOrdinal: 1,
          topic: "Comfort and considered design for every city journey",
          campaignName: "UrbanStride fictional launch",
          presenterStyle: "VOICE_OVER",
          primaryCallToAction: "Explore the collection",
          includeOnScreenText: true,
          includeVoiceOver: true,
          brandProfileVersionId: "evaluation-brand-profile-v1",
        },
        brandProfile,
      },
    },
    // Calendar plans one week at a time from items other modules generated;
    // the context mirrors calendar-handler (planningPeriod, settings,
    // sourceVersions) with four fixed source items.
    {
      id: "calendar.editorial_week",
      promptKey: "calendar.editorial_calendar.generation",
      schema: EditorialCalendarSnapshotSchema.shape
        .entries as z.ZodType<unknown>,
      context: {
        planningPeriod: calendarWeek,
        settings: calendarSettings,
        sourceVersions: calendarSources,
      },
    },
  ];

  return definitions.map((definition) => {
    const prompt = getPrompt(definition.promptKey, CURRENT_PROMPT_VERSION);
    if (!prompt)
      throw new Error(
        `Evaluation case ${definition.id} has no registered prompt.`,
      );
    const context = prompt.inputSchema.parse(definition.context);
    return {
      ...definition,
      context,
      systemInstructions: prompt.systemInstructions,
      userMessage: prompt.buildUserMessage(context),
      maximumOutputTokens: prompt.maximumOutputTokens,
      repair: prompt.repairPolicy,
      safetyNotes: prompt.safetyNotes,
      wordsToAvoid: brandProfile.wordsToAvoid,
    };
  });
}
