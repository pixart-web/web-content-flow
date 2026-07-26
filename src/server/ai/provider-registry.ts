import "server-only";

import { getServerEnv } from "@/lib/env/server";
import type {
  AiProvider,
  GenerationModelTier,
  GenerationProvider,
} from "@/server/ai/ai-provider";
import { resolveModel } from "@/server/ai/model-policy";
import { MockProvider } from "@/server/ai/providers/mock-provider";
import { OpenAIProvider } from "@/server/ai/providers/openai-provider";
import { FakeOpenAIProvider } from "@/server/ai/providers/fake-openai-provider";

export function getGenerationProvider(input: {
  provider: GenerationProvider;
  modelTier: GenerationModelTier;
}): { provider: AiProvider; modelId: string } {
  const env = getServerEnv();
  if (input.provider === "MOCK")
    return {
      provider: new MockProvider(),
      modelId: "deterministic-mock-v1",
    };
  if (!env.AI_REAL_GENERATION_ENABLED)
    throw new Error("REAL_GENERATION_DISABLED");
  if (env.AI_FAKE_OPENAI_ENABLED)
    return {
      provider: new FakeOpenAIProvider(),
      modelId: resolveModel(env, input.modelTier),
    };
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");
  return {
    provider: new OpenAIProvider({ apiKey: env.OPENAI_API_KEY }),
    modelId: resolveModel(env, input.modelTier),
  };
}

export function getGenerationAvailability() {
  const env = getServerEnv();
  return {
    mockAvailable: env.NODE_ENV !== "production",
    realAvailable: env.AI_REAL_GENERATION_ENABLED,
    provider: env.AI_REAL_GENERATION_ENABLED ? ("OPENAI" as const) : null,
    defaultMode:
      env.AI_PROVIDER_DEFAULT === "OPENAI" && env.AI_REAL_GENERATION_ENABLED
        ? ("REAL" as const)
        : ("MOCK" as const),
  };
}
