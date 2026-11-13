import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { z } from "zod";

import { getServerEnv } from "@/lib/env/server";
import {
  ProviderError,
  type GenerationModelTier,
  type GenerationPurpose,
} from "@/server/ai/ai-provider";
import { currentGenerationSignal } from "@/server/ai/generation-signal";
import {
  createAiGateway,
  routeColumns,
  type GatewayRoute,
} from "@/server/ai/gateway/gateway";
import { resolveTaskPolicy } from "@/server/ai/gateway/task-policy";
import { debugResolvedPrompt } from "@/server/ai/prompt-debug";
import {
  recordGenerationUsage,
  reconcileUsageReservation,
  reserveUsage,
} from "@/server/ai/usage-service";
import { getPrompt, loadPromptCatalog } from "@/ai/prompts/registry";

function throwIfCancelled(signal: AbortSignal | undefined) {
  if (signal?.aborted)
    throw new ProviderError("CANCELLED", false, "Generation was cancelled.");
}

type RealProvenance = {
  generationMode: "REAL";
  providerName: "MOCK" | "OPENAI";
  model: string;
  modelTier: GenerationModelTier;
  promptKey: string;
  promptVersion: string;
  generationPurpose: GenerationPurpose;
  repairAttempted: boolean;
  usageRecordIds: string[];
};

// One place that turns validated provider output into the stored snapshot.
// When the module snapshot embeds provenance, the application-owned fields
// replace whatever the model returned (provenance never comes from the model).
function finishRealSnapshot<TOutput>(input: {
  schema: z.ZodType<TOutput>;
  candidate: TOutput;
  data: TOutput;
  route: GatewayRoute;
  model: string;
  modelTier: GenerationModelTier;
  promptKey: string;
  promptVersion: string;
  purpose: GenerationPurpose;
  repairAttempted: boolean;
  usageId: string;
}): { snapshot: TOutput; provenance: RealProvenance } {
  const asRecord = (value: unknown) =>
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  const resultRecord = asRecord(input.data);
  const candidateProvenance = asRecord(asRecord(input.candidate)?.provenance);
  const provenance: RealProvenance = {
    generationMode: "REAL",
    providerName: input.route.persistedProvider,
    model: input.model,
    modelTier: input.modelTier,
    promptKey: input.promptKey,
    promptVersion: input.promptVersion,
    generationPurpose: input.purpose,
    repairAttempted: input.repairAttempted,
    usageRecordIds: [input.usageId],
  };
  const normalized =
    resultRecord && candidateProvenance
      ? {
          ...resultRecord,
          provenance: {
            ...candidateProvenance,
            ...provenance,
            provider: input.route.runtimeKey,
            mock: false,
          },
        }
      : input.data;
  return { snapshot: input.schema.parse(normalized), provenance };
}

