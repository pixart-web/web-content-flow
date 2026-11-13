import { z } from "zod";

import type { ServerEnv } from "@/lib/env/server";
import {
  generationModelTiers,
  type GenerationModelTier,
} from "@/server/ai/ai-provider";

// ADR-071: the Model Registry is versioned, reviewed configuration. Model ids
// for configured runtimes still come from the environment (server-controlled
// policy); the registry records where each model runs and what it can do.

export const providerKinds = ["mock", "local", "self_hosted", "cloud"] as const;
export type ProviderKind = (typeof providerKinds)[number];

export const structuredModes = [
  "native_schema",
  "json_mode",
  "prompted",
] as const;

export const RegisteredModelSchema = z
  .object({
    // "<runtimeKey>/<modelId>", the same reference format Nodera uses.
    ref: z.string().regex(/^[a-z0-9-]+\/\S+$/),
    runtimeKey: z.string().regex(/^[a-z0-9-]+$/),
    modelId: z.string().min(1).max(200),
    providerKind: z.enum(providerKinds),
    // Value persisted in the GenerationProvider DB enum until ADR-070 lands.
    persistedProvider: z.enum(["MOCK", "OPENAI"]),
    tiers: z.array(z.enum(generationModelTiers)).min(1),
    capabilities: z
      .object({
        structured: z.enum(structuredModes),
        embeddings: z.boolean(),
      })
      .strict(),
    status: z.enum(["active", "evaluation", "disabled"]),
  })
  .strict();

export type RegisteredModel = z.infer<typeof RegisteredModelSchema>;

export const MOCK_MODEL_ID = "deterministic-mock-v1";

type RegistryEnv = Pick<
  ServerEnv,
  "OPENAI_MODEL_STANDARD" | "OPENAI_MODEL_PREMIUM" | "OPENAI_MODEL_REPAIR"
>;

export function buildModelRegistry(
  env: RegistryEnv,
): readonly RegisteredModel[] {
  const openAiTiers = new Map<string, GenerationModelTier[]>();
  for (const [tier, modelId] of [
    ["STANDARD", env.OPENAI_MODEL_STANDARD],
    ["PREMIUM", env.OPENAI_MODEL_PREMIUM],
    ["REPAIR", env.OPENAI_MODEL_REPAIR],
  ] as const)
    openAiTiers.set(modelId, [...(openAiTiers.get(modelId) ?? []), tier]);

  const models: RegisteredModel[] = [
    {
      ref: `mock/${MOCK_MODEL_ID}`,
      runtimeKey: "mock",
      modelId: MOCK_MODEL_ID,
      providerKind: "mock",
      persistedProvider: "MOCK",
      tiers: [...generationModelTiers],
      capabilities: { structured: "native_schema", embeddings: false },
      status: "active",
    },
    ...[...openAiTiers].map(([modelId, tiers]): RegisteredModel => ({
      ref: `openai/${modelId}`,
      runtimeKey: "openai",
      modelId,
      providerKind: "cloud",
      persistedProvider: "OPENAI",
      tiers,
      capabilities: { structured: "native_schema", embeddings: false },
      status: "active",
    })),
  ];
  const refs = new Set<string>();
  return models.map((model) => {
    const parsed = RegisteredModelSchema.parse(model);
    if (refs.has(parsed.ref))
      throw new Error(`Duplicate model reference: ${parsed.ref}`);
    refs.add(parsed.ref);
    return parsed;
  });
}

export function findModelForTier(
  registry: readonly RegisteredModel[],
  runtimeKey: string,
  tier: GenerationModelTier,
): RegisteredModel | null {
  return (
    registry.find(
      (model) => model.runtimeKey === runtimeKey && model.tiers.includes(tier),
    ) ?? null
  );
}
