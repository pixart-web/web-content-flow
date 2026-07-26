export interface RuntimeSchema<T> {
  parse(input: unknown): T;
}

export type AiProviderErrorCode = "AUTHENTICATION" | "PERMISSION" | "RATE_LIMIT" | "QUOTA" | "TIMEOUT" | "UNAVAILABLE" | "INVALID_RESPONSE" | "SAFETY_REJECTION" | "CANCELLED" | "UNKNOWN";

export type AiProviderError = Readonly<{ code: AiProviderErrorCode; message: string; retryable: boolean; providerRequestId?: string }>;
export type AiUsage = Readonly<{ inputTokens?: number; outputTokens?: number; estimatedCostMinorUnits?: number; currency?: string }>;
export type StructuredGenerationRequest<TInput> = Readonly<{
  input: TInput;
  provider: "mock" | "openai";
  model: string;
  promptVersion: string;
  schemaVersion: string;
  requestId: string;
  timeoutMs: number;
  mockSeed?: string;
  signal?: AbortSignal;
}>;
export type AiGenerationResult<TOutput> = Readonly<{ data: TOutput; provider: "mock" | "openai"; model: string; providerRequestId?: string; usage: AiUsage; mock: boolean }>;

export interface AiProvider {
  readonly name: "mock" | "openai";
  generateStructured<TInput, TOutput>(request: StructuredGenerationRequest<TInput>, schema: RuntimeSchema<TOutput>): Promise<AiGenerationResult<TOutput>>;
}
