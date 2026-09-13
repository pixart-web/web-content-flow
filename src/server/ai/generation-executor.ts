import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { z } from "zod";

import { getServerEnv } from "@/lib/env/server";
import {
  ProviderError,
  type GenerationModelTier,
  type GenerationPurpose,
} from "@/server/ai/ai-provider";
import { getGenerationProvider } from "@/server/ai/provider-registry";
import {
  recordGenerationUsage,
  reconcileUsageReservation,
  reserveUsage,
} from "@/server/ai/usage-service";
import { getPrompt, loadPromptCatalog } from "@/ai/prompts/registry";

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
  const env = getServerEnv();
  const { provider, modelId } = getGenerationProvider({
    provider: "OPENAI",
    modelTier: tier,
  });
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
      provider: "OPENAI",
      modelId,
      modelTier: tier,
      promptKey: input.promptKey,
      promptVersion: input.promptVersion,
      generationPurpose: input.purpose,
      providerAttemptCount: { increment: 1 },
    },
  });
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
        userMessage: prompt.buildUserMessage(promptInput.data),
        maximumOutputTokens,
        timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
        ...(input.scenario ? { scenario: input.scenario } : {}),
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
      ...(result.providerRequestId
        ? { providerRequestId: result.providerRequestId }
        : {}),
    });
    await reconcileUsageReservation(
      prisma,
      job.id,
      result.usage.totalTokens ?? null,
    );
    const candidateRecord =
      typeof input.candidate === "object" && input.candidate !== null
        ? (input.candidate as Record<string, unknown>)
        : null;
    const resultRecord =
      typeof result.data === "object" && result.data !== null
        ? (result.data as Record<string, unknown>)
        : null;
    const candidateProvenance =
      candidateRecord &&
      typeof candidateRecord.provenance === "object" &&
      candidateRecord.provenance !== null
        ? (candidateRecord.provenance as Record<string, unknown>)
        : null;
    const normalized =
      resultRecord && candidateProvenance
        ? {
            ...resultRecord,
            provenance: {
              ...candidateProvenance,
              provider: "openai",
              model: result.model,
              promptVersion: input.promptVersion,
              mock: false,
              generationMode: "REAL",
              providerName: "OPENAI",
              modelTier: result.modelTier,
              promptKey: input.promptKey,
              generationPurpose: input.purpose,
              repairAttempted: false,
              usageRecordIds: [usage.id],
            },
          }
        : result.data;
    return {
      snapshot: input.schema.parse(normalized),
      provenance: {
        generationMode: "REAL",
        providerName: "OPENAI",
        model: result.model,
        modelTier: result.modelTier,
        promptKey: input.promptKey,
        promptVersion: input.promptVersion,
        generationPurpose: input.purpose,
        repairAttempted: false,
        usageRecordIds: [usage.id],
      },
    };
  } catch (error: unknown) {
    if (
      error instanceof ProviderError &&
      error.code === "SCHEMA_VALIDATION_FAILED" &&
      prompt.repairPolicy === "STRUCTURE_ONCE"
    ) {
      const repairTier = "REPAIR" as const;
      const repairSelection = getGenerationProvider({
        provider: "OPENAI",
        modelTier: repairTier,
      });
      await recordGenerationUsage(prisma, {
        jobId: job.id,
        provider: "OPENAI",
        modelId,
        modelTier: tier,
        promptKey: input.promptKey,
        promptVersion: input.promptVersion,
        purpose: input.purpose,
        attemptNumber: job.providerAttemptCount + 1,
        repair: false,
        usage: { usageSource: "UNAVAILABLE" },
      });
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          repairAttempted: true,
          providerAttemptCount: { increment: 1 },
        },
      });
      try {
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
          ...(repaired.providerRequestId
            ? { providerRequestId: repaired.providerRequestId }
            : {}),
        });
        await reconcileUsageReservation(
          prisma,
          job.id,
          repaired.usage.totalTokens ?? null,
        );
        const candidateRecord =
          typeof input.candidate === "object" && input.candidate !== null
            ? (input.candidate as Record<string, unknown>)
            : null;
        const repairedRecord =
          typeof repaired.data === "object" && repaired.data !== null
            ? (repaired.data as Record<string, unknown>)
            : null;
        const candidateProvenance =
          candidateRecord &&
          typeof candidateRecord.provenance === "object" &&
          candidateRecord.provenance !== null
            ? (candidateRecord.provenance as Record<string, unknown>)
            : null;
        const normalized =
          repairedRecord && candidateProvenance
            ? {
                ...repairedRecord,
                provenance: {
                  ...candidateProvenance,
                  provider: "openai",
                  model: repaired.model,
                  promptVersion: input.promptVersion,
                  mock: false,
                  generationMode: "REAL",
                  providerName: "OPENAI",
                  modelTier: repairTier,
                  promptKey: input.promptKey,
                  generationPurpose: input.purpose,
                  repairAttempted: true,
                  usageRecordIds: [repairUsage.id],
                },
              }
            : repaired.data;
        return {
          snapshot: input.schema.parse(normalized),
          provenance: {
            generationMode: "REAL",
            providerName: "OPENAI",
            model: repaired.model,
            modelTier: repairTier,
            promptKey: input.promptKey,
            promptVersion: input.promptVersion,
            generationPurpose: input.purpose,
            repairAttempted: true,
            usageRecordIds: [repairUsage.id],
          },
        };
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
