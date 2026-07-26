import { z } from "zod";

import { ContentProvenanceSchema } from "@/domain/content/content-schemas";

export const SocialPlatformSchema = z.enum([
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "X",
]);
export const SocialObjectiveSchema = z.enum([
  "AWARENESS",
  "EDUCATION",
  "ENGAGEMENT",
  "SALES",
  "LAUNCH",
  "COMMUNITY",
  "TESTIMONIAL",
  "TIPS",
  "PROMOTION",
]);
export const SocialContentTypeSchema = z.enum([
  "SOCIAL_POST",
  "SOCIAL_CAROUSEL",
  "SOCIAL_STORY",
  "SOCIAL_CAPTION",
]);
export const SocialRegenerationTargetSchema = z.enum([
  "POST_BODY",
  "CAROUSEL_CAPTION",
  "STANDALONE_CAPTION",
  "HASHTAGS",
]);

function uniqueEnumArray<T extends z.ZodEnum>(schema: T, label: string) {
  return z
    .array(schema)
    .min(1, `Choose at least one ${label}.`)
    .superRefine((values, context) => {
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: "custom",
          message: `Choose each ${label} only once.`,
        });
    });
}

export const SocialGenerationRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    campaignName: z.string().trim().min(2).max(100).optional(),
    campaignDescription: z.string().trim().min(2).max(800).optional(),
    platforms: uniqueEnumArray(SocialPlatformSchema, "platform").max(4),
    objectives: uniqueEnumArray(SocialObjectiveSchema, "objective").max(6),
    contentTypes: uniqueEnumArray(SocialContentTypeSchema, "content type").max(
      4,
    ),
    quantity: z.number().int().min(1).max(20),
    primaryCallToAction: z.string().trim().max(160).optional(),
    toneOverride: z
      .enum(["INHERIT", "PROFESSIONAL", "CONVERSATIONAL", "DIRECT", "WARM"])
      .default("INHERIT"),
    topic: z.string().trim().max(500).optional(),
    productOrServiceFocus: z.string().trim().max(500).optional(),
    campaignStartContext: z.string().trim().max(500).optional(),
    outputLanguage: z.string().trim().min(2).max(80),
    includeHashtags: z.boolean(),
    notes: z.string().trim().max(1000).optional(),
    mockScenario: z
      .enum([
        "success",
        "one-item-failure",
        "invalid-carousel",
        "timeout-linkedin-post",
        "invalid-hashtags",
      ])
      .default("success"),
  })
  .strict();

const HashtagSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^#/, ""))
  .pipe(
    z
      .string()
      .min(1)
      .max(50)
      .regex(/^[\p{L}\p{N}_]+$/u),
  );

export const HashtagsSchema = z
  .array(HashtagSchema)
  .max(20)
  .superRefine((values, context) => {
    const normalized = values.map((value) => value.toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length)
      context.addIssue({
        code: "custom",
        message: "Hashtags must be unique.",
      });
  });

const SocialBaseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  platform: SocialPlatformSchema,
  objective: SocialObjectiveSchema,
  title: z.string().trim().min(2).max(160),
  campaignName: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  provenance: ContentProvenanceSchema,
});

export const SocialPostSnapshotSchema = SocialBaseSchema.extend({
  contentType: z.literal("SOCIAL_POST"),
  hook: z.string().trim().min(2).max(240),
  body: z.string().trim().min(2).max(3000),
  callToAction: z.string().trim().max(160).optional(),
  hashtags: HashtagsSchema,
})
  .strict()
  .superRefine((value, context) => {
    if (value.platform === "X" && value.body.length > 500)
      context.addIssue({
        code: "custom",
        path: ["body"],
        message: "X posts use a 500-character internal editorial limit.",
      });
  });

const CarouselSlideSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,64}$/),
    ordinal: z.number().int().min(1).max(10),
    headline: z.string().trim().min(2).max(160),
    body: z.string().trim().min(2).max(700),
  })
  .strict();

export const SocialCarouselSnapshotSchema = SocialBaseSchema.extend({
  contentType: z.literal("SOCIAL_CAROUSEL"),
  slides: z.array(CarouselSlideSchema).min(3).max(10),
  closingCallToAction: z.string().trim().max(160).optional(),
  caption: z.string().trim().min(2).max(3000),
  hashtags: HashtagsSchema,
})
  .strict()
  .superRefine((value, context) => {
    const ids = value.slides.map((slide) => slide.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["slides"],
        message: "Slide IDs must be unique.",
      });
    const ordinals = value.slides.map((slide) => slide.ordinal);
    if (new Set(ordinals).size !== ordinals.length)
      context.addIssue({
        code: "custom",
        path: ["slides"],
        message: "Slide order must be unique.",
      });
  });

const StoryFrameSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,64}$/),
    ordinal: z.number().int().min(1).max(8),
    headline: z.string().trim().max(160).optional(),
    body: z.string().trim().min(2).max(700),
    callToAction: z.string().trim().max(160).optional(),
  })
  .strict();

export const SocialStorySnapshotSchema = SocialBaseSchema.extend({
  contentType: z.literal("SOCIAL_STORY"),
  frames: z.array(StoryFrameSchema).min(2).max(8),
  finalCallToAction: z.string().trim().max(160).optional(),
})
  .strict()
  .superRefine((value, context) => {
    const ids = value.frames.map((frame) => frame.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["frames"],
        message: "Frame IDs must be unique.",
      });
    const ordinals = value.frames.map((frame) => frame.ordinal);
    if (new Set(ordinals).size !== ordinals.length)
      context.addIssue({
        code: "custom",
        path: ["frames"],
        message: "Frame order must be unique.",
      });
  });

export const SocialCaptionSnapshotSchema = SocialBaseSchema.extend({
  contentType: z.literal("SOCIAL_CAPTION"),
  caption: z.string().trim().min(2).max(3000),
  callToAction: z.string().trim().max(160).optional(),
  hashtags: HashtagsSchema,
}).strict();

export const SocialSnapshotSchema = z.discriminatedUnion("contentType", [
  SocialPostSnapshotSchema,
  SocialCarouselSnapshotSchema,
  SocialStorySnapshotSchema,
  SocialCaptionSnapshotSchema,
]);

export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;
export type SocialObjective = z.infer<typeof SocialObjectiveSchema>;
export type SocialContentType = z.infer<typeof SocialContentTypeSchema>;
export type SocialGenerationRequest = z.infer<
  typeof SocialGenerationRequestSchema
>;
export type SocialPostSnapshot = z.infer<typeof SocialPostSnapshotSchema>;
export type SocialCarouselSnapshot = z.infer<
  typeof SocialCarouselSnapshotSchema
>;
export type SocialStorySnapshot = z.infer<typeof SocialStorySnapshotSchema>;
export type SocialCaptionSnapshot = z.infer<typeof SocialCaptionSnapshotSchema>;
export type SocialSnapshot = z.infer<typeof SocialSnapshotSchema>;
export type SocialRegenerationTarget = z.infer<
  typeof SocialRegenerationTargetSchema
>;

export function formatHashtags(hashtags: readonly string[]) {
  return hashtags.map((tag) => `#${tag}`).join(" ");
}
