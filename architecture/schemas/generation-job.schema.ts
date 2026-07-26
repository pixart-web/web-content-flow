import { z } from "zod";
import { BrandProfileVersionIdSchema, GenerationJobIdSchema, ModuleSchema, ProjectIdSchema } from "./content-item.schema";

export const GenerationJobStateSchema = z.enum(["PREPARING", "QUEUED", "RUNNING", "VALIDATING", "SAVING", "PARTIAL", "COMPLETED", "FAILED", "CANCELLED"]);
export const GenerationModeSchema = z.enum(["MOCK", "REAL"]);
export const GenerationScopeSchema = z.enum(["BRAND_PROFILE", "PROJECT_PACK", "MODULE", "CONTENT_ITEM", "CONTENT_FIELD"]);
export const GenerationStepSchema = z.object({ key: z.string().min(1).max(64), label: z.string().min(1).max(120), ordinal: z.number().int().nonnegative(), state: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]) }).strict();

export const GenerationJobSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: GenerationJobIdSchema,
  projectId: ProjectIdSchema,
  parentJobId: GenerationJobIdSchema.nullable(),
  scope: GenerationScopeSchema,
  scopeId: z.string().min(8).max(128).nullable(),
  module: ModuleSchema.nullable(),
  state: GenerationJobStateSchema,
  mode: GenerationModeSchema,
  brandProfileVersionId: BrandProfileVersionIdSchema.nullable(),
  idempotencyKey: z.string().min(16).max(200),
  attempt: z.number().int().min(0).max(5),
  maxAttempts: z.number().int().min(1).max(5),
  steps: z.array(GenerationStepSchema).max(20),
  safeErrorCode: z.string().min(1).max(64).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type GenerationJob = z.infer<typeof GenerationJobSchema>;
