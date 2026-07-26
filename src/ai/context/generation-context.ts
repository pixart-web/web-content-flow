import { z } from "zod";

import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { ProjectBriefSchema } from "@/domain/brief/brief-schema";

const sourceContext = z
  .object({
    contentItemVersionId: z.string().min(8).max(128),
    module: z.enum(["WEBSITE", "SOCIAL", "ADS", "VIDEO", "COPY"]),
    contentType: z.string().min(2).max(80),
    snapshot: z.unknown(),
  })
  .strict();

export const GenerationContextSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    briefRevision: z.number().int().positive(),
    brief: ProjectBriefSchema,
    brandProfileVersionId: z.string().min(8).max(128),
    brandProfile: BrandProfileSchema,
    outputLanguage: z.string().min(2).max(80),
    moduleRequest: z.unknown(),
    currentContentItemVersionId: z.string().min(8).max(128).optional(),
    currentSnapshot: z.unknown().optional(),
    sourceContent: z.array(sourceContext).max(200),
  })
  .strict();

export type GenerationContext = z.infer<typeof GenerationContextSchema>;

export function estimateContextTokens(context: GenerationContext) {
  return Math.ceil(JSON.stringify(context).length / 4);
}

export function assertContextBudget(
  context: GenerationContext,
  maximumInputTokens: number,
) {
  const estimatedTokens = estimateContextTokens(context);
  if (estimatedTokens > maximumInputTokens)
    throw new Error("REQUEST_TOO_LARGE");
  return { estimatedTokens, omittedOptionalContext: [] as string[] };
}
