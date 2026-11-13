import type { ModelPrice } from "@/server/ai/pricing";

import type { RegisteredModel } from "./model-registry";

// B-03: prices are reviewed configuration, effective-dated, in EUR minor
// units per million tokens. Leave a model out rather than guess: an unpriced
// model records tokens with a null cost. Fill from the provider's published
// price list and set effectiveFrom to the date the price applies.
export const CONFIGURED_MODEL_PRICES: readonly ModelPrice[] = [];

export function unregisteredPricedModels(
  registry: readonly RegisteredModel[],
  prices: readonly ModelPrice[],
): string[] {
  return prices
    .filter(
      (price) =>
        !registry.some(
          (model) =>
            model.persistedProvider === price.provider &&
            model.modelId === price.modelId,
        ),
    )
    .map((price) => `${price.provider}/${price.modelId}`);
}
