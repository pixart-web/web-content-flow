import { describe, expect, it } from "vitest";

import {
  CONFIGURED_MODEL_PRICES,
  unregisteredPricedModels,
} from "./model-prices";
import { buildModelRegistry } from "./model-registry";

const registry = buildModelRegistry({
  OPENAI_MODEL_STANDARD: "gpt-standard",
  OPENAI_MODEL_PREMIUM: "gpt-premium",
  OPENAI_MODEL_REPAIR: "gpt-repair",
});
const price = {
  provider: "OPENAI" as const,
  modelId: "gpt-standard",
  modelTier: "STANDARD" as const,
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  inputCostPerMillionMinorUnits: BigInt(100),
  outputCostPerMillionMinorUnits: BigInt(400),
  currency: "EUR" as const,
};

describe("configured model prices", () => {
  it("flags prices for models the registry does not know", () => {
    expect(unregisteredPricedModels(registry, [price])).toEqual([]);
    expect(
      unregisteredPricedModels(registry, [{ ...price, modelId: "gpt-typo" }]),
    ).toEqual(["OPENAI/gpt-typo"]);
  });

  it("only prices models with an effective date", () => {
    for (const configured of CONFIGURED_MODEL_PRICES)
      expect(Number.isNaN(Date.parse(configured.effectiveFrom))).toBe(false);
  });
});
