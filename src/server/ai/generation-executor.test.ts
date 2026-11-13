import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const generateStructured = vi.fn();
const reserveUsage = vi.fn();

vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({
    AI_FAKE_OPENAI_ENABLED: false,
    AI_MAX_REQUEST_INPUT_TOKENS: 120_000,
    AI_MAX_REQUEST_OUTPUT_TOKENS: 12_000,
    AI_REQUEST_TIMEOUT_MS: 60_000,
  }),
}));
vi.mock("@/server/ai/provider-registry", () => ({
  getGenerationProvider: () => ({
    provider: { name: "OPENAI", generateStructured },
    modelId: "gpt-test",
  }),
}));
vi.mock("@/server/ai/usage-service", () => ({
  reserveUsage: (...args: unknown[]) => reserveUsage(...args),
  recordGenerationUsage: vi.fn(async () => ({ id: "usage_1" })),
  reconcileUsageReservation: vi.fn(async () => undefined),
}));
vi.mock("@/ai/prompts/registry", () => ({
  loadPromptCatalog: vi.fn(async () => []),
  getPrompt: () => ({
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
});
