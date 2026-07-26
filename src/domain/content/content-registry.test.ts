import { describe, expect, it } from "vitest";

import {
  getContentTypeDefinition,
  getFoundationCopyDefinition,
  getWebsitePageDefinition,
  getSocialDefinition,
  getAdsDefinition,
  getVideoDefinition,
} from "./content-registry";

const valid = {
  schemaVersion: "1.0",
  title: "UrbanStride foundation copy",
  objective: "Introduce the fictional launch",
  headline: "Move through the city in comfort",
  body: "UrbanStride pairs practical comfort with considered urban design.",
  callToAction: "Explore the collection",
} as const;

describe("content registry", () => {
  it("validates and formats the registered proof type", () => {
    const definition = getFoundationCopyDefinition();
    expect(definition.snapshotSchema.parse(valid)).toEqual(valid);
    expect(definition.copyFormatter(valid)).toContain("Explore the collection");
  });

  it("registers all Ads asset types and closed capabilities", () => {
    for (const type of [
      "GOOGLE_SEARCH_AD",
      "META_AD",
      "LINKEDIN_AD",
      "CREATIVE_BRIEF",
      "IMAGE_PROMPT_PACK",
    ]) {
      const definition = getAdsDefinition(type);
      expect(definition?.module).toBe("ADS");
      expect(definition?.capabilities.wholeItemRegeneration).toBe(true);
      expect(definition?.capabilities.fieldRegeneration).toBe(true);
    }
    expect(getAdsDefinition("META_AD")?.capabilities.variantRegeneration).toBe(
      true,
    );
    expect(
      getAdsDefinition("CREATIVE_BRIEF")?.capabilities.variantRegeneration,
    ).toBe(false);
    expect(getAdsDefinition("UNKNOWN")).toBeNull();
  });

  it("rejects unknown, excessive, and wrong-version snapshots", () => {
    const schema = getFoundationCopyDefinition().snapshotSchema;
    expect(schema.safeParse({ ...valid, unknown: true }).success).toBe(false);
    expect(schema.safeParse({ ...valid, body: "x".repeat(6001) }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...valid, schemaVersion: "2.0" }).success).toBe(
      false,
    );
  });

  it("rejects unknown registry keys", () => {
    expect(getContentTypeDefinition("COPY", "UNKNOWN")).toBeNull();
    expect(getContentTypeDefinition("WEBSITE", "FOUNDATION_COPY")).toBeNull();
  });

  it("registers Website pages with page and section regeneration", () => {
    const definition = getWebsitePageDefinition();
    expect(definition.type).toBe("WEBSITE_PAGE");
    expect(definition.capabilities.wholeItemRegeneration).toBe(true);
    expect(definition.capabilities.sectionRegeneration).toBe(true);
    expect(getContentTypeDefinition("WEBSITE", "UNKNOWN")).toBeNull();
  });

  it("registers every Social type with item and field capabilities", () => {
    for (const type of [
      "SOCIAL_POST",
      "SOCIAL_CAROUSEL",
      "SOCIAL_STORY",
      "SOCIAL_CAPTION",
    ]) {
      const definition = getSocialDefinition(type);
      expect(definition?.module).toBe("SOCIAL");
      expect(definition?.capabilities.wholeItemRegeneration).toBe(true);
    }
    expect(
      getSocialDefinition("SOCIAL_POST")?.capabilities.fieldRegeneration,
    ).toBe(true);
    expect(getSocialDefinition("UNKNOWN")).toBeNull();
  });

  it("registers every Video type with closed regeneration capabilities", () => {
    for (const type of [
      "VIDEO_SCRIPT",
      "SHOT_LIST",
      "VOICE_OVER_SCRIPT",
      "VIDEO_CAPTION",
      "VIDEO_PRODUCTION_BRIEF",
    ]) {
      const definition = getVideoDefinition(type);
      expect(definition?.module).toBe("VIDEO");
      expect(definition?.capabilities.wholeItemRegeneration).toBe(true);
    }
    expect(
      getVideoDefinition("VIDEO_SCRIPT")?.capabilities.sceneRegeneration,
    ).toBe(true);
    expect(
      getVideoDefinition("SHOT_LIST")?.capabilities.sceneRegeneration,
    ).toBe(true);
    expect(getVideoDefinition("UNKNOWN")).toBeNull();
  });
});
