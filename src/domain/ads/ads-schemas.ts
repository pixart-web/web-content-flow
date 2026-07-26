import { z } from "zod";

import { ContentProvenanceSchema } from "@/domain/content/content-schemas";

const PlainText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/<[a-z][\s\S]*>/i.test(value), "HTML is not allowed.");
const UniqueTextArray = (min: number, max: number, itemMax = 300) =>
  z
    .array(PlainText(1, itemMax))
    .min(min)
    .max(max)
    .superRefine((values, context) => {
      if (
        new Set(values.map((value) => value.toLocaleLowerCase())).size !==
        values.length
      )
        context.addIssue({ code: "custom", message: "Values must be unique." });
    });

export const AdsChannelSchema = z.enum([
  "GOOGLE_SEARCH",
  "META_FACEBOOK",
  "META_INSTAGRAM",
  "LINKEDIN",
]);
export const AdsCampaignObjectiveSchema = z.enum([
  "AWARENESS",
  "TRAFFIC",
  "LEAD_GENERATION",
  "CONVERSIONS",
  "SALES",
  "PRODUCT_LAUNCH",
  "EVENT_PROMOTION",
  "RETARGETING",
]);
export const AdsContentTypeSchema = z.enum([
  "GOOGLE_SEARCH_AD",
  "META_AD",
  "LINKEDIN_AD",
  "CREATIVE_BRIEF",
  "IMAGE_PROMPT_PACK",
]);
export const AdsMockScenarioSchema = z.enum([
  "success",
  "one-asset-failure",
  "invalid-google-ad",
  "invalid-meta-variant",
  "invalid-image-prompt-pack",
  "timeout-linkedin-ad",
  "duplicate-variant-id",
]);
export const AdsRegenerationTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("VARIANT"),
      variantId: z.string().regex(/^[a-z0-9-]{3,64}$/),
    })
    .strict(),
  z
    .object({
      kind: z.literal("PROMPT"),
      promptId: z.string().regex(/^[a-z0-9-]{3,64}$/),
    })
    .strict(),
  z
    .object({
      kind: z.literal("FIELD"),
      field: z.enum([
        "HEADLINES",
        "DESCRIPTIONS",
        "PRIMARY_TEXT",
        "CALL_TO_ACTION",
        "KEYWORD_THEMES",
        "CREATIVE_DIRECTION",
        "IMAGE_PROMPTS",
        "KEY_MESSAGE",
        "VISUAL_DIRECTION",
        "COPY_DIRECTION",
        "NEGATIVE_INSTRUCTIONS",
      ]),
      targetId: z
        .string()
        .regex(/^[a-z0-9-]{3,64}$/)
        .optional(),
    })
    .strict(),
]);

const compatibility: Record<
  z.infer<typeof AdsChannelSchema>,
  readonly z.infer<typeof AdsContentTypeSchema>[]
> = {
  GOOGLE_SEARCH: ["GOOGLE_SEARCH_AD", "CREATIVE_BRIEF", "IMAGE_PROMPT_PACK"],
  META_FACEBOOK: ["META_AD", "CREATIVE_BRIEF", "IMAGE_PROMPT_PACK"],
  META_INSTAGRAM: ["META_AD", "CREATIVE_BRIEF", "IMAGE_PROMPT_PACK"],
  LINKEDIN: ["LINKEDIN_AD", "CREATIVE_BRIEF", "IMAGE_PROMPT_PACK"],
};

