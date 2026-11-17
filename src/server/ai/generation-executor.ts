import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { z } from "zod";

import { getServerEnv } from "@/lib/env/server";
import {
  ProviderError,
  type GenerationModelTier,
  type GenerationProvider,
  type GenerationPurpose,
  type ProviderErrorCode,
} from "@/server/ai/ai-provider";
import { currentGenerationSignal } from "@/server/ai/generation-signal";
import {
  createAiGateway,
  routeColumns,
  type GatewayRoute,
} from "@/server/ai/gateway/gateway";
import { logAiEvent } from "@/server/ai/gateway/ai-events";
import { resolveTaskPolicy } from "@/server/ai/gateway/task-policy";
import { retrieveKnowledgeForGeneration } from "@/server/knowledge/retrieval";
import { debugResolvedPrompt } from "@/server/ai/prompt-debug";
import {
  recordGenerationUsage,
  reconcileUsageReservation,
  reserveUsage,
} from "@/server/ai/usage-service";
import { getPrompt, loadPromptCatalog } from "@/ai/prompts/registry";
import {
  buildStructuralRepairMessage,
  STRUCTURAL_REPAIR_INSTRUCTIONS,
} from "@/ai/prompts/structural-repair";
import {
  buildClaimRevisionMessage,
  CLAIM_REVISION_INSTRUCTIONS,
} from "@/ai/prompts/claim-revision";
import { unsupportedClaimHits } from "@/server/ai/unsupported-claims";

function logRequestFailure(
  error: unknown,
  facts: {
    jobId: string;
    runtimeKey: string;
    modelRef: string;
    purpose: GenerationPurpose;
    repair: boolean;
    latencyMs: number;
  },
) {
  logAiEvent({
    ...facts,
    event: "ai.request.failed",
    errorCode: error instanceof ProviderError ? error.code : "UNKNOWN",
    retryable: error instanceof ProviderError && error.retryable,
  });
}

function throwIfCancelled(signal: AbortSignal | undefined) {
  if (signal?.aborted)
    throw new ProviderError("CANCELLED", false, "Generation was cancelled.");
}

