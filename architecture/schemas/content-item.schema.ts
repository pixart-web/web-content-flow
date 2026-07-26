import { z } from "zod";

export const ProjectIdSchema = z.string().min(8).max(128).brand<"ProjectId">();
export const ContentItemIdSchema = z.string().min(8).max(128).brand<"ContentItemId">();
export const BrandProfileVersionIdSchema = z.string().min(8).max(128).brand<"BrandProfileVersionId">();
export const GenerationJobIdSchema = z.string().min(8).max(128).brand<"GenerationJobId">();

export const ModuleSchema = z.enum(["WEBSITE", "SOCIAL", "ADS", "VIDEO", "COPY"]);
export const ContentStatusSchema = z.enum(["IDEA", "DRAFT", "APPROVED", "SCHEDULED", "PUBLISHED"]);
export const VersionSourceSchema = z.enum(["GENERATED", "MANUAL_EDIT", "REGENERATED", "RESTORED"]);

export const ProvenanceSchema = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  promptVersion: z.string().min(1).max(32),
  schemaVersion: z.string().min(1).max(32),
  brandProfileVersionId: BrandProfileVersionIdSchema,
  generationJobId: GenerationJobIdSchema.nullable(),
  generatedAt: z.string().datetime(),
  mock: z.boolean(),
}).strict();

export const ContentItemEnvelopeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: ContentItemIdSchema,
  projectId: ProjectIdSchema,
  module: ModuleSchema,
  type: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  status: ContentStatusSchema,
  versionNumber: z.number().int().positive(),
  source: VersionSourceSchema,
  provenance: ProvenanceSchema,
}).strict();

export type Provenance = z.infer<typeof ProvenanceSchema>;
export type ContentItemEnvelope = z.infer<typeof ContentItemEnvelopeSchema>;
