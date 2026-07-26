import { z } from "zod";

import { ContentProvenanceSchema } from "@/domain/content/content-schemas";

const Text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/<[a-z][\s\S]*>/i.test(value), "HTML is not allowed.");
const UniqueText = (min: number, max: number, itemMax = 300) =>
  z
    .array(Text(1, itemMax))
    .min(min)
    .max(max)
    .superRefine((values, context) => {
      if (
        new Set(values.map((value) => value.toLocaleLowerCase())).size !==
        values.length
      )
        context.addIssue({ code: "custom", message: "Values must be unique." });
    });
const StableId = z.string().regex(/^[a-z0-9-]{3,64}$/);

export const VideoPlatformSchema = z.enum([
  "INSTAGRAM_REELS",
  "TIKTOK",
  "YOUTUBE_SHORTS",
  "FACEBOOK_REELS",
  "LINKEDIN_VIDEO",
  "GENERIC_VERTICAL_VIDEO",
]);
export const VideoFormatSchema = z.enum([
  "SHORT_FORM_VIDEO",
  "REEL",
  "PRODUCT_DEMO",
  "TUTORIAL",
  "TESTIMONIAL_SCRIPT",
  "FOUNDER_MESSAGE",
  "PROMOTIONAL_VIDEO",
  "EDUCATIONAL_VIDEO",
  "BEHIND_THE_SCENES",
]);
export const VideoObjectiveSchema = z.enum([
  "AWARENESS",
  "EDUCATION",
  "ENGAGEMENT",
  "LEAD_GENERATION",
  "CONVERSIONS",
  "SALES",
  "PRODUCT_LAUNCH",
  "COMMUNITY",
  "TRUST_BUILDING",
]);
export const VideoDurationRangeSchema = z.enum([
  "UP_TO_15_SECONDS",
  "UP_TO_30_SECONDS",
  "UP_TO_60_SECONDS",
  "UP_TO_90_SECONDS",
  "CUSTOM",
]);
export const PresenterStyleSchema = z.enum([
  "NO_PRESENTER",
  "FOUNDER_TO_CAMERA",
  "EXPERT_TO_CAMERA",
  "VOICE_OVER",
  "CUSTOMER_STYLE",
  "PRODUCT_ONLY",
  "MIXED",
]);
export const VideoContentTypeSchema = z.enum([
  "VIDEO_SCRIPT",
  "SHOT_LIST",
  "VOICE_OVER_SCRIPT",
  "VIDEO_CAPTION",
  "VIDEO_PRODUCTION_BRIEF",
]);
export const VideoShotTypeSchema = z.enum([
  "WIDE",
  "MEDIUM",
  "CLOSE_UP",
  "EXTREME_CLOSE_UP",
  "OVER_THE_SHOULDER",
  "POINT_OF_VIEW",
  "SCREEN_RECORDING",
  "PRODUCT_DETAIL",
  "B_ROLL",
  "CUSTOM",
]);
export const VideoMockScenarioSchema = z.enum([
  "success",
  "one-asset-failure",
  "invalid-scene-duration",
  "duplicate-scene-id",
  "invalid-shot-list",
  "timeout-voice-over",
  "invalid-video-caption",
]);
export const VideoRegenerationTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SCENE"), sceneId: StableId }).strict(),
  z.object({ kind: z.literal("SHOT"), shotId: StableId }).strict(),
  z
    .object({
      kind: z.literal("FIELD"),
      field: z.enum([
        "HOOK",
        "VOICE_OVER",
        "ON_SCREEN_TEXT",
        "VIDEO_CAPTION",
        "HASHTAGS",
        "CALL_TO_ACTION",
        "VISUAL_DIRECTION",
        "EDITING_DIRECTION",
      ]),
    })
    .strict(),
]);

function uniqueEnums<T extends z.ZodEnum>(
  schema: T,
  label: string,
  max: number,
) {
  return z
    .array(schema)
    .min(1, `Choose at least one ${label}.`)
    .max(max)
    .superRefine((values, context) => {
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: "custom",
          message: `Choose each ${label} only once.`,
        });
    });
}

