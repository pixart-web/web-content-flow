import { describe, expect, it } from "vitest";

import {
  SocialCaptionSnapshotSchema,
  SocialCarouselSnapshotSchema,
  SocialGenerationRequestSchema,
  SocialPostSnapshotSchema,
  SocialStorySnapshotSchema,
} from "./social-schemas";

const provenance = {
  provider: "mock",
  model: "mock-social-v1",
  promptVersion: "social-content-1.0",
  schemaVersion: "1.0",
  requestId: "social-schema-test",
  generationJobId: null,
  brandProfileVersionId: "social-brand-profile-version",
  generatedAt: "2026-01-01T00:00:00.000Z",
  mock: true,
} as const;

const base = {
  schemaVersion: "1.0",
  platform: "INSTAGRAM",
  objective: "AWARENESS",
  title: "UrbanStride launch",
  provenance,
} as const;

describe("Social schemas", () => {
  it("validates bounded requests and rejects missing or duplicate selections", () => {
    const valid = {
      schemaVersion: "1.0",
      platforms: ["INSTAGRAM", "LINKEDIN"],
      objectives: ["AWARENESS"],
      contentTypes: ["SOCIAL_POST"],
      quantity: 6,
      outputLanguage: "English",
      includeHashtags: true,
      toneOverride: "INHERIT",
      mockScenario: "success",
    };
    expect(SocialGenerationRequestSchema.safeParse(valid).success).toBe(true);
    expect(
      SocialGenerationRequestSchema.safeParse({
        ...valid,
        platforms: [],
      }).success,
    ).toBe(false);
    expect(
      SocialGenerationRequestSchema.safeParse({
        ...valid,
        platforms: ["INSTAGRAM", "INSTAGRAM"],
      }).success,
    ).toBe(false);
    expect(
      SocialGenerationRequestSchema.safeParse({
        ...valid,
        quantity: 21,
      }).success,
    ).toBe(false);
  });

  it("normalizes safe hashtags and rejects duplicates", () => {
    const valid = SocialPostSnapshotSchema.parse({
      ...base,
      contentType: "SOCIAL_POST",
      hook: "Move through the city",
      body: "Comfort for everyday movement.",
      hashtags: ["#UrbanStride", "CityMovement"],
    });
    expect(valid.hashtags).toEqual(["UrbanStride", "CityMovement"]);
    expect(
      SocialPostSnapshotSchema.safeParse({
        ...valid,
        hashtags: ["UrbanStride", "urbanstride"],
      }).success,
    ).toBe(false);
  });

  it("validates carousel ordering and unique slide IDs", () => {
    const carousel = {
      ...base,
      contentType: "SOCIAL_CAROUSEL",
      slides: [1, 2, 3].map((ordinal) => ({
        id: `slide-${ordinal}`,
        ordinal,
        headline: `Benefit ${ordinal}`,
        body: "Designed for daily movement.",
      })),
      caption: "Three reasons to move comfortably.",
      hashtags: ["UrbanStride"],
    };
    expect(SocialCarouselSnapshotSchema.safeParse(carousel).success).toBe(true);
    expect(
      SocialCarouselSnapshotSchema.safeParse({
        ...carousel,
        slides: carousel.slides.slice(0, 2),
      }).success,
    ).toBe(false);
    expect(
      SocialCarouselSnapshotSchema.safeParse({
        ...carousel,
        slides: carousel.slides.map((slide) => ({
          ...slide,
          id: "duplicate-slide",
        })),
      }).success,
    ).toBe(false);
  });

  it("validates Story and Caption structures strictly", () => {
    expect(
      SocialStorySnapshotSchema.safeParse({
        ...base,
        contentType: "SOCIAL_STORY",
        frames: [1, 2].map((ordinal) => ({
          id: `frame-${ordinal}`,
          ordinal,
          body: `Story frame ${ordinal}`,
        })),
      }).success,
    ).toBe(true);
    expect(
      SocialCaptionSnapshotSchema.safeParse({
        ...base,
        contentType: "SOCIAL_CAPTION",
        caption: "A standalone reusable caption.",
        hashtags: ["UrbanStride"],
        unknown: true,
      }).success,
    ).toBe(false);
  });

  it("applies the internal X editorial bound and schema version", () => {
    expect(
      SocialPostSnapshotSchema.safeParse({
        ...base,
        contentType: "SOCIAL_POST",
        platform: "X",
        hook: "City movement",
        body: "x".repeat(501),
        hashtags: [],
      }).success,
    ).toBe(false);
    expect(
      SocialCaptionSnapshotSchema.safeParse({
        ...base,
        schemaVersion: "2.0",
        contentType: "SOCIAL_CAPTION",
        caption: "Caption",
        hashtags: [],
      }).success,
    ).toBe(false);
  });
});
