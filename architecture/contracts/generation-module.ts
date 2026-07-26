import type { AiProvider, RuntimeSchema } from "./ai-provider";
import type { Result } from "./result";

export type GenerationModuleKey = "BRAND_PROFILE" | "WEBSITE" | "SOCIAL" | "ADS" | "VIDEO" | "COPY";
export type GenerationContext<TBrief, TProfile> = Readonly<{ projectId: string; briefRevision: number; brief: TBrief; brandProfileVersionId: string; brandProfile: TProfile; outputLanguage: string; mock: boolean }>;
export type GenerationExecution = Readonly<{ jobId: string; requestId: string; promptVersion: string; schemaVersion: string; timeoutMs: number; signal?: AbortSignal }>;

export interface GenerationModule<TRequest, TBrief, TProfile, TOutput> {
  readonly key: GenerationModuleKey;
  readonly outputSchema: RuntimeSchema<TOutput>;
  generate(provider: AiProvider, context: GenerationContext<TBrief, TProfile>, request: TRequest, execution: GenerationExecution): Promise<Result<TOutput>>;
}