export const VideoGenerationRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    campaignName: Text(2, 100).optional(),
    platforms: uniqueEnums(VideoPlatformSchema, "platform", 6),
    formats: uniqueEnums(VideoFormatSchema, "format", 9),
    objectives: uniqueEnums(VideoObjectiveSchema, "objective", 9),
    assetTypes: uniqueEnums(VideoContentTypeSchema, "asset type", 5),
    conceptCount: z.number().int().min(1).max(10),
    duration: z
      .object({
        range: VideoDurationRangeSchema,
        customSeconds: z.number().int().min(5).max(180).optional(),
      })
      .strict(),
    topic: Text(2, 800),
    audienceSummary: Text(2, 1000).optional(),
    productOrServiceFocus: Text(2, 500).optional(),
    coreMessage: Text(2, 500).optional(),
    primaryCallToAction: Text(2, 160).optional(),
    presenterStyle: PresenterStyleSchema.default("MIXED"),
    visualStyle: Text(2, 500).optional(),
    filmingConstraints: UniqueText(0, 10).optional(),
    availableAssets: UniqueText(0, 10).optional(),
    outputLanguage: Text(2, 80),
    includeOnScreenText: z.boolean(),
    includeVoiceOver: z.boolean(),
    includeCaption: z.boolean(),
    includeShotList: z.boolean(),
    notes: Text(1, 1000).optional(),
    mockScenario: VideoMockScenarioSchema.default("success"),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.duration.range === "CUSTOM" &&
      value.duration.customSeconds === undefined
    )
      context.addIssue({
        code: "custom",
        path: ["duration", "customSeconds"],
        message: "Enter a custom duration from 5 to 180 seconds.",
      });
    if (
      value.duration.range !== "CUSTOM" &&
      value.duration.customSeconds !== undefined
    )
      context.addIssue({
        code: "custom",
        path: ["duration", "customSeconds"],
        message: "Custom seconds are only valid for a custom duration.",
      });
    if (
      value.assetTypes.includes("VOICE_OVER_SCRIPT") &&
      !value.includeVoiceOver
    )
      context.addIssue({
        code: "custom",
        path: ["assetTypes"],
        message: "Voice-over scripts require voice-over inclusion.",
      });
    if (value.assetTypes.includes("VIDEO_CAPTION") && !value.includeCaption)
      context.addIssue({
        code: "custom",
        path: ["assetTypes"],
        message: "Video captions require caption inclusion.",
      });
    if (value.assetTypes.includes("SHOT_LIST") && !value.includeShotList)
      context.addIssue({
        code: "custom",
        path: ["assetTypes"],
        message: "Shot lists require shot-list inclusion.",
      });
  });

const Base = z.object({
  schemaVersion: z.literal("1.0"),
  platform: VideoPlatformSchema,
  format: VideoFormatSchema,
  objective: VideoObjectiveSchema,
  title: Text(2, 160),
  campaignName: Text(2, 100).optional(),
  provenance: ContentProvenanceSchema,
});

const orderedUnique = (
  values: readonly { id: string; ordinal: number }[],
  context: z.RefinementCtx,
) => {
  if (new Set(values.map((value) => value.id)).size !== values.length)
    context.addIssue({ code: "custom", message: "IDs must be unique." });
  if (new Set(values.map((value) => value.ordinal)).size !== values.length)
    context.addIssue({
      code: "custom",
      message: "Order values must be unique.",
    });
};

export const VideoSceneSchema = z
  .object({
    id: StableId,
    ordinal: z.number().int().min(1).max(20),
    estimatedDurationSeconds: z.number().int().min(1).max(180),
    purpose: Text(2, 500),
    visualDirection: Text(2, 1000),
    shotDescription: Text(1, 500).optional(),
    presenterAction: Text(1, 500).optional(),
    spokenText: Text(1, 1000).optional(),
    voiceOver: Text(1, 1500).optional(),
    onScreenText: Text(1, 500).optional(),
    transition: Text(1, 300).optional(),
    audioDirection: Text(1, 500).optional(),
    editingNotes: Text(1, 500).optional(),
  })
  .strict();

