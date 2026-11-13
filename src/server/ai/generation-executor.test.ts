import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const generateStructured = vi.fn();
const reserveUsage = vi.fn();
const recordGenerationUsage = vi.fn<
  (prisma: unknown, input: unknown) => Promise<{ id: string }>
>(async () => ({ id: "usage_1" }));

const env = {
  NODE_ENV: "test",
  AI_REAL_GENERATION_ENABLED: true,
  AI_FAKE_OPENAI_ENABLED: false,
  OPENAI_API_KEY: "test-key-not-a-real-secret",
  OPENAI_MODEL_STANDARD: "gpt-test",
  OPENAI_MODEL_PREMIUM: "gpt-test-premium",
  OPENAI_MODEL_REPAIR: "gpt-test-repair",
  AI_PROMPT_DEBUG_ENABLED: false,
  AI_MAX_REQUEST_INPUT_TOKENS: 120_000,
  AI_MAX_REQUEST_OUTPUT_TOKENS: 12_000,
  AI_REQUEST_TIMEOUT_MS: 60_000,
};

vi.mock("@/lib/env/server", () => ({ getServerEnv: () => env }));
// The real gateway and router run; only the network adapter is replaced.
vi.mock("@/server/ai/providers/openai-provider", () => ({
  OpenAIProvider: class {
    readonly name = "OPENAI";
    generateStructured = generateStructured;
  },
}));
vi.mock("@/server/ai/usage-service", () => ({
  reserveUsage: (...args: unknown[]) => reserveUsage(...args),
  recordGenerationUsage: (prisma: unknown, input: unknown) =>
    recordGenerationUsage(prisma, input),
  reconcileUsageReservation: vi.fn(async () => undefined),
}));
vi.mock("@/ai/prompts/registry", () => ({
  loadPromptCatalog: vi.fn(async () => []),
  getPrompt: () => ({
    key: "copy.test",
    module: "COPY",
    modelTier: "STANDARD",
    inputSchema: z.unknown(),
    maximumInputTokens: 120_000,
    maximumOutputTokens: 12_000,
    repairPolicy: "NONE",
    systemInstructions: "test",
    buildUserMessage: () => "{}",
    safetyNotes: [],
  }),
}));

const { generateProductionSnapshot } = await import("./generation-executor");
const { runWithGenerationSignal } = await import("./generation-signal");

const Output = z.object({ value: z.string() });

const prisma = {
  generationJob: {
    findUniqueOrThrow: vi.fn(async () => ({
      id: "job_1",
      module: "COPY",
      mode: "REAL",
      modelId: null,
      providerAttemptCount: 0,
    })),
    update: vi.fn(async () => ({})),
  },
} as unknown as PrismaClient;

const input = {
  jobId: "job_1",
  candidate: { value: "candidate" },
  schema: Output,
  context: {},
  promptKey: "copy.test",
  promptVersion: "1.0.0",
  purpose: "ITEM_GENERATION" as const,
};

describe("generateProductionSnapshot cancellation", () => {
  beforeEach(() => {
    generateStructured.mockReset();
    reserveUsage.mockReset();
  });

  it("passes the job signal to the provider", async () => {
    generateStructured.mockResolvedValue({
      data: { value: "real" },
      provider: "OPENAI",
      model: "gpt-test",
      modelTier: "STANDARD",
      mock: false,
      finishState: "COMPLETED",
      usage: { totalTokens: 10, usageSource: "PROVIDER_REPORTED" },
    });
    const controller = new AbortController();
    const result = await runWithGenerationSignal(controller.signal, () =>
      generateProductionSnapshot(prisma, input),
    );
    expect(result.snapshot).toEqual({ value: "real" });
    expect(generateStructured.mock.calls[0]?.[0]).toMatchObject({
      signal: controller.signal,
    });
  });

  it("stops before reserving quota when the lease was already lost", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runWithGenerationSignal(controller.signal, () =>
        generateProductionSnapshot(prisma, input),
      ),
    ).rejects.toMatchObject({ code: "CANCELLED", retryable: false });
    expect(reserveUsage).not.toHaveBeenCalled();
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("persists the gateway route's model and provider", async () => {
    generateStructured.mockResolvedValue({
      data: { value: "real" },
      provider: "OPENAI",
      model: "gpt-test",
      modelTier: "STANDARD",
      mock: false,
      finishState: "COMPLETED",
      usage: { totalTokens: 10, usageSource: "PROVIDER_REPORTED" },
    });
    const update = vi.mocked(prisma.generationJob.update);
    update.mockClear();
    const result = await generateProductionSnapshot(prisma, input);
    expect(generateStructured.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-test",
      modelTier: "STANDARD",
    });
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      data: {
        provider: "OPENAI",
        modelId: "gpt-test",
        modelTier: "STANDARD",
        runtimeKey: "openai",
        modelRef: "openai/gpt-test",
        providerKind: "cloud",
        policyKey: "default",
        policyVersion: "1.0.0",
        fallbackUsed: false,
        structuredMode: "native_schema",
      },
    });
    const usageCall = recordGenerationUsage.mock.calls.at(-1)?.[1] as {
      route: { modelRef: string };
      latencyMs: number;
    };
    expect(usageCall.route.modelRef).toBe("openai/gpt-test");
    expect(usageCall.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.provenance).toMatchObject({
      generationMode: "REAL",
      providerName: "OPENAI",
      model: "gpt-test",
    });
  });

  it("fails as a non-retryable configuration error when real generation is off", async () => {
    env.AI_REAL_GENERATION_ENABLED = false;
    try {
      await expect(
        generateProductionSnapshot(prisma, input),
      ).rejects.toMatchObject({
        code: "CONFIGURATION_ERROR",
        retryable: false,
      });
      expect(reserveUsage).not.toHaveBeenCalled();
      expect(generateStructured).not.toHaveBeenCalled();
    } finally {
      env.AI_REAL_GENERATION_ENABLED = true;
    }
  });
});
