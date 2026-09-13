import type { z } from "zod";

export const generationProviders = ["MOCK", "OPENAI"] as const;
export type GenerationProvider = (typeof generationProviders)[number];
export const generationModelTiers = ["STANDARD", "PREMIUM", "REPAIR"] as const;
export type GenerationModelTier = (typeof generationModelTiers)[number];
export const generationPurposes = [
  "MODULE_GENERATION",
  "ITEM_GENERATION",
  "WHOLE_ITEM_REGENERATION",
  "SECTION_REGENERATION",
  "FIELD_REGENERATION",
  "VARIANT_REGENERATION",
  "CALENDAR_PERIOD_REGENERATION",
  "CALENDAR_ENTRY_REGENERATION",
  "STRUCTURAL_REPAIR",
] as const;
export type GenerationPurpose = (typeof generationPurposes)[number];

export type ProviderErrorCode =
  | "TRANSIENT_NETWORK"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_SERVER_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  | "SCHEMA_VALIDATION_FAILED"
  | "CONTENT_REFUSED"
  | "AUTHENTICATION_FAILED"
  | "CONFIGURATION_ERROR"
  | "QUOTA_EXCEEDED"
  | "REQUEST_TOO_LARGE"
  | "UNSUPPORTED_MODEL"
  | "CANCELLED"
  | "UNKNOWN_PROVIDER_ERROR";

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    readonly retryable: boolean,
    message: string,
    readonly retryAfterMs?: number,
    readonly providerRequestId?: string,
    readonly rejectedOutput?: unknown,
    readonly validationIssues?: readonly string[],
  ) {
    super(message);
    this.name = "ProviderError";
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      retryable: this.retryable,
      message: this.message,
      ...(this.retryAfterMs ? { retryAfterMs: this.retryAfterMs } : {}),
    };
  }
}

export type NormalizedUsage = Readonly<{
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  usageSource: "PROVIDER_REPORTED" | "ESTIMATED" | "UNAVAILABLE";
}>;

export type StructuredGenerationRequest<TInput> = Readonly<{
  input: TInput;
  requestId: string;
  model: string;
  modelTier?: GenerationModelTier;
  purpose?: GenerationPurpose;
  promptKey?: string;
  promptVersion: string;
  schemaVersion: string;
  schemaName?: string;
  systemInstructions?: string;
  userMessage?: string;
  maximumOutputTokens?: number;
  timeoutMs: number;
  scenario?:
    | "success"
    | "provider-failure"
    | "invalid-output"
    | "timeout"
    | "rate-limit"
    | "refusal";
  signal?: AbortSignal;
}>;

export type AiGenerationResult<TOutput> = Readonly<{
  data: TOutput;
  provider: GenerationProvider;
  model: string;
  modelTier: GenerationModelTier;
  mock: boolean;
  finishState: "COMPLETED";
  providerRequestId?: string;
  usage: NormalizedUsage;
}>;

export interface AiProvider {
  readonly name: GenerationProvider;
  generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
    schema: z.ZodType<TOutput>,
  ): Promise<AiGenerationResult<TOutput>>;
}
