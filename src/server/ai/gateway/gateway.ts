import "server-only";

import { getServerEnv, type ServerEnv } from "@/lib/env/server";
import type {
  AiProvider,
  GenerationModelTier,
  GenerationProvider,
} from "@/server/ai/ai-provider";
import { FakeOpenAIProvider } from "@/server/ai/providers/fake-openai-provider";
import { MockProvider } from "@/server/ai/providers/mock-provider";
import { OllamaProvider } from "@/server/ai/providers/ollama-provider";
import { OpenAICompatibleProvider } from "@/server/ai/providers/openai-compatible-provider";
import { OpenAIProvider } from "@/server/ai/providers/openai-provider";

import {
  buildModelRegistry,
  type ProviderKind,
  type RegisteredModel,
  type StructuredMode,
} from "./model-registry";
import { logAiEvent } from "./ai-events";
import { routeTask, type RuntimeAvailability } from "./router";
import type { PrivacyLevel, TaskPolicy } from "./task-policy";

// ADR-069: the single entry point for real generation. Callers describe the
// task (policy + tier); the gateway picks the model through the router and
// hands back the runtime adapter. Validation, quota and provenance stay in the
// executor so every runtime is held to the same rules.

export type GatewayRoute = Readonly<{
  runtimeKey: string;
  modelId: string;
  modelRef: string;
  providerKind: ProviderKind;
  persistedProvider: GenerationProvider;
  tier: GenerationModelTier;
  policyKey: string;
  policyVersion: string;
  fallbackUsed: boolean;
  structuredMode: StructuredMode;
}>;

// Columns persisted on GenerationJob / GenerationUsage (B-05, B-06).
export function routeColumns(route: GatewayRoute) {
  return {
    runtimeKey: route.runtimeKey,
    modelRef: route.modelRef,
    providerKind: route.providerKind,
    policyKey: route.policyKey,
    policyVersion: route.policyVersion,
    fallbackUsed: route.fallbackUsed,
    structuredMode: route.structuredMode,
  };
}

export type RouteColumns = ReturnType<typeof routeColumns>;

export interface AiGateway {
  selectRoute(input: {
    policy: TaskPolicy;
    tier: GenerationModelTier;
    privacy?: PrivacyLevel;
    externalFallbackConsent?: boolean;
    // When set, the routing decision is logged against this job (B-08).
    jobId?: string;
  }): GatewayRoute;
  runtimeFor(route: GatewayRoute): AiProvider;
}

type RuntimeFactory = (env: ServerEnv) => AiProvider;

const runtimeFactories: Readonly<Record<string, RuntimeFactory>> = {
  mock: () => new MockProvider(),
  openai: (env) => {
    if (env.AI_FAKE_OPENAI_ENABLED) return new FakeOpenAIProvider();
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");
    return new OpenAIProvider({ apiKey: env.OPENAI_API_KEY });
  },
  ollama: (env) => {
    if (!env.AI_OLLAMA_BASE_URL) throw new Error("OLLAMA_NOT_CONFIGURED");
    return new OllamaProvider({ baseUrl: env.AI_OLLAMA_BASE_URL });
  },
  "openai-compatible": (env) => {
    if (!env.AI_OPENAI_COMPATIBLE_BASE_URL)
      throw new Error("OPENAI_COMPATIBLE_NOT_CONFIGURED");
    return new OpenAICompatibleProvider({
      baseUrl: env.AI_OPENAI_COMPATIBLE_BASE_URL,
      ...(env.AI_OPENAI_COMPATIBLE_API_KEY
        ? { apiKey: env.AI_OPENAI_COMPATIBLE_API_KEY }
        : {}),
      structuredMode: env.AI_OPENAI_COMPATIBLE_STRUCTURED_MODE,
    });
  },
};

// Builds a runtime adapter by key. Jobs reach adapters only through
// selectRoute/runtimeFor; the evaluation suite calls this directly because it
// exercises models the router deliberately refuses (status "evaluation").
export function createRuntimeAdapter(
  runtimeKey: string,
  env: ServerEnv = getServerEnv(),
): AiProvider {
  const factory = runtimeFactories[runtimeKey];
  if (!factory) throw new Error(`No runtime adapter for ${runtimeKey}.`);
  return factory(env);
}

export function runtimeAvailability(env: ServerEnv): RuntimeAvailability {
  const openAiReady =
    env.AI_REAL_GENERATION_ENABLED &&
    (env.AI_FAKE_OPENAI_ENABLED || Boolean(env.OPENAI_API_KEY));
  return {
    mock: { available: true },
    openai: openAiReady
      ? { available: true }
      : { available: false, reason: "not_configured" },
    // Configured is not the same as reachable; reachability is checked by the
    // evaluation suite and, later, by a runtime health probe.
    ollama:
      env.AI_OLLAMA_BASE_URL && env.AI_OLLAMA_MODEL
        ? { available: true }
        : { available: false, reason: "not_configured" },
    "openai-compatible":
      env.AI_OPENAI_COMPATIBLE_BASE_URL && env.AI_OPENAI_COMPATIBLE_MODEL
        ? { available: true }
        : { available: false, reason: "not_configured" },
  };
}

export function createAiGateway(
  env: ServerEnv = getServerEnv(),
  registry: readonly RegisteredModel[] = buildModelRegistry(env),
): AiGateway {
  const availability = runtimeAvailability(env);
  return {
    selectRoute({ policy, tier, privacy, externalFallbackConsent, jobId }) {
      const decision = routeTask({
        policy,
        tier,
        registry,
        availability,
        privacy: privacy ?? policy.privacy,
        externalFallbackConsent: externalFallbackConsent ?? false,
      });
      const facts = jobId ? { jobId, taskKey: policy.taskKey, tier } : null;
      if (!decision.ok) {
        if (facts)
          logAiEvent({
            ...facts,
            event: "ai.route.unavailable",
            errorCode: decision.error.code,
            exclusions: decision.exclusions,
          });
        throw decision.error;
      }
      const { model, fallback } = decision.candidates[0]!;
      // The router excludes non-persistable models; this narrows the type.
      if (model.persistedProvider === null)
        throw new Error(`Model ${model.ref} cannot be persisted.`);
      const persistedProvider = model.persistedProvider;
      if (facts)
        logAiEvent({
          ...facts,
          event: "ai.route.selected",
          runtimeKey: model.runtimeKey,
          modelRef: model.ref,
          policy: `${policy.policyKey}@${policy.policyVersion}`,
          fallbackUsed: fallback,
          exclusions: decision.exclusions,
        });
      return {
        runtimeKey: model.runtimeKey,
        modelId: model.modelId,
        modelRef: model.ref,
        providerKind: model.providerKind,
        persistedProvider,
        tier,
        policyKey: policy.policyKey,
        policyVersion: policy.policyVersion,
        fallbackUsed: fallback,
        structuredMode: model.capabilities.structured,
      };
    },
    runtimeFor(route) {
      return createRuntimeAdapter(route.runtimeKey, env);
    },
  };
}
