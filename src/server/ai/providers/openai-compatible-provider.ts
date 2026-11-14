import "server-only";

import type { z } from "zod";

import {
  ProviderError,
  type AiGenerationResult,
  type AiProvider,
  type StructuredGenerationRequest,
} from "@/server/ai/ai-provider";
import type { StructuredMode } from "@/server/ai/gateway/model-registry";

import {
  jsonSchemaFor,
  parseStructuredContent,
  postJson,
  schemaInstructions,
} from "./http-structured";

// C-02: any server exposing POST /v1/chat/completions (MLX `mlx_lm.server`,
// llama.cpp server, vLLM, LM Studio, OpenAI itself). Which structured-output
// mechanism a given server/version supports is configuration, not assumed.

type ChatCompletion = {
  id?: string;
  choices?: {
    message?: { content?: string | null; refusal?: string | null };
    finish_reason?: string | null;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export class OpenAICompatibleProvider implements AiProvider {
  readonly name = "openai-compatible";

  constructor(
    private readonly options: Readonly<{
      baseUrl: string;
      apiKey?: string;
      structuredMode: StructuredMode;
    }>,
  ) {}

  async generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
    schema: z.ZodType<TOutput>,
  ): Promise<AiGenerationResult<TOutput>> {
    const mode = this.options.structuredMode;
    const system = [
      request.systemInstructions ??
        "Return only content matching the supplied structured schema.",
      ...(mode === "native_schema" ? [] : [schemaInstructions(schema)]),
    ].join("\n\n");
    const body = {
      model: request.model,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            request.userMessage ??
            JSON.stringify({ generationContext: request.input }),
        },
      ],
      stream: false,
      ...(request.maximumOutputTokens === undefined
        ? {}
        : { max_tokens: request.maximumOutputTokens }),
      ...(mode === "native_schema"
        ? {
            response_format: {
              type: "json_schema",
              json_schema: {
                name: request.schemaName ?? "generation_output",
                schema: jsonSchemaFor(schema),
                strict: true,
              },
            },
          }
        : mode === "json_mode"
          ? { response_format: { type: "json_object" } }
          : {}),
    };
    const response = (await postJson({
      url: new URL("v1/chat/completions", withSlash(this.options.baseUrl)).href,
      body,
      ...(this.options.apiKey
        ? { headers: { Authorization: `Bearer ${this.options.apiKey}` } }
        : {}),
      timeoutMs: request.timeoutMs,
      ...(request.signal ? { signal: request.signal } : {}),
    })) as ChatCompletion;
    const choice = response.choices?.[0];
    if (choice?.message?.refusal)
      throw new ProviderError(
        "CONTENT_REFUSED",
        false,
        "This content could not be generated with the current request.",
      );
    if (choice?.finish_reason === "length")
      throw new ProviderError(
        "SCHEMA_VALIDATION_FAILED",
        false,
        "The generated content was cut off before it was complete.",
        undefined,
        undefined,
        choice.message?.content ?? null,
        ["Output truncated by the token limit."],
      );
    const data = parseStructuredContent(choice?.message?.content, schema);
    const usage = response.usage;
    return {
      data,
      provider: this.name,
      model: request.model,
      modelTier: request.modelTier ?? "STANDARD",
      mock: false,
      finishState: "COMPLETED",
      ...(response.id ? { providerRequestId: response.id } : {}),
      usage: usage
        ? {
            ...(usage.prompt_tokens === undefined
              ? {}
              : { inputTokens: usage.prompt_tokens }),
            ...(usage.completion_tokens === undefined
              ? {}
              : { outputTokens: usage.completion_tokens }),
            ...(usage.total_tokens === undefined
              ? {}
              : { totalTokens: usage.total_tokens }),
            usageSource: "PROVIDER_REPORTED",
          }
        : { usageSource: "UNAVAILABLE" },
    };
  }
}

function withSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}
