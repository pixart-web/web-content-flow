import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { validBrief } from "../../../../tests/fixtures/phase-2";

import { MockProvider } from "./mock-provider";

const request = {
  input: validBrief,
  requestId: "request-test",
  model: "mock-brand-profile-v1",
  promptVersion: "brand-profile-1.0",
  schemaVersion: "1.0",
  timeoutMs: 1000,
} as const;

describe("MockProvider", () => {
  it("returns deterministic, schema-valid, project-specific output", async () => {
    const provider = new MockProvider();
    const first = await provider.generateStructured(
      request,
      BrandProfileSchema,
    );
    const second = await provider.generateStructured(
      request,
      BrandProfileSchema,
    );

    expect(first.data).toEqual(second.data);
    expect(first.data.brandSummary).toContain("UrbanStride");
    expect(first.mock).toBe(true);
  });

  it("supports deterministic failure scenarios", async () => {
    const provider = new MockProvider();
    await expect(
      provider.generateStructured(
        { ...request, scenario: "invalid-output" },
        BrandProfileSchema,
      ),
    ).rejects.toMatchObject({
      code: "SCHEMA_VALIDATION_FAILED",
      retryable: false,
    });
  });
});
