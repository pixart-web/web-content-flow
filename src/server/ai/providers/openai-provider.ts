import "server-only";

import { createHash } from "node:crypto";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

import {
  ProviderError,
  type AiGenerationResult,
  type AiProvider,
  type StructuredGenerationRequest,
} from "@/server/ai/ai-provider";

type OpenAIProviderOptions = Readonly<{
  apiKey: string;
  client?: OpenAI;
}>;

const safeRequestHash = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);

function normalizeError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof OpenAI.APIError) {
    const requestId = error.requestID
      ? safeRequestHash(error.requestID)
      : undefined;
    if (error.status === 401)
      return new ProviderError(
        "AUTHENTICATION_FAILED",
        false,
        "Real generation is not currently configured.",
        undefined,
        requestId,
      );
    if (error.status === 429)
      return new ProviderError(
        "RATE_LIMITED",
        true,
        "Generation is temporarily limited by the provider.",
        parseRetryAfter(error.headers),
        requestId,
      );
    if (error.status === 400)
      return new ProviderError(
        "INVALID_PROVIDER_RESPONSE",
        false,
        "The generation request was rejected.",
        undefined,
        requestId,
      );
    if (error.status >= 500)
      return new ProviderError(
        "PROVIDER_SERVER_ERROR",
        true,
        "The generation provider is temporarily unavailable.",
        undefined,
        requestId,
      );
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError)
    return new ProviderError(
      "TIMEOUT",
      true,
      "The generation provider timed out.",
    );
  if (error instanceof OpenAI.APIConnectionError)
    return new ProviderError(
      "TRANSIENT_NETWORK",
      true,
      "The generation provider could not be reached.",
    );
  if (error instanceof Error && error.name === "AbortError")
    return new ProviderError("CANCELLED", false, "Generation was cancelled.");
  return new ProviderError(
    "UNKNOWN_PROVIDER_ERROR",
    false,
    "The generation provider could not complete the request.",
  );
}

function parseRetryAfter(
  headers: Headers | Record<string, string> | undefined,
) {
  if (!headers) return undefined;
  const raw =
    headers instanceof Headers
      ? headers.get("retry-after")
      : (headers["retry-after"] ?? headers["Retry-After"]);
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds))
    return Math.min(Math.max(Math.round(seconds * 1_000), 1_000), 300_000);
  const date = Date.parse(raw);
  if (!Number.isFinite(date)) return undefined;
  return Math.min(Math.max(date - Date.now(), 1_000), 300_000);
}

export class OpenAIProvider implements AiProvider {
  readonly name = "OPENAI" as const;
  private readonly client: OpenAI;

  constructor(options: OpenAIProviderOptions) {
    this.client =
      options.client ??
      new OpenAI({
        apiKey: options.apiKey,
        maxRetries: 0,
      });
  }

  async generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
    schema: z.ZodType<TOutput>,
  ): Promise<AiGenerationResult<TOutput>> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, request.timeoutMs);
    try {
      const response = await this.client.responses.parse(
        {
          model: request.model,
          store: false,
          instructions:
            request.systemInstructions ??
            "Return only content matching the supplied structured schema.",
          input:
            request.userMessage ??
            JSON.stringify({ generationContext: request.input }),
          ...(request.maximumOutputTokens === undefined
            ? {}
            : { max_output_tokens: request.maximumOutputTokens }),
          text: {
            format: zodTextFormat(
              schema,
              request.schemaName ?? "generation_output",
            ),
          },
          metadata: {
            request_id: request.requestId.slice(0, 64),
            prompt_key: (request.promptKey ?? "legacy").slice(0, 64),
            prompt_version: request.promptVersion.slice(0, 64),
            purpose: (request.purpose ?? "ITEM_GENERATION").slice(0, 64),
          },
        },
        { signal: controller.signal },
      );
      if (!response.output_parsed)
        throw new ProviderError(
          "CONTENT_REFUSED",
          false,
          "This content could not be generated with the current request.",
        );
      const parsed = schema.safeParse(response.output_parsed);
      if (!parsed.success)
        throw new ProviderError(
          "SCHEMA_VALIDATION_FAILED",
          false,
          "The generated content did not match the required structure.",
        );
      return {
        data: parsed.data,
        provider: "OPENAI",
        model: request.model,
        modelTier: request.modelTier ?? "STANDARD",
        mock: false,
        finishState: "COMPLETED",
        providerRequestId: safeRequestHash(response.id),
        usage: {
          ...(response.usage
            ? {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                cachedInputTokens:
                  response.usage.input_tokens_details?.cached_tokens ?? 0,
                reasoningTokens:
                  response.usage.output_tokens_details?.reasoning_tokens ?? 0,
                totalTokens: response.usage.total_tokens,
              }
            : {}),
          usageSource: response.usage ? "PROVIDER_REPORTED" : "UNAVAILABLE",
        },
      };
    } catch (error: unknown) {
      throw normalizeError(error);
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", abort);
    }
  }
}
