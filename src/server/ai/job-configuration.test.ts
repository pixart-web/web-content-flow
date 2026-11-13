import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const env = {
  AI_REAL_GENERATION_ENABLED: true,
  AI_PROVIDER_DEFAULT: "OPENAI",
  OPENAI_MODEL_STANDARD: "gpt-standard",
};
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => env }));

const { getNewJobGenerationConfiguration } =
  await import("./job-configuration");

describe("getNewJobGenerationConfiguration", () => {
  afterEach(() => {
    env.AI_REAL_GENERATION_ENABLED = true;
  });

  it("creates REAL jobs, including regenerations, when real generation is on", () => {
    expect(
      getNewJobGenerationConfiguration({
        promptKey: "social.social_post.generation",
        purpose: "FIELD_REGENERATION",
      }),
    ).toMatchObject({
      mode: "REAL",
      provider: "OPENAI",
      modelId: "gpt-standard",
      generationPurpose: "FIELD_REGENERATION",
    });
  });

  it("keeps internal proof content mock even when real generation is on", () => {
    expect(
      getNewJobGenerationConfiguration({
        promptKey: "copy.foundation_copy.generation",
        forceMock: true,
      }),
    ).toMatchObject({
      mode: "MOCK",
      provider: "MOCK",
      modelId: "deterministic-mock-v1",
    });
  });

  it("creates MOCK jobs when real generation is off", () => {
    env.AI_REAL_GENERATION_ENABLED = false;
    expect(
      getNewJobGenerationConfiguration({ promptKey: "x.y.generation" }),
    ).toMatchObject({ mode: "MOCK", provider: "MOCK" });
  });
});