export const VideoScriptSnapshotSchema = Base.extend({
  contentType: z.literal("VIDEO_SCRIPT"),
  conceptSummary: Text(2, 1000),
  targetDurationSeconds: z.number().int().min(5).max(180),
  hook: z
    .object({
      spokenText: Text(1, 500).optional(),
      onScreenText: Text(1, 300).optional(),
      visualDirection: Text(2, 500),
    })
    .strict(),
  scenes: z.array(VideoSceneSchema).min(2).max(20),
  closingCallToAction: z
    .object({
      spokenText: Text(1, 300).optional(),
      onScreenText: Text(1, 200).optional(),
      visualDirection: Text(1, 500).optional(),
    })
    .strict()
    .optional(),
  captionSuggestion: Text(1, 2200).optional(),
  hashtags: UniqueText(0, 20, 50).optional(),
  productionNotes: Text(1, 1500).optional(),
})
  .strict()
  .superRefine((value, context) => {
    orderedUnique(value.scenes, context);
    const total = value.scenes.reduce(
      (sum, scene) => sum + scene.estimatedDurationSeconds,
      0,
    );
    if (
      total < value.targetDurationSeconds * 0.7 ||
      total > value.targetDurationSeconds * 1.3
    )
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "Scene duration must total 70%–130% of the target duration.",
      });
  });

export const ShotListSnapshotSchema = Base.extend({
  contentType: z.literal("SHOT_LIST"),
  targetDurationSeconds: z.number().int().min(5).max(180),
  shots: z
    .array(
      z
        .object({
          id: StableId,
          ordinal: z.number().int().min(1).max(30),
          sceneReferenceId: StableId.optional(),
          shotType: VideoShotTypeSchema,
          framing: Text(2, 300),
          subject: Text(2, 300),
          action: Text(2, 500),
          location: Text(1, 300).optional(),
          props: UniqueText(0, 10).optional(),
          cameraMovement: Text(1, 300).optional(),
          estimatedDurationSeconds: z.number().int().min(1).max(180).optional(),
          lightingDirection: Text(1, 300).optional(),
          audioRequirement: Text(1, 300).optional(),
          notes: Text(1, 500).optional(),
        })
        .strict(),
    )
    .min(2)
    .max(30),
  equipmentNotes: UniqueText(0, 10).optional(),
  productionNotes: Text(1, 1500).optional(),
})
  .strict()
  .superRefine((value, context) => orderedUnique(value.shots, context));

export const VoiceOverScriptSnapshotSchema = Base.extend({
  contentType: z.literal("VOICE_OVER_SCRIPT"),
  targetDurationSeconds: z.number().int().min(5).max(180),
  tone: Text(2, 300),
  sections: z
    .array(
      z
        .object({
          id: StableId,
          ordinal: z.number().int().min(1).max(20),
          sceneReferenceId: StableId.optional(),
          text: Text(2, 1500),
          deliveryDirection: Text(1, 500).optional(),
          pauseAfter: z.boolean().optional(),
        })
        .strict(),
    )
    .min(1)
    .max(20),
  pronunciationNotes: UniqueText(0, 10).optional(),
  pacingNotes: Text(1, 500).optional(),
})
  .strict()
  .superRefine((value, context) => orderedUnique(value.sections, context));

const Hashtag = z
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
export const VideoCaptionSnapshotSchema = Base.extend({
  contentType: z.literal("VIDEO_CAPTION"),
  caption: Text(2, 3000),
  callToAction: Text(1, 160).optional(),
  hashtags: z
    .array(Hashtag)
    .max(20)
    .superRefine((values, context) => {
      if (
        new Set(values.map((value) => value.toLocaleLowerCase())).size !==
        values.length
      )
        context.addIssue({
          code: "custom",
          message: "Hashtags must be unique.",
        });
    }),
  accessibilityDescription: Text(1, 1000).optional(),
  notes: Text(1, 1000).optional(),
}).strict();

