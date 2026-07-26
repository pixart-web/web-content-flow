import { describe, expect, it } from "vitest";

import {
  CopyGenerationRequestSchema,
  GeneralCopySnapshotSchema,
  GeneralCopyTypeSchema,
  getGeneralCopySchema,
} from "./copy-schemas";
import { getGeneralCopyDefinition } from "@/domain/content/content-registry";

const provenance = {
  provider: "mock",
  model: "deterministic-copy-v1",
  promptVersion: "copy-v1",
  schemaVersion: "1.0",
  requestId: "job-request-0001",
  generationJobId: "job-generation-0001",
  brandProfileVersionId: "brand-profile-version-0001",
  generatedAt: "2026-07-26T00:00:00.000Z",
  mock: true,
} as const;

const email = {
  schemaVersion: "1.0",
  contentType: "MARKETING_EMAIL",
  purpose: "CONVERT",
  tone: "BRAND_DEFAULT",
  lengthPreference: "MEDIUM",
  audienceAwareness: "SOLUTION_AWARE",
  title: "UrbanStride launch email",
  campaignName: "Fictional launch",
  provenance,
  subjectLine: "A clearer way to move",
  previewText: "Meet a practical approach to everyday movement.",
  greeting: "Hello,",
  opening: "Your daily movement should fit real life.",
  bodySections: [
    {
      id: "section-1",
      ordinal: 1,
      heading: "Built for the day",
      body: "UrbanStride brings practical structure to everyday movement.",
    },
  ],
  callToAction: {
    label: "Explore UrbanStride",
    destinationDescription: "The fictional offer page",
  },
  closing: "Choose your next practical step.",
  signatureGuidance: "Sign from the UrbanStride team.",
} as const;

describe("General Copy schemas", () => {
  it("validates strict bounded generation settings", () => {
    expect(
      CopyGenerationRequestSchema.safeParse({
        schemaVersion: "1.0",
        copyTypes: ["MARKETING_EMAIL", "PRODUCT_DESCRIPTION"],
        quantity: 2,
        purpose: "CONVERT",
        topic: "UrbanStride fictional launch",
        audience: {
          summary: "Adults seeking practical everyday movement",
          awarenessLevel: "SOLUTION_AWARE",
        },
        toneOverride: "BRAND_DEFAULT",
        lengthPreference: { value: "MEDIUM" },
        outputLanguage: "English",
        mockScenario: "success",
      }).success,
    ).toBe(true);
  });

  it("requires a custom word target only for custom length", () => {
    const base = {
      schemaVersion: "1.0",
      copyTypes: ["ARTICLE_DRAFT"],
      quantity: 1,
      purpose: "EDUCATE",
      topic: "Movement habits",
      audience: { summary: "Busy adults" },
      toneOverride: "PROFESSIONAL",
      outputLanguage: "English",
      mockScenario: "success",
    };
    expect(
      CopyGenerationRequestSchema.safeParse({
        ...base,
        lengthPreference: { value: "CUSTOM" },
      }).success,
    ).toBe(false);
    expect(
      CopyGenerationRequestSchema.safeParse({
        ...base,
        lengthPreference: { value: "CUSTOM", customWordTarget: 900 },
      }).success,
    ).toBe(true);
  });

  it("validates the proof email and rejects HTML and unknown fields", () => {
    expect(GeneralCopySnapshotSchema.safeParse(email).success).toBe(true);
    expect(
      GeneralCopySnapshotSchema.safeParse({
        ...email,
        opening: "<script>unsafe()</script>",
      }).success,
    ).toBe(false);
    expect(
      getGeneralCopySchema("MARKETING_EMAIL").safeParse({
        ...email,
        unbounded: "not allowed",
      }).success,
    ).toBe(false);
  });

  it("registers all supported Copy types with whole-item regeneration", () => {
    for (const type of GeneralCopyTypeSchema.options) {
      const definition = getGeneralCopyDefinition(type);
      expect(definition?.module).toBe("COPY");
      expect(definition?.capabilities.wholeItemRegeneration).toBe(true);
    }
    expect(getGeneralCopyDefinition("UNKNOWN")).toBeNull();
  });
});
