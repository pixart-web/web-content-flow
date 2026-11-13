import { describe, expect, it } from "vitest";

import {
  calculateTrackedUsageCost,
  calculateUsageCost,
  registerModelPrice,
} from "./pricing";

describe("AI usage pricing", () => {
  it("calculates integer minor-unit cost from an effective price", () => {
    registerModelPrice({
      provider: "OPENAI",
      modelId: "test-model",
      modelTier: "STANDARD",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      inputCostPerMillionMinorUnits: BigInt(100),
      outputCostPerMillionMinorUnits: BigInt(400),
      currency: "EUR",
    });

    expect(
      calculateUsageCost({
        provider: "OPENAI",
        modelId: "test-model",
        generatedAt: new Date("2026-07-01T00:00:00.000Z"),
        usage: {
          inputTokens: 1_000_000,
          outputTokens: 500_000,
          usageSource: "PROVIDER_REPORTED",
        },
      }),
    ).toEqual({ amountMinorUnits: BigInt(300), currency: "EUR" });
  });

  it("returns unknown cost when pricing or usage is unavailable", () => {
    expect(
      calculateUsageCost({
        provider: "OPENAI",
        modelId: "unknown",
        generatedAt: new Date(),
        usage: { usageSource: "UNAVAILABLE" },
      }),
    ).toBeNull();
  });

  it("skips cost calculation unless AI_COST_TRACKING_ENABLED is on", () => {
    registerModelPrice({
      provider: "OPENAI",
      modelId: "tracked-model",
      modelTier: "STANDARD",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      inputCostPerMillionMinorUnits: BigInt(1_000_000),
      outputCostPerMillionMinorUnits: BigInt(1_000_000),
      currency: "EUR",
    });
    const input = {
      provider: "OPENAI" as const,
      modelId: "tracked-model",
      generatedAt: new Date("2026-06-01T00:00:00.000Z"),
      usage: {
        inputTokens: 2,
        outputTokens: 3,
        usageSource: "PROVIDER_REPORTED" as const,
      },
    };
    expect(calculateTrackedUsageCost(false, input)).toBeNull();
    expect(calculateTrackedUsageCost(true, input)).toEqual({
      amountMinorUnits: BigInt(5),
      currency: "EUR",
    });
  });
});
