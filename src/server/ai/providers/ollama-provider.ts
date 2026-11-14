import "server-only";

import type { z } from "zod";

import type {
  AiGenerationResult,
  AiProvider,
  StructuredGenerationRequest,
} from "@/server/ai/ai-provider";

import {
  jsonSchemaFor,
  parseStructuredContent,
  postJson,
  schemaInstructions,
} from "./http-structured";

// C-03: Ollama's native /api/chat with `format` set to the JSON Schema
// (constrained decoding). The schema is also stated in the system prompt,
// which helps smaller models; zod validates the result either way.

type OllamaChat = {
  message?: { content?: string };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
};

export class OllamaProvider implements AiProvider {
  readonly name = "ollama";

  constructor(private readonly options: Readonly<{ baseUrl: string }>) {}

  async generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
    schema: z.ZodType<TOutput>,
  ): Promise<AiGenerationResult<TOutput>> {
    const baseUrl = this.options.baseUrl.endsWith("/")
      ? this.options.baseUrl
      : `${this.options.baseUrl}/`;
    const response = (await postJson({
      url: new URL("api/chat", baseUrl).href,
      body: {
        model: request.model,
        stream: false,
        format: jsonSchemaFor(schema),
        messages: [
          {
            role: "system",
            content: [
              request.systemInstructions ??
                "Return only content matching the supplied structured schema.",
              schemaInstructions(schema),
            ].join("\n\n"),
          },
          {
            role: "user",
            content:
              request.userMessage ??
              JSON.stringify({ generationContext: request.input }),
          },
        ],
        options: {
          temperature: 0.2,
          ...(request.maximumOutputTokens === undefined
            ? {}
            : { num_predict: request.maximumOutputTokens }),
        },
      },
      timeoutMs: request.timeoutMs,
      ...(request.signal ? { signal: request.signal } : {}),
    })) as OllamaChat;
    const data = parseStructuredContent(response.message?.content, schema);
    const inputTokens = response.prompt_eval_count;
    const outputTokens = response.eval_count;
    return {
      data,
      provider: this.name,
      model: request.model,
      modelTier: request.modelTier ?? "STANDARD",
      mock: false,
      finishState: "COMPLETED",
      usage:
        inputTokens === undefined && outputTokens === undefined
          ? { usageSource: "UNAVAILABLE" }
          : {
              ...(inputTokens === undefined ? {} : { inputTokens }),
              ...(outputTokens === undefined ? {} : { outputTokens }),
              totalTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
              usageSource: "PROVIDER_REPORTED",
            },
    };
  }
}