export async function generateProductionSnapshot<TOutput>(
  prisma: PrismaClient,
  input: {
    jobId: string;
    candidate: TOutput;
    schema: z.ZodType<TOutput>;
    context: unknown;
    promptKey: string;
    promptVersion: string;
    purpose: GenerationPurpose;
    modelTier?: GenerationModelTier;
    scenario?:
      "success" | "invalid-output" | "timeout" | "rate-limit" | "refusal";
  },
): Promise<{
  snapshot: TOutput;
  provenance: {
    generationMode: "MOCK" | "REAL";
    providerName: "MOCK" | "OPENAI";
    model: string;
    modelTier: GenerationModelTier;
    promptKey: string;
    promptVersion: string;
    generationPurpose: GenerationPurpose;
    repairAttempted: boolean;
    usageRecordIds: string[];
  };
}> {
  const job = await prisma.generationJob.findUniqueOrThrow({
    where: { id: input.jobId },
  });
  await loadPromptCatalog();
  const prompt = getPrompt(input.promptKey, input.promptVersion);
  if (!prompt)
    throw new ProviderError(
      "CONFIGURATION_ERROR",
      false,
      "The requested generation definition is unavailable.",
    );
  if (prompt.module !== job.module)
    throw new ProviderError(
      "CONFIGURATION_ERROR",
      false,
      "The generation definition does not match this job.",
    );
  const promptInput = prompt.inputSchema.safeParse(input.context);
  if (!promptInput.success)
    throw new ProviderError(
      "CONFIGURATION_ERROR",
      false,
      "The generation context is invalid.",
    );
  const tier = input.modelTier ?? prompt.modelTier;
  if (job.mode === "MOCK")
    return {
      snapshot: input.schema.parse(input.candidate),
      provenance: {
        generationMode: "MOCK",
        providerName: "MOCK",
        model: job.modelId ?? "deterministic-mock-v1",
        modelTier: tier,
        promptKey: input.promptKey,
        promptVersion: input.promptVersion,
        generationPurpose: input.purpose,
        repairAttempted: false,
        usageRecordIds: [],
      },
    };
  const signal = currentGenerationSignal();
  throwIfCancelled(signal);
  const env = getServerEnv();
  const gateway = createAiGateway(env);
  const policy = resolveTaskPolicy(prompt);
  const route = gateway.selectRoute({ policy, tier });
  const provider = gateway.runtimeFor(route);
  const modelId = route.modelId;
  const estimatedInput = Math.ceil(JSON.stringify(promptInput.data).length / 4);
  const maximumInputTokens = Math.min(
    prompt.maximumInputTokens,
    env.AI_MAX_REQUEST_INPUT_TOKENS,
  );
  const maximumOutputTokens = Math.min(
    prompt.maximumOutputTokens,
    env.AI_MAX_REQUEST_OUTPUT_TOKENS,
  );
  if (estimatedInput > maximumInputTokens)
    throw new ProviderError(
      "REQUEST_TOO_LARGE",
      false,
      "This request contains more context than the current model supports.",
    );
  await reserveUsage(prisma, {
    jobId: job.id,
    expectedTokens: estimatedInput + maximumOutputTokens,
  });
  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      provider: route.persistedProvider,
      modelId,
      modelTier: tier,
      promptKey: input.promptKey,
      promptVersion: input.promptVersion,
      generationPurpose: input.purpose,
      providerAttemptCount: { increment: 1 },
      ...routeColumns(route),
    },
  });
  const userMessage = prompt.buildUserMessage(promptInput.data);
  debugResolvedPrompt(env, {
    jobId: job.id,
    promptKey: input.promptKey,
    promptVersion: input.promptVersion,
    model: modelId,
    purpose: input.purpose,
    systemInstructions: prompt.systemInstructions,
    userMessage,
  });
  const startedAt = performance.now();
  try {
    const result = await provider.generateStructured(
      {
        input: env.AI_FAKE_OPENAI_ENABLED
          ? { syntheticCandidate: input.candidate, context: input.context }
          : promptInput.data,
        requestId: job.id,
        model: modelId,
        modelTier: tier,
        purpose: input.purpose,
        promptKey: input.promptKey,
        promptVersion: input.promptVersion,
        schemaVersion: "1.0",
        schemaName: input.promptKey.replaceAll(".", "_"),
        systemInstructions: prompt.systemInstructions,
        userMessage,
        maximumOutputTokens,
        timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
        ...(input.scenario ? { scenario: input.scenario } : {}),
        ...(signal ? { signal } : {}),
      },
      input.schema,
    );
    const usage = await recordGenerationUsage(prisma, {
      jobId: job.id,
      provider: result.provider,
      modelId: result.model,
      modelTier: result.modelTier,
      promptKey: input.promptKey,
      promptVersion: input.promptVersion,
      purpose: input.purpose,
      attemptNumber: job.providerAttemptCount + 1,
      repair: false,
      usage: result.usage,
      route: routeColumns(route),
      latencyMs: performance.now() - startedAt,
      ...(result.providerRequestId
        ? { providerRequestId: result.providerRequestId }
        : {}),
    });
    await reconcileUsageReservation(
      prisma,
      job.id,
      result.usage.totalTokens ?? null,
    );
    return finishRealSnapshot({
      schema: input.schema,
      candidate: input.candidate,
      data: result.data,
      route,
      model: result.model,
      modelTier: result.modelTier,
      promptKey: input.promptKey,
      promptVersion: input.promptVersion,
      purpose: input.purpose,
      repairAttempted: false,
      usageId: usage.id,
    });
  } catch (error: unknown) {
    if (
      error instanceof ProviderError &&
      error.code === "SCHEMA_VALIDATION_FAILED" &&
      prompt.repairPolicy === "STRUCTURE_ONCE"
    ) {
      const repairTier = "REPAIR" as const;
      const repairRoute = gateway.selectRoute({ policy, tier: repairTier });
      const repairSelection = {
        provider: gateway.runtimeFor(repairRoute),
        modelId: repairRoute.modelId,
      };
      await recordGenerationUsage(prisma, {
        jobId: job.id,
        provider: route.persistedProvider,
        modelId,
        modelTier: tier,
        promptKey: input.promptKey,
        promptVersion: input.promptVersion,
        purpose: input.purpose,
        attemptNumber: job.providerAttemptCount + 1,
        repair: false,
        usage: { usageSource: "UNAVAILABLE" },
        route: routeColumns(route),
        latencyMs: performance.now() - startedAt,
      });
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          repairAttempted: true,
          providerAttemptCount: { increment: 1 },
        },
      });
      try {
        throwIfCancelled(signal);
        const repairStartedAt = performance.now();
        const repaired = await repairSelection.provider.generateStructured(
          {
            input: env.AI_FAKE_OPENAI_ENABLED
              ? { syntheticCandidate: input.candidate }
              : {
                  rejectedOutput: error.rejectedOutput ?? null,
                  validationIssues: error.validationIssues ?? [],
                },
            requestId: `${job.id}-repair`,
            model: repairSelection.modelId,
            modelTier: repairTier,
            purpose: "STRUCTURAL_REPAIR",
            promptKey: `${input.promptKey}.repair`,
            promptVersion: input.promptVersion,
            schemaVersion: "1.0",
            schemaName: `${input.promptKey.replaceAll(".", "_")}_repair`,
            systemInstructions:
              "Repair structure only so it matches the supplied schema. Preserve business meaning, do not add claims or facts, and return no HTML.",
            userMessage: JSON.stringify({
              task: "Repair the prior generation structure without adding facts.",
              rejectedOutput: error.rejectedOutput ?? null,
              validationIssues: error.validationIssues ?? [],
              trustedConstraints: prompt.safetyNotes,
            }),
            maximumOutputTokens,
            timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
            ...(signal ? { signal } : {}),
          },
          input.schema,
        );
        const repairUsage = await recordGenerationUsage(prisma, {
          jobId: job.id,
          provider: repaired.provider,
          modelId: repaired.model,
          modelTier: repairTier,
          promptKey: `${input.promptKey}.repair`,
          promptVersion: input.promptVersion,
          purpose: "STRUCTURAL_REPAIR",
          attemptNumber: job.providerAttemptCount + 2,
          repair: true,
          usage: repaired.usage,
          route: routeColumns(repairRoute),
          latencyMs: performance.now() - repairStartedAt,
          ...(repaired.providerRequestId
            ? { providerRequestId: repaired.providerRequestId }
            : {}),
        });
        await reconcileUsageReservation(
          prisma,
          job.id,
          repaired.usage.totalTokens ?? null,
        );
        return finishRealSnapshot({
          schema: input.schema,
          candidate: input.candidate,
          data: repaired.data,
          route: repairRoute,
          model: repaired.model,
          modelTier: repairTier,
          promptKey: input.promptKey,
          promptVersion: input.promptVersion,
          purpose: input.purpose,
          repairAttempted: true,
          usageId: repairUsage.id,
        });
      } catch (repairError: unknown) {
        await reconcileUsageReservation(prisma, job.id, null);
        await prisma.generationJob.update({
          where: { id: job.id },
          data: {
            normalizedProviderError: "SCHEMA_VALIDATION_FAILED",
            safeErrorCode: "SCHEMA_VALIDATION_FAILED",
          },
        });
        throw repairError;
      }
    }
    await reconcileUsageReservation(prisma, job.id, null);
    if (error instanceof ProviderError)
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          normalizedProviderError: error.code,
          safeErrorCode: error.code,
          safeErrorDetails: {
            retryable: error.retryable,
            ...(error.retryAfterMs === undefined
              ? {}
              : { retryAfterMs: error.retryAfterMs }),
          },
        },
      });
    throw error;
  }
}
