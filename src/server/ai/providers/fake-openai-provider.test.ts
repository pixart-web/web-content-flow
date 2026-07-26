import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { FakeOpenAIProvider } from "./fake-openai-provider";

vi.mock("server-only", () => ({}));

const Output = z.object({ value: z.string() }).strict();

const request = {
  input: { syntheticCandidate: { value: "Generated safely" } },
  requestId: "job_test",
  model: "gpt-test",
  modelTier: "STANDARD" as const,
  purpose: "ITEM_GENERATION" as const,
  promptKey: "copy.test.generation",
  promptVersion: "1.0.0",
  schemaVersion: "1.0",
  timeoutMs: 1_000,
};

describe("FakeOpenAIProvider", () => {
  it("returns schema-validated output and normalized usage", async () => {
    const result = await new FakeOpenAIProvider().generateStructured(
      request,
      Output,
    );

    expect(result.data).toEqual({ value: "Generated safely" });
    expect(result).toMatchObject({
      provider: "OPENAI",
      mock: false,
      finishState: "COMPLETED",
    });
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });

  it.each([
    ["timeout", "TIMEOUT", true],
    ["rate-limit", "RATE_LIMITED", true],
    ["refusal", "CONTENT_REFUSED", false],
    ["invalid-output", "SCHEMA_VALIDATION_FAILED", false],
  ] as const)("normalizes %s", async (scenario, code, retryable) => {
    await expect(
      new FakeOpenAIProvider().generateStructured(
        { ...request, scenario },
        Output,
      ),
    ).rejects.toMatchObject({ code, retryable });
  });
});
