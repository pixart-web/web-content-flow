import type { ServerEnv } from "@/lib/env/server";
import type { GenerationModelTier } from "@/server/ai/ai-provider";

export function resolveModel(
  env: ServerEnv,
  tier: GenerationModelTier,
): string {
  if (tier === "PREMIUM") return env.OPENAI_MODEL_PREMIUM;
  if (tier === "REPAIR") return env.OPENAI_MODEL_REPAIR;
  return env.OPENAI_MODEL_STANDARD;
}

export function safeModelLabel(tier: GenerationModelTier) {
  if (tier === "PREMIUM") return "Premium model";
  if (tier === "REPAIR") return "Repair model";
  return "Standard model";
}
