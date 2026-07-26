import { describe, expect, it } from "vitest";

import {
  AdsGenerationRequestSchema,
  AdsSnapshotSchema,
  CreativeBriefSnapshotSchema,
  GoogleSearchAdSnapshotSchema,
  ImagePromptPackSnapshotSchema,
} from "./ads-schemas";

const request = {
  schemaVersion: "1.0",
  campaignObjective: "CONVERSIONS",
  channels: ["GOOGLE_SEARCH", "META_INSTAGRAM"],
  assetTypes: ["GOOGLE_SEARCH_AD", "META_AD", "CREATIVE_BRIEF"],
  offer: {
    name: "UrbanStride launch",
    description: "Fictional footwear for daily city movement.",
    differentiators: ["Everyday comfort"],
  },
  audience: {
    summary: "Urban professionals who walk and commute.",
    painPoints: ["Uncomfortable footwear"],
    desiredOutcomes: ["Comfort through the day"],
  },
  primaryConversionAction: "Explore the collection",
  variantsPerAsset: 2,
  outputLanguage: "English",
  mockScenario: "success",
} as const;

const provenance = {
  provider: "mock",
  model: "mock-ads-v1",
  promptVersion: "ads-creative-1.0",
  schemaVersion: "1.0",
  requestId: "request-1234",
  generationJobId: null,
  brandProfileVersionId: "profile-version-1234",
  generatedAt: "2026-01-01T00:00:00.000Z",
  mock: true,
} as const;

describe("Ads contracts", () => {
  it("validates bounded compatible requests", () => {
    expect(AdsGenerationRequestSchema.parse(request).variantsPerAsset).toBe(2);
    expect(
      AdsGenerationRequestSchema.safeParse({ ...request, channels: [] })
        .success,
    ).toBe(false);
    expect(
      AdsGenerationRequestSchema.safeParse({
        ...request,
        channels: ["LINKEDIN"],
        assetTypes: ["META_AD"],
      }).success,
    ).toBe(false);
    expect(
      AdsGenerationRequestSchema.safeParse({
        ...request,
        channels: ["LINKEDIN", "LINKEDIN"],
      }).success,
    ).toBe(false);
    expect(
      AdsGenerationRequestSchema.safeParse({ ...request, variantsPerAsset: 6 })
        .success,
    ).toBe(false);
  });

  it("validates Google variants and rejects duplicate IDs", () => {
    const valid = {
      schemaVersion: "1.0",
      contentType: "GOOGLE_SEARCH_AD",
      channel: "GOOGLE_SEARCH",
      campaignObjective: "CONVERSIONS",
      title: "UrbanStride search ad",
      variants: [1, 2].map((ordinal) => ({
        id: `variant-${ordinal}`,
        label: `Variant ${ordinal}`,
        headlines: [
          "City comfort",
          "UrbanStride footwear",
          `Daily movement ${ordinal}`,
        ],
        descriptions: ["Fictional city footwear.", "Explore the collection."],
        keywordThemes: ["urban footwear"],
      })),
      provenance,
    };
    expect(GoogleSearchAdSnapshotSchema.safeParse(valid).success).toBe(true);
    expect(
      GoogleSearchAdSnapshotSchema.safeParse({
        ...valid,
        variants: valid.variants.map((variant) => ({
          ...variant,
          id: "same-id",
        })),
      }).success,
    ).toBe(false);
    expect(
      GoogleSearchAdSnapshotSchema.safeParse({
        ...valid,
        variants: [{ ...valid.variants[0], headlines: [] }],
      }).success,
    ).toBe(false);
  });

  it("validates creative briefs and image prompt packs strictly", () => {
    const brief = {
      schemaVersion: "1.0",
      contentType: "CREATIVE_BRIEF",
      channel: "META_INSTAGRAM",
      campaignObjective: "AWARENESS",
      title: "Creative brief",
      audienceInsight: "People value everyday comfort.",
      campaignPromise: "Move comfortably.",
      keyMessage: "Comfort for city movement.",
      supportPoints: ["Everyday design"],
      visualDirection: { concept: "Natural city movement.", exclusions: [] },
      copyDirection: {
        tone: "Clear",
        mandatoryMessages: [],
        avoidMessages: [],
      },
      deliverables: ["Copy direction"],
      provenance,
    };
    expect(CreativeBriefSnapshotSchema.safeParse(brief).success).toBe(true);
    expect(
      CreativeBriefSnapshotSchema.safeParse({ ...brief, extra: true }).success,
    ).toBe(false);
    const pack = {
      schemaVersion: "1.0",
      contentType: "IMAGE_PROMPT_PACK",
      channel: "META_INSTAGRAM",
      campaignObjective: "AWARENESS",
      title: "Prompt pack",
      prompts: [
        {
          id: "prompt-1",
          label: "Prompt 1",
          purpose: "Product concept",
          prompt: "Realistic urban footwear product photography.",
          negativeInstructions: [],
        },
      ],
      provenance,
    };
    expect(ImagePromptPackSnapshotSchema.safeParse(pack).success).toBe(true);
    expect(
      AdsSnapshotSchema.safeParse({
        ...pack,
        prompts: [...pack.prompts, pack.prompts[0]],
      }).success,
    ).toBe(false);
    expect(
      ImagePromptPackSnapshotSchema.safeParse({ ...pack, prompts: [] }).success,
    ).toBe(false);
  });
});
