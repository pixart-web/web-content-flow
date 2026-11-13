import {
  ProviderError,
  type GenerationModelTier,
} from "@/server/ai/ai-provider";

import { findModelForTier, type RegisteredModel } from "./model-registry";
import type { PrivacyLevel, TaskPolicy } from "./task-policy";

// Deterministic router (ADR-069, ADR-073). Given a policy, the registry and
// the current runtime availability it returns ordered candidates, or a
// classified error. It never performs I/O and never fabricates a model.

export type RuntimeAvailability = Readonly<
  Record<
    string,
    | { available: true }
    | { available: false; reason: "not_configured" | "down" }
  >
>;

export type RouteCandidate = Readonly<{
  model: RegisteredModel;
  tier: GenerationModelTier;
  fallback: boolean;
}>;

export type RouteExclusion = Readonly<{
  runtimeKey: string;
  modelRef: string | null;
  reason:
    | "not_registered"
    | "disabled"
    | "missing_capability"
    | "privacy"
    | "runtime_not_configured"
    | "runtime_down";
}>;

export type RouteDecision =
  | Readonly<{
      ok: true;
      candidates: readonly RouteCandidate[];
      exclusions: readonly RouteExclusion[];
    }>
  | Readonly<{
      ok: false;
      error: ProviderError;
      exclusions: readonly RouteExclusion[];
    }>;

export function routeTask(input: {
  policy: TaskPolicy;
  tier: GenerationModelTier;
  registry: readonly RegisteredModel[];
  availability: RuntimeAvailability;
  privacy: PrivacyLevel;
  externalFallbackConsent: boolean;
}): RouteDecision {
  const candidates: RouteCandidate[] = [];
  const exclusions: RouteExclusion[] = [];
  const consider = (runtimeKey: string, fallback: boolean) => {
    const model = findModelForTier(input.registry, runtimeKey, input.tier);
    if (!model) {
      exclusions.push({ runtimeKey, modelRef: null, reason: "not_registered" });
      return;
    }
    const exclude = (reason: RouteExclusion["reason"]) =>
      exclusions.push({ runtimeKey, modelRef: model.ref, reason });
    if (model.status === "disabled") return exclude("disabled");
    // Every registered model returns structured output (natively or via
    // prompting plus zod validation); embeddings must be declared.
    if (
      input.policy.requiredCapabilities.includes("embeddings") &&
      !model.capabilities.embeddings
    )
      return exclude("missing_capability");
    if (input.privacy === "restricted" && model.providerKind === "cloud")
      return exclude("privacy");
    const availability = input.availability[runtimeKey];
    if (!availability || !availability.available)
      return exclude(
        availability?.reason === "down"
          ? "runtime_down"
          : "runtime_not_configured",
      );
    if (!candidates.some((candidate) => candidate.model.ref === model.ref))
      candidates.push({ model, tier: input.tier, fallback });
  };

  for (const runtimeKey of input.policy.preferredRuntimes)
    consider(runtimeKey, false);
  if (
    candidates.length === 0 &&
    input.policy.externalFallback.allowed &&
    input.externalFallbackConsent
  )
    for (const runtimeKey of input.policy.externalFallback.runtimes)
      consider(runtimeKey, true);

  if (candidates.length > 0) return { ok: true, candidates, exclusions };
  // A runtime that is configured but down is transient: let durable retry
  // handle it. Anything else is a configuration problem and retrying won't help.
  const transient = exclusions.some((item) => item.reason === "runtime_down");
  return {
    ok: false,
    exclusions,
    error: transient
      ? new ProviderError(
          "PROVIDER_UNAVAILABLE",
          true,
          "No generation runtime is currently available.",
        )
      : new ProviderError(
          "CONFIGURATION_ERROR",
          false,
          "Real generation is not configured for this task.",
        ),
  };
}
