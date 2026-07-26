import { z } from "zod";

import {
  BrandProfileVersionIdSchema,
  ContentItemIdSchema,
  ContentItemVersionIdSchema,
  GenerationModeSchema,
  GenerationModelTierSchema,
  GenerationProviderSchema,
  GenerationPurposeSchema,
  GenerationJobIdSchema,
} from "@/domain/shared/schemas";

export const ContentModuleSchema = z.enum([
  "WEBSITE",
  "SOCIAL",
  "ADS",
  "VIDEO",
  "COPY",
  "CALENDAR",
]);
export const ContentStatusSchema = z.enum([
  "IDEA",
  "DRAFT",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
]);
export const ContentVersionSourceSchema = z.enum([
  "GENERATED",
  "MANUAL_EDIT",
  "REGENERATED",
  "RESTORED",
]);
export const ProofContentTypeSchema = z.literal("FOUNDATION_COPY");

export const ContentProvenanceSchema = z
  .object({
    provider: z.enum(["mock", "openai"]),
    model: z.string().min(1).max(128),
    promptVersion: z.string().min(1).max(32),
    schemaVersion: z.string().min(1).max(32),
    requestId: z.string().min(8).max(128),
    generationJobId: GenerationJobIdSchema.nullable(),
    brandProfileVersionId: BrandProfileVersionIdSchema,
    generatedAt: z.string().datetime(),
    mock: z.boolean(),
    generationMode: GenerationModeSchema.optional(),
    providerName: GenerationProviderSchema.optional(),
    modelTier: GenerationModelTierSchema.optional(),
    promptKey: z.string().min(2).max(160).optional(),
    generationPurpose: GenerationPurposeSchema.optional(),
    repairAttempted: z.boolean().optional(),
    sourceContentItemVersionIds: z
      .array(ContentItemVersionIdSchema)
      .max(200)
      .optional(),
    usageRecordIds: z.array(z.string().min(8).max(128)).max(10).optional(),
  })
  .strict();

export const FoundationCopySnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    title: z.string().trim().min(2).max(160),
    objective: z.string().trim().min(2).max(1000),
    headline: z.string().trim().min(2).max(240),
    body: z.string().trim().min(2).max(6000),
    callToAction: z.string().trim().min(2).max(240),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const ContentItemEnvelopeSchema = z
  .object({
    id: ContentItemIdSchema,
    projectId: z.string().min(8).max(128),
    module: ContentModuleSchema,
    type: z.string().min(2).max(80),
    title: z.string().trim().min(2).max(160),
    status: ContentStatusSchema,
    currentVersionId: ContentItemVersionIdSchema,
    sourceBrandProfileVersionId: BrandProfileVersionIdSchema,
    mock: z.boolean(),
  })
  .strict();

export const ContentRegenerationRequestSchema = z
  .object({
    itemId: ContentItemIdSchema,
    expectedCurrentVersionId: ContentItemVersionIdSchema,
    scenario: z
      .enum(["success", "provider-failure", "invalid-output", "timeout"])
      .default("success"),
  })
  .strict();

export const ContentVersionRestoreRequestSchema = z
  .object({
    itemId: ContentItemIdSchema,
    versionId: ContentItemVersionIdSchema,
    expectedCurrentVersionId: ContentItemVersionIdSchema,
  })
  .strict();

export const LibraryFiltersSchema = z
  .object({
    module: ContentModuleSchema.optional(),
    status: ContentStatusSchema.optional(),
    mock: z.enum(["true", "false"]).optional(),
    query: z.string().trim().max(120).optional(),
    socialPlatform: z
      .enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X"])
      .optional(),
    socialType: z
      .enum([
        "SOCIAL_POST",
        "SOCIAL_CAROUSEL",
        "SOCIAL_STORY",
        "SOCIAL_CAPTION",
      ])
      .optional(),
    campaign: z.string().trim().max(100).optional(),
    adsChannel: z
      .enum(["GOOGLE_SEARCH", "META_FACEBOOK", "META_INSTAGRAM", "LINKEDIN"])
      .optional(),
    adsType: z
      .enum([
        "GOOGLE_SEARCH_AD",
        "META_AD",
        "LINKEDIN_AD",
        "CREATIVE_BRIEF",
        "IMAGE_PROMPT_PACK",
      ])
      .optional(),
    videoPlatform: z
      .enum([
        "INSTAGRAM_REELS",
        "TIKTOK",
        "YOUTUBE_SHORTS",
        "FACEBOOK_REELS",
        "LINKEDIN_VIDEO",
        "GENERIC_VERTICAL_VIDEO",
      ])
      .optional(),
    videoFormat: z
      .enum([
        "SHORT_FORM_VIDEO",
        "REEL",
        "PRODUCT_DEMO",
        "TUTORIAL",
        "TESTIMONIAL_SCRIPT",
        "FOUNDER_MESSAGE",
        "PROMOTIONAL_VIDEO",
        "EDUCATIONAL_VIDEO",
        "BEHIND_THE_SCENES",
      ])
      .optional(),
    videoType: z
      .enum([
        "VIDEO_SCRIPT",
        "SHOT_LIST",
        "VOICE_OVER_SCRIPT",
        "VIDEO_CAPTION",
        "VIDEO_PRODUCTION_BRIEF",
      ])
      .optional(),
    copyType: z
      .enum([
        "MARKETING_EMAIL",
        "NEWSLETTER",
        "PRODUCT_DESCRIPTION",
        "SERVICE_DESCRIPTION",
        "BLOG_OUTLINE",
        "ARTICLE_DRAFT",
        "PRESS_RELEASE",
        "ANNOUNCEMENT",
        "FAQ_DOCUMENT",
        "CASE_STUDY_OUTLINE",
        "PROPOSAL_SUMMARY",
        "SALES_ONE_PAGER",
        "COMPANY_BIO",
        "EXECUTIVE_BIO",
        "COPY_BLOCK",
      ])
      .optional(),
    copyPurpose: z
      .enum([
        "INFORM",
        "EDUCATE",
        "PERSUADE",
        "CONVERT",
        "ANNOUNCE",
        "NURTURE",
        "EXPLAIN",
        "POSITION",
        "RETAIN",
        "SUPPORT_SALES",
      ])
      .optional(),
    calendarType: z
      .enum(["EDITORIAL_CALENDAR", "CAMPAIGN_PLAN", "CONTENT_SCHEDULE"])
      .optional(),
    calendarStart: z.iso.date().optional(),
    calendarEnd: z.iso.date().optional(),
  })
  .strict();

export type ContentModule = z.infer<typeof ContentModuleSchema>;
export type ContentStatus = z.infer<typeof ContentStatusSchema>;
export type FoundationCopySnapshot = z.infer<
  typeof FoundationCopySnapshotSchema
>;
export type ContentProvenance = z.infer<typeof ContentProvenanceSchema>;
