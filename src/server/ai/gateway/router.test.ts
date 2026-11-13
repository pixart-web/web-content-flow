import { describe, expect, it } from "vitest";

import { buildModelRegistry, type RegisteredModel } from "./model-registry";
import { routeTask, type RuntimeAvailability } from "./router";
import { resolveTaskPolicy, type TaskPolicy } from "./task-policy";

const registry = buildModelRegistry({
  OPENAI_MODEL_STANDARD: "gpt-standard",
  OPENAI_MODEL_PREMIUM: "gpt-premium",
  OPENAI_MODEL_REPAIR: "gpt-repair",
});
const localModel: RegisteredModel = {
  ref: "ollama-local/qwen-test",
  runtimeKey: "ollama-local",
  modelId: "qwen-test",
  providerKind: "local",
  persistedProvider: "OPENAI",
  tiers: ["STANDARD"],
  capabilities: { structured: "native_schema", embeddings: true },
  status: "active",
};
const policy = resolveTaskPolicy({
  key: "copy.test",
  repairPolicy: "STRUCTURE_ONCE",
});
const up: RuntimeAvailability = {
  openai: { available: true },
  "ollama-local": { available: true },
};

function route(overrides: {
  policy?: Partial<TaskPolicy>;
  registry?: readonly RegisteredModel[];
  availability?: RuntimeAvailability;
  privacy?: "internal" | "restricted";
  consent?: boolean;
  tier?: "STANDARD" | "PREMIUM" | "REPAIR";
}) {
  return routeTask({
    policy: { ...policy, ...overrides.policy },
    tier: overrides.tier ?? "STANDARD",
    registry: overrides.registry ?? [...registry, localModel],
    availability: overrides.availability ?? up,
    privacy: overrides.privacy ?? "internal",
    externalFallbackConsent: overrides.consent ?? false,
  });
}

const refs = (decision: ReturnType<typeof route>) =>
  decision.ok
    ? decision.candidates.map((c) => c.model.ref)
    : decision.error.code;

describe("routeTask", () => {
  it("routes the default policy to the configured OpenAI model for the tier", () => {
    expect(refs(route({}))).toEqual(["openai/gpt-standard"]);
    expect(refs(route({ tier: "REPAIR" }))).toEqual(["openai/gpt-repair"]);
  });

  it("keeps the policy's runtime order", () => {
    expect(
      refs(
        route({ policy: { preferredRuntimes: ["ollama-local", "openai"] } }),
      ),
    ).toEqual(["ollama-local/qwen-test", "openai/gpt-standard"]);
  });

  it("never routes restricted work to a cloud runtime", () => {
    const decision = route({
      policy: { preferredRuntimes: ["openai", "ollama-local"] },
      privacy: "restricted",
    });
    expect(refs(decision)).toEqual(["ollama-local/qwen-test"]);
    expect(decision.exclusions).toContainEqual({
      runtimeKey: "openai",
      modelRef: "openai/gpt-standard",
      reason: "privacy",
    });
    expect(refs(route({ privacy: "restricted" }))).toBe("CONFIGURATION_ERROR");
  });

  it("excludes disabled models and models missing a required capability", () => {
    const disabled = registry.map((m) => ({
      ...m,
      status: "disabled" as const,
    }));
    expect(refs(route({ registry: disabled }))).toBe("CONFIGURATION_ERROR");
    expect(
      refs(
        route({
          policy: {
            requiredCapabilities: ["structured", "embeddings"],
            preferredRuntimes: ["openai", "ollama-local"],
          },
        }),
      ),
    ).toEqual(["ollama-local/qwen-test"]);
  });

  it("treats a down runtime as retryable and a missing one as configuration", () => {
    const down = route({
      availability: { openai: { available: false, reason: "down" } },
    });
    expect(down.ok).toBe(false);
    if (!down.ok)
      expect(down.error).toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
        retryable: true,
      });
    const missing = route({
      availability: { openai: { available: false, reason: "not_configured" } },
    });
    if (!missing.ok)
      expect(missing.error).toMatchObject({
        code: "CONFIGURATION_ERROR",
        retryable: false,
      });
    expect(missing.ok).toBe(false);
  });

  it("uses external fallback only when the policy allows it and consent exists", () => {
    const localFirst = {
      preferredRuntimes: ["ollama-local"],
      externalFallback: { allowed: true, runtimes: ["openai"] },
    };
    const localDown: RuntimeAvailability = {
      ...up,
      "ollama-local": { available: false, reason: "down" },
    };
    expect(
      refs(
        route({ policy: localFirst, availability: localDown, consent: false }),
      ),
    ).toBe("PROVIDER_UNAVAILABLE");
    const withConsent = route({
      policy: localFirst,
      availability: localDown,
      consent: true,
    });
    expect(withConsent.ok && withConsent.candidates[0]).toMatchObject({
      fallback: true,
      model: { ref: "openai/gpt-standard" },
    });
    expect(
      refs(
        route({
          policy: {
            ...localFirst,
            externalFallback: { allowed: false, runtimes: ["openai"] },
          },
          availability: localDown,
          consent: true,
        }),
      ),
    ).toBe("PROVIDER_UNAVAILABLE");
  });
});
