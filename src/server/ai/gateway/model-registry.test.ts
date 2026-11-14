import { describe, expect, it } from "vitest";

import { buildModelRegistry, findModelForTier } from "./model-registry";

const env = {
  OPENAI_MODEL_STANDARD: "model-standard",
  OPENAI_MODEL_PREMIUM: "model-premium",
  OPENAI_MODEL_REPAIR: "model-repair",
};

describe("model registry", () => {
  it("registers the mock model and one OpenAI model per configured id", () => {
    const registry = buildModelRegistry(env);
    expect(registry.map((model) => model.ref)).toEqual([
      "mock/deterministic-mock-v1",
      "openai/model-standard",
      "openai/model-premium",
      "openai/model-repair",
    ]);
    expect(findModelForTier(registry, "openai", "REPAIR")?.modelId).toBe(
      "model-repair",
    );
    expect(findModelForTier(registry, "openai", "PREMIUM")).toMatchObject({
      providerKind: "cloud",
      persistedProvider: "OPENAI",
    });
  });

  it("merges tiers that share one model id instead of duplicating refs", () => {
    const registry = buildModelRegistry({
      ...env,
      OPENAI_MODEL_PREMIUM: "model-standard",
    });
    const shared = registry.find((m) => m.ref === "openai/model-standard");
    expect(shared?.tiers).toEqual(["STANDARD", "PREMIUM"]);
    expect(new Set(registry.map((m) => m.ref)).size).toBe(registry.length);
  });

  it("returns null for a tier no runtime model serves", () => {
    expect(
      findModelForTier(buildModelRegistry(env), "ollama", "STANDARD"),
    ).toBe(null);
  });

  it("registers configured local runtimes for evaluation only", () => {
    const registry = buildModelRegistry({
      ...env,
      AI_OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      AI_OLLAMA_MODEL: "qwen-test:14b",
      AI_OPENAI_COMPATIBLE_BASE_URL: "http://inference.internal:8080",
      AI_OPENAI_COMPATIBLE_MODEL: "mlx-test",
      AI_OPENAI_COMPATIBLE_STRUCTURED_MODE: "prompted",
    });
    expect(registry.find((m) => m.runtimeKey === "ollama")).toMatchObject({
      ref: "ollama/qwen-test:14b",
      providerKind: "local",
      status: "evaluation",
      persistedProvider: null,
      capabilities: { structured: "native_schema" },
    });
    expect(
      registry.find((m) => m.runtimeKey === "openai-compatible"),
    ).toMatchObject({
      providerKind: "self_hosted",
      status: "evaluation",
      capabilities: { structured: "prompted" },
    });
  });
});
