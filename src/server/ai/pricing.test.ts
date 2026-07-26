import { describe, expect, it } from "vitest";

import { calculateUsageCost, registerModelPrice } from "./pricing";

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
});
