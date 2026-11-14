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
export type StructuredMode = (typeof structuredModes)[number];

export const RegisteredModelSchema = z
  .object({
    // "<runtimeKey>/<modelId>", the same reference format Nodera uses.
    ref: z.string().regex(/^[a-z0-9-]+\/\S+$/),
    runtimeKey: z.string().regex(/^[a-z0-9-]+$/),
    modelId: z.string().min(1).max(200),
    providerKind: z.enum(providerKinds),
    // Value persisted in the GenerationProvider DB enum. null = this runtime
    // cannot be recorded until ADR-070's enum step, so jobs never route to it.
    persistedProvider: z.enum(["MOCK", "OPENAI"]).nullable(),
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
> &
  Partial<
    Pick<
      ServerEnv,
      | "AI_OLLAMA_BASE_URL"
      | "AI_OLLAMA_MODEL"
      | "AI_OLLAMA_STRUCTURED_MODE"
      | "AI_OPENAI_COMPATIBLE_BASE_URL"
      | "AI_OPENAI_COMPATIBLE_MODEL"
      | "AI_OPENAI_COMPATIBLE_STRUCTURED_MODE"
    >
  >;

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function providerKindForUrl(url: string): ProviderKind {
  return loopbackHosts.has(new URL(url).hostname) ? "local" : "self_hosted";
}

// ADR-077: local and self-hosted models enter as "evaluation" and stay out of
// routing until they pass the task evaluation suite on the target hardware.
function localRuntimeModels(env: RegistryEnv): RegisteredModel[] {
  const models: RegisteredModel[] = [];
  if (env.AI_OLLAMA_BASE_URL && env.AI_OLLAMA_MODEL)
    models.push({
      ref: `ollama/${env.AI_OLLAMA_MODEL}`,
      runtimeKey: "ollama",
      modelId: env.AI_OLLAMA_MODEL,
      providerKind: providerKindForUrl(env.AI_OLLAMA_BASE_URL),
      persistedProvider: null,
      tiers: [...generationModelTiers],
      capabilities: {
        structured: env.AI_OLLAMA_STRUCTURED_MODE ?? "native_schema",
        embeddings: false,
      },
      status: "evaluation",
    });
  if (env.AI_OPENAI_COMPATIBLE_BASE_URL && env.AI_OPENAI_COMPATIBLE_MODEL)
    models.push({
      ref: `openai-compatible/${env.AI_OPENAI_COMPATIBLE_MODEL}`,
      runtimeKey: "openai-compatible",
      modelId: env.AI_OPENAI_COMPATIBLE_MODEL,
      providerKind: providerKindForUrl(env.AI_OPENAI_COMPATIBLE_BASE_URL),
      persistedProvider: null,
      tiers: [...generationModelTiers],
      capabilities: {
        structured: env.AI_OPENAI_COMPATIBLE_STRUCTURED_MODE ?? "json_mode",
        embeddings: false,
      },
      status: "evaluation",
    });
  return models;
}

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
    ...localRuntimeModels(env),
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