export const AdsGenerationRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    campaignName: PlainText(2, 100).optional(),
    campaignObjective: AdsCampaignObjectiveSchema,
    channels: z.array(AdsChannelSchema).min(1).max(4),
    assetTypes: z.array(AdsContentTypeSchema).min(1).max(5),
    offer: z
      .object({
        name: PlainText(2, 120),
        description: PlainText(2, 1200),
        priceOrValue: PlainText(1, 160).optional(),
        differentiators: UniqueTextArray(1, 8),
        proofPoints: UniqueTextArray(0, 8).optional(),
        limitations: UniqueTextArray(0, 8).optional(),
      })
      .strict(),
    audience: z
      .object({
        summary: PlainText(2, 1000),
        painPoints: UniqueTextArray(1, 8),
        desiredOutcomes: UniqueTextArray(1, 8),
        objections: UniqueTextArray(0, 8).optional(),
      })
      .strict(),
    primaryConversionAction: PlainText(2, 160),
    landingPageContext: PlainText(1, 1000).optional(),
    keywordThemes: UniqueTextArray(0, 20, 80).optional(),
    toneOverride: PlainText(1, 80).optional(),
    variantsPerAsset: z.number().int().min(1).max(5),
    outputLanguage: PlainText(2, 80),
    notes: PlainText(1, 1000).optional(),
    mockScenario: AdsMockScenarioSchema.default("success"),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.channels).size !== value.channels.length)
      context.addIssue({
        code: "custom",
        path: ["channels"],
        message: "Choose each channel only once.",
      });
    if (new Set(value.assetTypes).size !== value.assetTypes.length)
      context.addIssue({
        code: "custom",
        path: ["assetTypes"],
        message: "Choose each asset type only once.",
      });
    for (const type of value.assetTypes) {
      if (
        !value.channels.some((channel) => compatibility[channel].includes(type))
      )
        context.addIssue({
          code: "custom",
          path: ["assetTypes"],
          message: `${type} is not compatible with the selected channels.`,
        });
    }
  });

const Base = z.object({
  schemaVersion: z.literal("1.0"),
  channel: AdsChannelSchema,
  campaignObjective: AdsCampaignObjectiveSchema,
  title: PlainText(2, 160),
  campaignName: PlainText(2, 100).optional(),
  campaignNotes: PlainText(1, 1000).optional(),
  complianceNotes: UniqueTextArray(0, 8).optional(),
  provenance: ContentProvenanceSchema,
});
const VariantId = z.string().regex(/^[a-z0-9-]{3,64}$/);
const uniqueIds = (
  values: readonly { id: string }[],
  context: z.RefinementCtx,
) => {
  if (new Set(values.map((value) => value.id)).size !== values.length)
    context.addIssue({
      code: "custom",
      message: "Variant or prompt IDs must be unique.",
    });
};

export const GoogleSearchAdSnapshotSchema = Base.extend({
  contentType: z.literal("GOOGLE_SEARCH_AD"),
  channel: z.literal("GOOGLE_SEARCH"),
  variants: z
    .array(
      z
        .object({
          id: VariantId,
          label: PlainText(1, 40),
          headlines: UniqueTextArray(3, 15, 120),
          descriptions: UniqueTextArray(2, 4, 240),
          pathOne: PlainText(1, 40).optional(),
          pathTwo: PlainText(1, 40).optional(),
          callToAction: PlainText(1, 120).optional(),
          keywordThemes: UniqueTextArray(1, 20, 80),
          rationale: PlainText(1, 500).optional(),
        })
        .strict(),
    )
    .min(1)
    .max(5),
})
  .strict()
  .superRefine((value, context) => uniqueIds(value.variants, context));

export const MetaAdSnapshotSchema = Base.extend({
  contentType: z.literal("META_AD"),
  channel: z.enum(["META_FACEBOOK", "META_INSTAGRAM"]),
  variants: z
    .array(
      z
        .object({
          id: VariantId,
          label: PlainText(1, 40),
          primaryText: PlainText(2, 2200),
          headline: PlainText(2, 240),
          description: PlainText(1, 500).optional(),
          callToAction: PlainText(1, 120),
          creativeAngle: PlainText(2, 500),
          visualDirection: PlainText(1, 1000).optional(),
          rationale: PlainText(1, 500).optional(),
        })
        .strict(),
    )
    .min(1)
    .max(5),
})
  .strict()
  .superRefine((value, context) => uniqueIds(value.variants, context));

