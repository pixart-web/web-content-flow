import "server-only";

import type { z } from "zod";

import {
  ProviderError,
  type AiGenerationResult,
  type AiProvider,
  type StructuredGenerationRequest,
} from "@/server/ai/ai-provider";

type FakeInput = { syntheticCandidate?: unknown };

export class FakeOpenAIProvider implements AiProvider {
  readonly name = "OPENAI" as const;

  async generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
    schema: z.ZodType<TOutput>,
  ): Promise<AiGenerationResult<TOutput>> {
    if (request.scenario === "timeout")
      throw new ProviderError("TIMEOUT", true, "Synthetic timeout.");
    if (request.scenario === "rate-limit")
      throw new ProviderError("RATE_LIMITED", true, "Synthetic rate limit.");
    if (request.scenario === "refusal")
      throw new ProviderError("CONTENT_REFUSED", false, "Synthetic refusal.");
    const input = request.input as FakeInput;
    const candidate =
      request.scenario === "invalid-output"
        ? { invalid: true }
        : input.syntheticCandidate;
    const parsed = schema.safeParse(candidate);
    if (!parsed.success)
      throw new ProviderError(
        "SCHEMA_VALIDATION_FAILED",
        false,
        "Synthetic output failed validation.",
      );
    const inputTokens = Math.ceil(JSON.stringify(input).length / 4);
    const outputTokens = Math.ceil(JSON.stringify(parsed.data).length / 4);
    return {
      data: parsed.data,
      provider: "OPENAI",
      model: request.model,
      modelTier: request.modelTier ?? "STANDARD",
      mock: false,
      finishState: "COMPLETED",
      providerRequestId: `synthetic-${request.requestId}`,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        usageSource: "PROVIDER_REPORTED",
      },
    };
  }
}
