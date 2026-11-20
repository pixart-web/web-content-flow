import { z } from "zod";

import type { GenerationJobStatus } from "@/generated/prisma/enums";

import {
  BrandProfileVersionSource,
  ContentItemVersionSource,
  ContentModule,
  ContentStatus,
  GenerationJobStepStatus,
  GenerationMode,
  GenerationModelTier,
  GenerationModule,
  GenerationProvider,
  GenerationPurpose,
  GenerationScopeType,
  GenerationUsageSource,
  ProjectModuleStatus,
  ProjectStatus,
} from "@/generated/prisma/enums";

// Workspace package (doc 52, LF-12): a logical export of every project an
// owner has, portable across operating systems, PostgreSQL builds and
// installs. Accounts, sessions, tokens, rate limits, exports and reservations
// are never part of it. IDs inside the package are references only: the
// importer gives every record a new ID.

export const WORKSPACE_PACKAGE_FORMAT = "web-content-flow.workspace" as const;
export const WORKSPACE_PACKAGE_FORMAT_VERSION = 1 as const;

/** Statuses a job can be exported in. Active jobs block the export. */
export const TERMINAL_JOB_STATUSES = [
  "PARTIAL",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const satisfies readonly GenerationJobStatus[];

const id = z.string().min(1).max(200);
const shortText = z.string().max(500);
const text = z.string().max(200_000);
const date = z.iso.datetime({ offset: true });
const json = z.unknown().refine((value) => value !== undefined, {
  message: "Required",
});
const nonNegative = z.number().int().min(0).max(2_147_483_647);
const optionalNonNegative = nonNegative.nullable();

const ModuleRecordSchema = z.strictObject({
  id,
  module: z.enum(ContentModule),
  status: z.enum(ProjectModuleStatus),
  settings: json,
  createdAt: date,
  updatedAt: date,
});

const BriefRecordSchema = z.strictObject({
  schemaVersion: shortText,
  revision: nonNegative,
  data: json,
  createdAt: date,
  updatedAt: date,
});

const BrandProfileVersionRecordSchema = z.strictObject({
  id,
  versionNumber: nonNegative,
  schemaVersion: shortText,
  snapshot: json,
  source: z.enum(BrandProfileVersionSource),
  byOwner: z.boolean(),
  mock: z.boolean(),
  provenance: json,
  createdAt: date,
});

const BrandProfileRecordSchema = z.strictObject({
  createdAt: date,
  versions: z.array(BrandProfileVersionRecordSchema).max(10_000),
});

const JobStepRecordSchema = z.strictObject({
  key: shortText,
  label: shortText,
  status: z.enum(GenerationJobStepStatus),
  ordinal: nonNegative,
  startedAt: date.nullable(),
  completedAt: date.nullable(),
  safeErrorCode: shortText.nullable(),
});

const JobRecordSchema = z.strictObject({
  id,
  parentJobId: id.nullable(),
  scopeType: z.enum(GenerationScopeType),
  scopeId: shortText.nullable(),
  module: z.enum(GenerationModule),
  status: z.enum(TERMINAL_JOB_STATUSES),
  mode: z.enum(GenerationMode),
  provider: z.enum(GenerationProvider),
  modelTier: z.enum(GenerationModelTier),
  modelId: shortText.nullable(),
  promptKey: shortText.nullable(),
  promptVersion: shortText.nullable(),
  generationPurpose: z.enum(GenerationPurpose).nullable(),
  briefRevision: optionalNonNegative,
  providerAttemptCount: nonNegative,
  normalizedProviderError: shortText.nullable(),
  repairAttempted: z.boolean(),
  runtimeKey: shortText.nullable(),
  modelRef: shortText.nullable(),
  providerKind: shortText.nullable(),
  policyKey: shortText.nullable(),
  policyVersion: shortText.nullable(),
  fallbackUsed: z.boolean().nullable(),
  structuredMode: shortText.nullable(),
  idempotencyKey: shortText,
  attempt: nonNegative,
  maxAttempts: nonNegative,
  brandProfileVersionId: id.nullable(),
  request: json,
  safeErrorCode: shortText.nullable(),
  safeErrorDetails: json.nullable(),
  usage: json.nullable(),
  createdAt: date,
  updatedAt: date,
  startedAt: date.nullable(),
  completedAt: date.nullable(),
  cancelRequestedAt: date.nullable(),
  steps: z.array(JobStepRecordSchema).max(100),
});

const ContentItemVersionRecordSchema = z.strictObject({
  id,
  versionNumber: nonNegative,
  schemaVersion: shortText,
  snapshot: json,
  source: z.enum(ContentItemVersionSource),
  sourceJobId: id.nullable(),
  brandProfileVersionId: id,
  byOwner: z.boolean(),
  mock: z.boolean(),
  provenance: json,
  createdAt: date,
});

const ContentItemRecordSchema = z.strictObject({
  id,
  module: z.enum(ContentModule),
  type: shortText,
  identityKey: shortText.nullable(),
  title: text,
  status: z.enum(ContentStatus),
  currentVersionId: id.nullable(),
  sourceJobId: id.nullable(),
  sourceBrandProfileVersionId: id,
  createdAt: date,
  updatedAt: date,
  versions: z.array(ContentItemVersionRecordSchema).min(1).max(10_000),
});

const UsageRecordSchema = z.strictObject({
  generationJobId: id,
  contentItemVersionId: id.nullable(),
  provider: z.enum(GenerationProvider),
  modelId: shortText,
  modelTier: z.enum(GenerationModelTier),
  promptKey: shortText,
  promptVersion: shortText,
  generationPurpose: z.enum(GenerationPurpose),
  attemptNumber: nonNegative,
  repair: z.boolean(),
  inputTokens: optionalNonNegative,
  outputTokens: optionalNonNegative,
  cachedInputTokens: optionalNonNegative,
  reasoningTokens: optionalNonNegative,
  totalTokens: optionalNonNegative,
  // BigInt in the database; a decimal string in JSON.
  estimatedCostMinorUnits: z
    .string()
    .regex(/^-?\d{1,19}$/)
    .nullable(),
  currency: z.string().max(10).nullable(),
  usageSource: z.enum(GenerationUsageSource),
  providerRequestIdHash: shortText.nullable(),
  runtimeKey: shortText.nullable(),
  modelRef: shortText.nullable(),
  providerKind: shortText.nullable(),
  policyKey: shortText.nullable(),
  policyVersion: shortText.nullable(),
  fallbackUsed: z.boolean().nullable(),
  structuredMode: shortText.nullable(),
  latencyMs: optionalNonNegative,
  createdAt: date,
});

const KnowledgeChunkRecordSchema = z.strictObject({
  id,
  ordinal: nonNegative,
  text,
  tokenEstimate: nonNegative,
  // Float32 little-endian, base64. Null when the chunk was never indexed.
  embedding: z.base64().max(1_000_000).nullable(),
  embeddingModel: shortText.nullable(),
  embeddingDims: optionalNonNegative,
  createdAt: date,
});

const KnowledgeDocumentRecordSchema = z.strictObject({
  title: shortText,
  mediaType: shortText,
  content: z.string().max(5_000_000),
  byteSize: nonNegative,
  contentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  status: shortText,
  createdAt: date,
  updatedAt: date,
  chunks: z.array(KnowledgeChunkRecordSchema).max(20_000),
});

export const ProjectRecordSchema = z.strictObject({
  id,
  name: shortText,
  brandName: shortText,
  type: shortText,
  status: z.enum(ProjectStatus),
  outputLanguage: shortText,
  createdAt: date,
  updatedAt: date,
  currentBrandProfileVersionId: id.nullable(),
  modules: z.array(ModuleRecordSchema).max(20),
  brief: BriefRecordSchema.nullable(),
  brandProfile: BrandProfileRecordSchema.nullable(),
  jobs: z.array(JobRecordSchema).max(100_000),
  contentItems: z.array(ContentItemRecordSchema).max(100_000),
  usage: z.array(UsageRecordSchema).max(500_000),
  knowledgeDocuments: z.array(KnowledgeDocumentRecordSchema).max(10_000),
});

export const WorkspacePackageSchema = z.strictObject({
  format: z.literal(WORKSPACE_PACKAGE_FORMAT),
  formatVersion: z.literal(WORKSPACE_PACKAGE_FORMAT_VERSION),
  createdAt: date,
  appRelease: shortText,
  databaseMigration: shortText,
  projects: z.array(ProjectRecordSchema).max(1_000),
});

export type WorkspacePackage = z.infer<typeof WorkspacePackageSchema>;
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;