export const LinkedInAdSnapshotSchema = Base.extend({
  contentType: z.literal("LINKEDIN_AD"),
  channel: z.literal("LINKEDIN"),
  variants: z
    .array(
      z
        .object({
          id: VariantId,
          label: PlainText(1, 40),
          introductoryText: PlainText(2, 2200),
          headline: PlainText(2, 240),
          description: PlainText(1, 500).optional(),
          callToAction: PlainText(1, 120),
          professionalAngle: PlainText(2, 500),
          rationale: PlainText(1, 500).optional(),
        })
        .strict(),
    )
    .min(1)
    .max(5),
})
  .strict()
  .superRefine((value, context) => uniqueIds(value.variants, context));

export const CreativeBriefSnapshotSchema = Base.extend({
  contentType: z.literal("CREATIVE_BRIEF"),
  audienceInsight: PlainText(2, 1000),
  campaignPromise: PlainText(2, 500),
  keyMessage: PlainText(2, 500),
  supportPoints: UniqueTextArray(1, 8),
  emotionalAngle: PlainText(1, 500).optional(),
  visualDirection: z
    .object({
      concept: PlainText(2, 1000),
      composition: PlainText(1, 500).optional(),
      subject: PlainText(1, 500).optional(),
      environment: PlainText(1, 500).optional(),
      colorDirection: PlainText(1, 500).optional(),
      typographyDirection: PlainText(1, 500).optional(),
      exclusions: UniqueTextArray(0, 12),
    })
    .strict(),
  copyDirection: z
    .object({
      tone: PlainText(2, 300),
      mandatoryMessages: UniqueTextArray(0, 8),
      avoidMessages: UniqueTextArray(0, 8),
    })
    .strict(),
  deliverables: UniqueTextArray(1, 12),
  notes: PlainText(1, 1000).optional(),
}).strict();

export const ImagePromptPackSnapshotSchema = Base.extend({
  contentType: z.literal("IMAGE_PROMPT_PACK"),
  prompts: z
    .array(
      z
        .object({
          id: VariantId,
          label: PlainText(1, 80),
          purpose: PlainText(2, 300),
          prompt: PlainText(10, 3000),
          aspectRatio: PlainText(1, 40).optional(),
          composition: PlainText(1, 500).optional(),
          lighting: PlainText(1, 300).optional(),
          styleDirection: PlainText(1, 500).optional(),
          negativeInstructions: UniqueTextArray(0, 12),
          overlayCopyGuidance: PlainText(1, 500).optional(),
        })
        .strict(),
    )
    .min(1)
    .max(8),
  notes: PlainText(1, 1000).optional(),
})
  .strict()
  .superRefine((value, context) => uniqueIds(value.prompts, context));

export const AdsSnapshotSchema = z.discriminatedUnion("contentType", [
  GoogleSearchAdSnapshotSchema,
  MetaAdSnapshotSchema,
  LinkedInAdSnapshotSchema,
  CreativeBriefSnapshotSchema,
  ImagePromptPackSnapshotSchema,
]);

export const ADS_CHANNEL_TYPE_COMPATIBILITY = compatibility;
export type AdsChannel = z.infer<typeof AdsChannelSchema>;
export type AdsCampaignObjective = z.infer<typeof AdsCampaignObjectiveSchema>;
export type AdsContentType = z.infer<typeof AdsContentTypeSchema>;
export type AdsGenerationRequest = z.infer<typeof AdsGenerationRequestSchema>;
export type AdsSnapshot = z.infer<typeof AdsSnapshotSchema>;
export type GoogleSearchAdSnapshot = z.infer<
  typeof GoogleSearchAdSnapshotSchema
>;
export type MetaAdSnapshot = z.infer<typeof MetaAdSnapshotSchema>;
export type LinkedInAdSnapshot = z.infer<typeof LinkedInAdSnapshotSchema>;
export type CreativeBriefSnapshot = z.infer<typeof CreativeBriefSnapshotSchema>;
export type ImagePromptPackSnapshot = z.infer<
  typeof ImagePromptPackSnapshotSchema
>;
export type AdsRegenerationTarget = z.infer<typeof AdsRegenerationTargetSchema>;
