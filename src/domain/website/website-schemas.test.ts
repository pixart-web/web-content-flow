import { describe, expect, it } from "vitest";

import {
  WebsiteGenerationRequestSchema,
  WebsitePageSnapshotSchema,
} from "./website-schemas";

const request = {
  schemaVersion: "1.0",
  websiteObjective: "Introduce UrbanStride and its collection.",
  websiteType: "ECOMMERCE",
  selectedPages: ["HOME", "ABOUT", "SERVICES"],
  additionalPages: [],
  primaryConversionAction: "Explore the collection",
  mockScenario: "success",
} as const;

const provenance = {
  provider: "mock",
  model: "mock-website-v1",
  promptVersion: "website-page-1.0",
  schemaVersion: "1.0",
  requestId: "website-test-request",
  generationJobId: null,
  brandProfileVersionId: "brand-profile-version-test",
  generatedAt: "2026-01-01T00:00:00.000Z",
  mock: true,
} as const;

const page = {
  schemaVersion: "1.0",
  pageKey: "home",
  pageType: "HOME",
  pageName: "Home",
  purpose: "Introduce the brand.",
  targetAudience: "Urban professionals who commute daily.",
  seo: {
    title: "UrbanStride comfortable city footwear",
    metaDescription:
      "Discover fictional UrbanStride footwear designed for comfortable daily city movement.",
    secondaryKeywords: ["city footwear"],
  },
  hero: {
    headline: "Move through the city in comfort",
    supportingText: "Considered footwear for daily movement.",
    primaryCTA: "Explore the collection",
  },
  sections: [
    {
      id: "home-intro",
      type: "INTRO",
      heading: "Designed for movement",
      body: "Comfort and considered design for the city.",
    },
  ],
  provenance,
} as const;

describe("Website schemas", () => {
  it("accepts a bounded Website request", () => {
    expect(WebsiteGenerationRequestSchema.safeParse(request).success).toBe(
      true,
    );
  });

  it("rejects duplicate pages and missing Home", () => {
    expect(
      WebsiteGenerationRequestSchema.safeParse({
        ...request,
        selectedPages: ["ABOUT", "ABOUT"],
      }).success,
    ).toBe(false);
  });

  it("accepts a page and rejects duplicate section IDs", () => {
    expect(WebsitePageSnapshotSchema.safeParse(page).success).toBe(true);
    expect(
      WebsitePageSnapshotSchema.safeParse({
        ...page,
        sections: [page.sections[0], page.sections[0]],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields and unsupported schema versions", () => {
    expect(
      WebsitePageSnapshotSchema.safeParse({
        ...page,
        schemaVersion: "2.0",
        html: "<h1>unsafe</h1>",
      }).success,
    ).toBe(false);
  });
});