type RealProvenance = {
  generationMode: "REAL";
  providerName: GenerationProvider;
  model: string;
  modelTier: GenerationModelTier;
  promptKey: string;
  promptVersion: string;
  generationPurpose: GenerationPurpose;
  repairAttempted: boolean;
  usageRecordIds: string[];
  knowledgeChunkIds?: string[];
  claimRevision?: { flagged: string[]; remaining: string[] };
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
  extraUsageIds?: readonly string[];
  knowledgeChunkIds?: readonly string[];
  claimRevision?: { flagged: string[]; remaining: string[] };
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
    usageRecordIds: [input.usageId, ...(input.extraUsageIds ?? [])],
    ...(input.knowledgeChunkIds?.length
      ? { knowledgeChunkIds: [...input.knowledgeChunkIds] }
      : {}),
    ...(input.claimRevision ? { claimRevision: input.claimRevision } : {}),
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
    providerName: GenerationProvider;
    model: string;
    modelTier: GenerationModelTier;
    promptKey: string;
    promptVersion: string;
    generationPurpose: GenerationPurpose;
    repairAttempted: boolean;
    usageRecordIds: string[];
    knowledgeChunkIds?: string[];
    claimRevision?: { flagged: string[]; remaining: string[] };
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
  const policy = resolveTaskPolicy(prompt, job.provider);
  const route = gateway.selectRoute({ policy, tier, jobId: job.id });
  const provider = gateway.runtimeFor(route);
  const requestTimeoutMs =
    route.providerKind === "local" || route.providerKind === "self_hosted"
      ? env.AI_LOCAL_REQUEST_TIMEOUT_MS
      : env.AI_REQUEST_TIMEOUT_MS;
  const modelId = route.modelId;
  // L6 B5: the client's own passages, as data next to the context.
  const knowledge = await retrieveKnowledgeForGeneration(prisma, {
    projectId: job.projectId,
    context: promptInput.data,
    env,
  });
  const generationContext: unknown =
    knowledge &&
    promptInput.data &&
    typeof promptInput.data === "object" &&
    !Array.isArray(promptInput.data)
      ? {
          ...(promptInput.data as Record<string, unknown>),
          clientKnowledge: knowledge.excerpts,
        }
      : promptInput.data;
  const estimatedInput = Math.ceil(
    JSON.stringify(generationContext).length / 4,
  );
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
  const userMessage = prompt.buildUserMessage(generationContext);
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
          : generationContext,
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
        timeoutMs: requestTimeoutMs,
        ...(input.scenario ? { scenario: input.scenario } : {}),
        ...(signal ? { signal } : {}),
      },
      input.schema,
    );
    const usage = await recordGenerationUsage(prisma, {
      jobId: job.id,
      provider: route.persistedProvider,
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
    logAiEvent({
      event: "ai.request.completed",
      jobId: job.id,
      runtimeKey: route.runtimeKey,
      modelRef: route.modelRef,
      purpose: input.purpose,
      repair: false,
      latencyMs: performance.now() - startedAt,
      totalTokens: result.usage.totalTokens ?? null,
      usageSource: result.usage.usageSource,
    });
    // L6 B5, hypothesis 1 (doc 54): with client knowledge, words the claim
    // detector flags get one revision request; whatever remains is recorded
    // for human review. A failed revision keeps the first output.
    let data = result.data;
    let claimRevision: { flagged: string[]; remaining: string[] } | undefined;
    const extraUsageIds: string[] = [];
    if (knowledge && !env.AI_FAKE_OPENAI_ENABLED) {
      const flagged = unsupportedClaimHits(data, generationContext);
      if (flagged.length > 0) {
        const revisionStartedAt = performance.now();
        let revisionFailure: ProviderErrorCode | "UNKNOWN" | null = null;
        try {
          throwIfCancelled(signal);
          const revised = await provider.generateStructured(
            {
              input: {},
              requestId: `${job.id}-claims`,
              model: modelId,
              modelTier: tier,
              purpose: input.purpose,
              promptKey: `${input.promptKey}.claims`,
              promptVersion: input.promptVersion,
              schemaVersion: "1.0",
              schemaName: `${input.promptKey.replaceAll(".", "_")}_claims`,
              systemInstructions: CLAIM_REVISION_INSTRUCTIONS,
              userMessage: buildClaimRevisionMessage({
                priorOutput: data,
                unsupportedTerms: flagged,
                clientKnowledge: knowledge.excerpts,
              }),
              maximumOutputTokens,
              timeoutMs: requestTimeoutMs,
              ...(signal ? { signal } : {}),
            },
            input.schema,
          );
          const revisionUsage = await recordGenerationUsage(prisma, {
            jobId: job.id,
            provider: route.persistedProvider,
            modelId: revised.model,
            modelTier: revised.modelTier,
            promptKey: `${input.promptKey}.claims`,
            promptVersion: input.promptVersion,
            purpose: input.purpose,
            attemptNumber: job.providerAttemptCount + 2,
            repair: false,
            usage: revised.usage,
            route: routeColumns(route),
            latencyMs: performance.now() - revisionStartedAt,
          });
          extraUsageIds.push(revisionUsage.id);
          data = revised.data;
        } catch (revisionError: unknown) {
          if (
            revisionError instanceof ProviderError &&
            revisionError.code === "CANCELLED"
          )
            throw revisionError;
          revisionFailure =
            revisionError instanceof ProviderError
              ? revisionError.code
              : "UNKNOWN";
        }
        claimRevision = {
          flagged,
          remaining: unsupportedClaimHits(data, generationContext),
        };
        logAiEvent({
          event: "ai.claim_revision",
          jobId: job.id,
          runtimeKey: route.runtimeKey,
          modelRef: route.modelRef,
          outcome: revisionFailure ? "failed" : "revised",
          errorCode: revisionFailure,
          flagged: flagged.length,
          remaining: claimRevision.remaining.length,
        });
      }
    }
    return finishRealSnapshot({
      schema: input.schema,
      candidate: input.candidate,
      data,
      route,
      model: result.model,
      modelTier: result.modelTier,
      promptKey: input.promptKey,
      promptVersion: input.promptVersion,
      purpose: input.purpose,
      repairAttempted: false,
      usageId: usage.id,
      ...(extraUsageIds.length ? { extraUsageIds } : {}),
      ...(knowledge ? { knowledgeChunkIds: knowledge.chunkIds } : {}),
      ...(claimRevision ? { claimRevision } : {}),
    });
  } catch (error: unknown) {
    logRequestFailure(error, {
      jobId: job.id,
      runtimeKey: route.runtimeKey,
      modelRef: route.modelRef,
      purpose: input.purpose,
      repair: false,
      latencyMs: performance.now() - startedAt,
    });
    if (
      error instanceof ProviderError &&
      error.code === "SCHEMA_VALIDATION_FAILED" &&
      prompt.repairPolicy === "STRUCTURE_ONCE"
    ) {
      const repairTier = "REPAIR" as const;
      const repairRoute = gateway.selectRoute({
        policy,
        tier: repairTier,
        jobId: job.id,
      });
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
      const repairStartedAt = performance.now();
      try {
        throwIfCancelled(signal);
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
            systemInstructions: STRUCTURAL_REPAIR_INSTRUCTIONS,
            userMessage: buildStructuralRepairMessage({
              rejectedOutput: error.rejectedOutput ?? null,
              validationIssues: error.validationIssues ?? [],
              trustedConstraints: prompt.safetyNotes,
            }),
            maximumOutputTokens,
            timeoutMs: requestTimeoutMs,
            ...(signal ? { signal } : {}),
          },
          input.schema,
        );
        const repairUsage = await recordGenerationUsage(prisma, {
          jobId: job.id,
          provider: repairRoute.persistedProvider,
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
        logAiEvent({
          event: "ai.request.completed",
          jobId: job.id,
          runtimeKey: repairRoute.runtimeKey,
          modelRef: repairRoute.modelRef,
          purpose: "STRUCTURAL_REPAIR",
          repair: true,
          latencyMs: performance.now() - repairStartedAt,
          totalTokens: repaired.usage.totalTokens ?? null,
          usageSource: repaired.usage.usageSource,
        });
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
          ...(knowledge ? { knowledgeChunkIds: knowledge.chunkIds } : {}),
        });
      } catch (repairError: unknown) {
        logRequestFailure(repairError, {
          jobId: job.id,
          runtimeKey: repairRoute.runtimeKey,
          modelRef: repairRoute.modelRef,
          purpose: "STRUCTURAL_REPAIR",
          repair: true,
          latencyMs: performance.now() - repairStartedAt,
        });
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
