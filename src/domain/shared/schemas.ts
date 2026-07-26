import { z } from "zod";

export const ProjectIdSchema = z.string().min(8).max(128).brand<"ProjectId">();
export const BrandProfileVersionIdSchema = z
  .string()
  .min(8)
  .max(128)
  .brand<"BrandProfileVersionId">();
export const GenerationJobIdSchema = z
  .string()
  .min(8)
  .max(128)
  .brand<"GenerationJobId">();
export const ContentItemIdSchema = z
  .string()
  .min(8)
  .max(128)
  .brand<"ContentItemId">();
export const ContentItemVersionIdSchema = z
  .string()
  .min(8)
  .max(128)
  .brand<"ContentItemVersionId">();

export const GenerationModeSchema = z.enum(["MOCK", "REAL"]);
export const GenerationProviderSchema = z.enum(["MOCK", "OPENAI"]);
export const GenerationModelTierSchema = z.enum([
  "STANDARD",
  "PREMIUM",
  "REPAIR",
]);
export const GenerationPurposeSchema = z.enum([
  "MODULE_GENERATION",
  "ITEM_GENERATION",
  "WHOLE_ITEM_REGENERATION",
  "SECTION_REGENERATION",
  "FIELD_REGENERATION",
  "VARIANT_REGENERATION",
  "CALENDAR_PERIOD_REGENERATION",
  "CALENDAR_ENTRY_REGENERATION",
  "STRUCTURAL_REPAIR",
]);
export const SafeJobErrorCodeSchema = z.enum([
  "PROVIDER_FAILURE",
  "INVALID_OUTPUT",
  "TIMEOUT",
  "MAX_ATTEMPTS",
  "CANCELLED",
  "INTERNAL",
  "PAGE_GENERATION_FAILED",
  "ITEM_GENERATION_FAILED",
  "INVALID_REQUEST",
  "INVALID_TARGET",
  "CONFLICT",
]);

export const ProvenanceSchema = z
  .object({
    provider: z.string().min(1).max(64),
    model: z.string().min(1).max(128),
    promptVersion: z.string().min(1).max(32),
    schemaVersion: z.string().min(1).max(32),
    requestId: z.string().min(8).max(128),
    generationJobId: GenerationJobIdSchema.nullable(),
    generatedAt: z.string().datetime(),
    mock: z.boolean(),
    briefRevision: z.number().int().positive(),
    generationMode: GenerationModeSchema.optional(),
    providerName: GenerationProviderSchema.optional(),
    modelTier: GenerationModelTierSchema.optional(),
    promptKey: z.string().min(2).max(160).optional(),
    generationPurpose: GenerationPurposeSchema.optional(),
    repairAttempted: z.boolean().optional(),
    sourceContentItemVersionIds: z
      .array(ContentItemVersionIdSchema)
      .max(200)
      .optional(),
    usageRecordIds: z.array(z.string().min(8).max(128)).max(10).optional(),
  })
  .strict();

export type Provenance = z.infer<typeof ProvenanceSchema>;