export const VideoProductionBriefSnapshotSchema = Base.extend({
  contentType: z.literal("VIDEO_PRODUCTION_BRIEF"),
  concept: Text(2, 1000),
  targetAudience: Text(2, 1000),
  coreMessage: Text(2, 500),
  desiredResponse: Text(2, 500),
  targetDurationSeconds: z.number().int().min(5).max(180),
  visualDirection: z
    .object({
      style: Text(2, 500),
      composition: Text(1, 500).optional(),
      environment: Text(1, 500).optional(),
      colorDirection: Text(1, 500).optional(),
      lightingDirection: Text(1, 500).optional(),
      wardrobeDirection: Text(1, 500).optional(),
      propDirection: Text(1, 500).optional(),
      avoid: UniqueText(0, 12),
    })
    .strict(),
  presenterDirection: z
    .object({
      style: PresenterStyleSchema,
      delivery: Text(1, 500).optional(),
      positioning: Text(1, 500).optional(),
      gestures: Text(1, 500).optional(),
    })
    .strict()
    .optional(),
  audioDirection: z
    .object({
      musicMood: Text(1, 300).optional(),
      soundEffects: UniqueText(0, 10).optional(),
      voiceOverDirection: Text(1, 500).optional(),
    })
    .strict()
    .optional(),
  editingDirection: z
    .object({
      pace: Text(2, 300),
      transitions: UniqueText(0, 10).optional(),
      textTreatment: Text(1, 500).optional(),
      captionTreatment: Text(1, 500).optional(),
    })
    .strict(),
  deliverables: UniqueText(1, 12),
  productionConstraints: UniqueText(0, 12).optional(),
  notes: Text(1, 1000).optional(),
}).strict();

export const VideoSnapshotSchema = z.discriminatedUnion("contentType", [
  VideoScriptSnapshotSchema,
  ShotListSnapshotSchema,
  VoiceOverScriptSnapshotSchema,
  VideoCaptionSnapshotSchema,
  VideoProductionBriefSnapshotSchema,
]);

export const durationSeconds = (
  duration: z.infer<typeof VideoGenerationRequestSchema>["duration"],
) =>
  duration.range === "CUSTOM"
    ? duration.customSeconds!
    : {
        UP_TO_15_SECONDS: 15,
        UP_TO_30_SECONDS: 30,
        UP_TO_60_SECONDS: 60,
        UP_TO_90_SECONDS: 90,
      }[duration.range];

export type VideoPlatform = z.infer<typeof VideoPlatformSchema>;
export type VideoFormat = z.infer<typeof VideoFormatSchema>;
export type VideoObjective = z.infer<typeof VideoObjectiveSchema>;
export type PresenterStyle = z.infer<typeof PresenterStyleSchema>;
export type VideoContentType = z.infer<typeof VideoContentTypeSchema>;
export type VideoGenerationRequest = z.infer<
  typeof VideoGenerationRequestSchema
>;
export type VideoRegenerationTarget = z.infer<
  typeof VideoRegenerationTargetSchema
>;
export type VideoSnapshot = z.infer<typeof VideoSnapshotSchema>;
export type VideoScriptSnapshot = z.infer<typeof VideoScriptSnapshotSchema>;
export type ShotListSnapshot = z.infer<typeof ShotListSnapshotSchema>;
export type VoiceOverScriptSnapshot = z.infer<
  typeof VoiceOverScriptSnapshotSchema
>;
export type VideoCaptionSnapshot = z.infer<typeof VideoCaptionSnapshotSchema>;
export type VideoProductionBriefSnapshot = z.infer<
  typeof VideoProductionBriefSnapshotSchema
>;
