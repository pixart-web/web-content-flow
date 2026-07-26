import type {
  GenerationModelTier,
  GenerationProvider,
  NormalizedUsage,
} from "@/server/ai/ai-provider";

export type ModelPrice = Readonly<{
  provider: GenerationProvider;
  modelId: string;
  modelTier: GenerationModelTier;
  effectiveFrom: string;
  inputCostPerMillionMinorUnits: bigint;
  cachedInputCostPerMillionMinorUnits?: bigint;
  outputCostPerMillionMinorUnits: bigint;
  reasoningCostPerMillionMinorUnits?: bigint;
  currency: "EUR";
}>;

const prices: ModelPrice[] = [];

export function registerModelPrice(price: ModelPrice) {
  prices.push(price);
}

export function calculateUsageCost(input: {
  provider: GenerationProvider;
  modelId: string;
  generatedAt: Date;
  usage: NormalizedUsage;
}): { amountMinorUnits: bigint; currency: "EUR" } | null {
  const price = prices
    .filter(
      (candidate) =>
        candidate.provider === input.provider &&
        candidate.modelId === input.modelId &&
        Date.parse(candidate.effectiveFrom) <= input.generatedAt.getTime(),
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  if (!price || input.usage.usageSource === "UNAVAILABLE") return null;
  const million = BigInt(1_000_000);
  const cost =
    (BigInt(input.usage.inputTokens ?? 0) *
      price.inputCostPerMillionMinorUnits) /
      million +
    (BigInt(input.usage.cachedInputTokens ?? 0) *
      (price.cachedInputCostPerMillionMinorUnits ??
        price.inputCostPerMillionMinorUnits)) /
      million +
    (BigInt(input.usage.outputTokens ?? 0) *
      price.outputCostPerMillionMinorUnits) /
      million +
    (BigInt(input.usage.reasoningTokens ?? 0) *
      (price.reasoningCostPerMillionMinorUnits ??
        price.outputCostPerMillionMinorUnits)) /
      million;
  return { amountMinorUnits: cost, currency: price.currency };
}
