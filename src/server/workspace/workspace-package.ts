import { randomBytes } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { resolvePlanPolicy } from "@/server/plans/plan-policy";
import {
  TERMINAL_JOB_STATUSES,
  WORKSPACE_PACKAGE_FORMAT,
  WORKSPACE_PACKAGE_FORMAT_VERSION,
  WorkspacePackageSchema,
  type ProjectRecord,
  type WorkspacePackage,
} from "@/server/workspace/workspace-package-schema";

// Workspace package (doc 52, LF-12). Export reads every project the owner has
// and writes one gzip-compressed JSON file. Import validates the whole file
// first, then creates new projects with new IDs in one transaction: it never
// changes or replaces anything that already exists.

/** Largest decompressed package accepted (protects against gzip bombs). */
export const WORKSPACE_PACKAGE_MAX_JSON_BYTES = 512 * 1024 * 1024;

export type WorkspaceExportResult =
  | { ok: true; bytes: Buffer; filename: string; projects: number }
  | { ok: false; code: "ACTIVE_JOBS"; message: string; activeJobs: number };

export type WorkspaceImportSummary = {
  projects: number;
  contentItems: number;
  contentVersions: number;
  brandProfileVersions: number;
  knowledgeDocuments: number;
  jobs: number;
};

export type WorkspaceImportResult =
  | { ok: true; summary: WorkspaceImportSummary; projectIds: string[] }
  | {
      ok: false;
      code: "INVALID" | "UNSUPPORTED" | "PROJECT_LIMIT" | "NOT_FOUND";
      message: string;
    };

const iso = (value: Date) => value.toISOString();
const isoOrNull = (value: Date | null) => (value ? value.toISOString() : null);

export async function exportWorkspace(
  prisma: PrismaClient,
  input: {
    userId: string;
    appRelease: string;
    databaseMigration: string;
    now?: Date;
  },
): Promise<WorkspaceExportResult> {
  const activeJobs = await prisma.generationJob.count({
    where: {
      project: { userId: input.userId },
      status: { notIn: [...TERMINAL_JOB_STATUSES] },
    },
  });
  if (activeJobs > 0)
    return {
      ok: false,
      code: "ACTIVE_JOBS",
      activeJobs,
      message:
        "Wait for the generations in progress to finish before exporting the workspace.",
    };

  const projects = await prisma.project.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "asc" },
    include: {
      modules: { orderBy: { module: "asc" } },
      brief: true,
      brandProfile: {
        include: { versions: { orderBy: { versionNumber: "asc" } } },
      },
      generationJobs: {
        orderBy: { createdAt: "asc" },
        include: { steps: { orderBy: { ordinal: "asc" } } },
      },
      contentItems: {
        orderBy: { createdAt: "asc" },
        include: { versions: { orderBy: { versionNumber: "asc" } } },
      },
      generationUsage: { orderBy: { createdAt: "asc" } },
      knowledgeDocuments: {
        orderBy: { createdAt: "asc" },
        include: { chunks: { orderBy: { ordinal: "asc" } } },
      },
    },
  });

  const records: ProjectRecord[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    brandName: project.brandName,
    type: project.type,
    status: project.status,
    outputLanguage: project.outputLanguage,
    createdAt: iso(project.createdAt),
    updatedAt: iso(project.updatedAt),
    currentBrandProfileVersionId: project.currentBrandProfileVersionId,
    modules: project.modules.map((projectModule) => ({
      id: projectModule.id,
      module: projectModule.module,
      status: projectModule.status,
      settings: projectModule.settings,
      createdAt: iso(projectModule.createdAt),
      updatedAt: iso(projectModule.updatedAt),
    })),
    brief: project.brief
      ? {
          schemaVersion: project.brief.schemaVersion,
          revision: project.brief.revision,
          data: project.brief.data,
          createdAt: iso(project.brief.createdAt),
          updatedAt: iso(project.brief.updatedAt),
        }
      : null,
    brandProfile: project.brandProfile
      ? {
          createdAt: iso(project.brandProfile.createdAt),
          versions: project.brandProfile.versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            schemaVersion: version.schemaVersion,
            snapshot: version.snapshot,
            source: version.source,
            byOwner: version.actorUserId === input.userId,
            mock: version.mock,
            provenance: version.provenance,
            createdAt: iso(version.createdAt),
          })),
        }
      : null,
    jobs: project.generationJobs.map((job) => ({
      id: job.id,
      parentJobId: job.parentJobId,
      scopeType: job.scopeType,
      scopeId: job.scopeId,
      module: job.module,
      status: job.status as (typeof TERMINAL_JOB_STATUSES)[number],
      mode: job.mode,
      provider: job.provider,
      modelTier: job.modelTier,
      modelId: job.modelId,
      promptKey: job.promptKey,
      promptVersion: job.promptVersion,
      generationPurpose: job.generationPurpose,
      briefRevision: job.briefRevision,
      providerAttemptCount: job.providerAttemptCount,
      normalizedProviderError: job.normalizedProviderError,
      repairAttempted: job.repairAttempted,
      runtimeKey: job.runtimeKey,
      modelRef: job.modelRef,
      providerKind: job.providerKind,
      policyKey: job.policyKey,
      policyVersion: job.policyVersion,
      fallbackUsed: job.fallbackUsed,
      structuredMode: job.structuredMode,
      idempotencyKey: job.idempotencyKey,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      brandProfileVersionId: job.brandProfileVersionId,
      request: job.request,
      safeErrorCode: job.safeErrorCode,
      safeErrorDetails: job.safeErrorDetails,
      usage: job.usage,
      createdAt: iso(job.createdAt),
      updatedAt: iso(job.updatedAt),
      startedAt: isoOrNull(job.startedAt),
      completedAt: isoOrNull(job.completedAt),
      cancelRequestedAt: isoOrNull(job.cancelRequestedAt),
      steps: job.steps.map((step) => ({
        key: step.key,
        label: step.label,
        status: step.status,
        ordinal: step.ordinal,
        startedAt: isoOrNull(step.startedAt),
        completedAt: isoOrNull(step.completedAt),
        safeErrorCode: step.safeErrorCode,
      })),
    })),
    contentItems: project.contentItems.map((item) => ({
      id: item.id,
      module: item.module,
      type: item.type,
      identityKey: item.identityKey,
      title: item.title,
      status: item.status,
      currentVersionId: item.currentVersionId,
      sourceJobId: item.sourceJobId,
      sourceBrandProfileVersionId: item.sourceBrandProfileVersionId,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
      versions: item.versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        schemaVersion: version.schemaVersion,
        snapshot: version.snapshot,
        source: version.source,
        sourceJobId: version.sourceJobId,
        brandProfileVersionId: version.brandProfileVersionId,
        byOwner: version.actorUserId === input.userId,
        mock: version.mock,
        provenance: version.provenance,
        createdAt: iso(version.createdAt),
      })),
    })),
    usage: project.generationUsage.map((usage) => ({
      generationJobId: usage.generationJobId,
      contentItemVersionId: usage.contentItemVersionId,
      provider: usage.provider,
      modelId: usage.modelId,
      modelTier: usage.modelTier,
      promptKey: usage.promptKey,
      promptVersion: usage.promptVersion,
      generationPurpose: usage.generationPurpose,
      attemptNumber: usage.attemptNumber,
      repair: usage.repair,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      reasoningTokens: usage.reasoningTokens,
      totalTokens: usage.totalTokens,
      estimatedCostMinorUnits:
        usage.estimatedCostMinorUnits === null
          ? null
          : usage.estimatedCostMinorUnits.toString(),
      currency: usage.currency,
      usageSource: usage.usageSource,
      providerRequestIdHash: usage.providerRequestIdHash,
      runtimeKey: usage.runtimeKey,
      modelRef: usage.modelRef,
      providerKind: usage.providerKind,
      policyKey: usage.policyKey,
      policyVersion: usage.policyVersion,
      fallbackUsed: usage.fallbackUsed,
      structuredMode: usage.structuredMode,
      latencyMs: usage.latencyMs,
      createdAt: iso(usage.createdAt),
    })),
    knowledgeDocuments: project.knowledgeDocuments.map((document) => ({
      title: document.title,
      mediaType: document.mediaType,
      content: document.content,
      byteSize: document.byteSize,
      contentSha256: document.contentSha256,
      status: document.status,
      createdAt: iso(document.createdAt),
      updatedAt: iso(document.updatedAt),
      chunks: document.chunks.map((chunk) => ({
        id: chunk.id,
        ordinal: chunk.ordinal,
        text: chunk.text,
        tokenEstimate: chunk.tokenEstimate,
        embedding: chunk.embedding
          ? Buffer.from(chunk.embedding).toString("base64")
          : null,
        embeddingModel: chunk.embeddingModel,
        embeddingDims: chunk.embeddingDims,
        createdAt: iso(chunk.createdAt),
      })),
    })),
  }));

  const now = input.now ?? new Date();
  const workspacePackage: WorkspacePackage = {
    format: WORKSPACE_PACKAGE_FORMAT,
    formatVersion: WORKSPACE_PACKAGE_FORMAT_VERSION,
    createdAt: iso(now),
    appRelease: input.appRelease,
    databaseMigration: input.databaseMigration,
    projects: records,
  };
  return {
    ok: true,
    bytes: encodeWorkspacePackage(workspacePackage),
    filename: `web-content-flow-workspace-${iso(now).slice(0, 10)}.json.gz`,
    projects: records.length,
  };
}

export function encodeWorkspacePackage(value: WorkspacePackage): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(value), "utf8"));
}

export function decodeWorkspacePackage(
  bytes: Uint8Array,
):
  | { ok: true; value: WorkspacePackage }
  | { ok: false; code: "INVALID" | "UNSUPPORTED"; message: string } {
  const invalid = {
    ok: false,
    code: "INVALID",
    message: "This file is not a Web Content Flow workspace package.",
  } as const;
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b)
    return invalid;
  let raw: unknown;
  try {
    const json = gunzipSync(bytes, {
      maxOutputLength: WORKSPACE_PACKAGE_MAX_JSON_BYTES,
    });
    raw = JSON.parse(json.toString("utf8"));
  } catch {
    return invalid;
  }
  if (
    typeof raw !== "object" ||
    raw === null ||
    (raw as { format?: unknown }).format !== WORKSPACE_PACKAGE_FORMAT
  )
    return invalid;
  const version = (raw as { formatVersion?: unknown }).formatVersion;
  if (typeof version === "number" && version > WORKSPACE_PACKAGE_FORMAT_VERSION)
    return {
      ok: false,
      code: "UNSUPPORTED",
      message:
        "This package was made by a newer version of Web Content Flow. Update the app and try again.",
    };
  const parsed = WorkspacePackageSchema.safeParse(raw);
  if (!parsed.success) return { ...invalid, message: invalidMessage() };
  const integrity = checkReferences(parsed.data);
  if (integrity) return { ...invalid, message: invalidMessage() };
  return { ok: true, value: parsed.data };
}

function invalidMessage() {
  return "This workspace package is damaged or incomplete. Nothing was imported.";
}

/**
 * Every reference inside a project must point at a record of the same
 * project in the package. Returns a description of the first broken one.
 */
export function checkReferences(value: WorkspacePackage): string | null {
  const seen = new Set<string>();
  const unique = (key: string) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  for (const project of value.projects) {
    if (!unique(project.id)) return `duplicate id ${project.id}`;
    for (const projectModule of project.modules)
      if (!unique(projectModule.id)) return `duplicate id ${projectModule.id}`;
    const brandVersions = new Set(
      project.brandProfile?.versions.map((version) => version.id) ?? [],
    );
    const jobs = new Set(project.jobs.map((job) => job.id));
    const contentVersions = new Set<string>();
    for (const id of [...brandVersions, ...jobs])
      if (!unique(id)) return `duplicate id ${id}`;
    if (brandVersions.size !== (project.brandProfile?.versions.length ?? 0))
      return "duplicate brand profile version";
    if (jobs.size !== project.jobs.length) return "duplicate job";
    if (
      project.currentBrandProfileVersionId &&
      !brandVersions.has(project.currentBrandProfileVersionId)
    )
      return "current brand profile version";
    for (const job of project.jobs) {
      if (job.parentJobId && !jobs.has(job.parentJobId)) return "parent job";
      if (
        job.brandProfileVersionId &&
        !brandVersions.has(job.brandProfileVersionId)
      )
        return "job brand profile version";
    }
    for (const item of project.contentItems) {
      if (!unique(item.id)) return `duplicate id ${item.id}`;
      if (!brandVersions.has(item.sourceBrandProfileVersionId))
        return "item brand profile version";
      if (item.sourceJobId && !jobs.has(item.sourceJobId)) return "item job";
      const own = new Set<string>();
      for (const version of item.versions) {
        if (!unique(version.id)) return `duplicate id ${version.id}`;
        own.add(version.id);
        contentVersions.add(version.id);
        if (!brandVersions.has(version.brandProfileVersionId))
          return "version brand profile version";
        if (version.sourceJobId && !jobs.has(version.sourceJobId))
          return "version job";
      }
      if (item.currentVersionId && !own.has(item.currentVersionId))
        return "current content version";
    }
    for (const usage of project.usage) {
      if (!jobs.has(usage.generationJobId)) return "usage job";
      if (
        usage.contentItemVersionId &&
        !contentVersions.has(usage.contentItemVersionId)
      )
        return "usage content version";
    }
    for (const document of project.knowledgeDocuments)
      for (const chunk of document.chunks)
        if (!unique(chunk.id)) return `duplicate id ${chunk.id}`;
  }
  return null;
}

/** cuid-shaped IDs, like the ones Prisma generates for these models. */
function newId() {
  const random = BigInt(`0x${randomBytes(16).toString("hex")}`).toString(36);
  return `c${random.padStart(24, "0").slice(0, 24)}`;
}

const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const asNullableJson = (value: unknown) =>
  value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);

/** Rewrites `knowledgeChunkIds` in a provenance object to the new chunk IDs. */
function remapProvenance(value: unknown, ids: Map<string, string>): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return value;
  const chunkIds = (value as { knowledgeChunkIds?: unknown }).knowledgeChunkIds;
  if (!Array.isArray(chunkIds)) return value;
  return {
    ...value,
    knowledgeChunkIds: chunkIds
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => ids.get(entry))
      .filter((entry): entry is string => entry !== undefined),
  };
}

export async function importWorkspace(
  prisma: PrismaClient,
  input: { userId: string; bytes: Uint8Array },
): Promise<WorkspaceImportResult> {
  const decoded = decodeWorkspacePackage(input.bytes);
  if (!decoded.ok) return decoded;
  const workspacePackage = decoded.value;

  const owner = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { plan: true, _count: { select: { projects: true } } },
  });
  const policy = owner ? resolvePlanPolicy(owner.plan) : null;
  if (!owner || !policy)
    return { ok: false, code: "NOT_FOUND", message: "Account not found." };
  if (
    owner._count.projects + workspacePackage.projects.length >
    policy.projectLimit
  )
    return {
      ok: false,
      code: "PROJECT_LIMIT",
      message: `This package has ${workspacePackage.projects.length} projects and your plan allows ${policy.projectLimit} in total (${owner._count.projects} in use). Nothing was imported.`,
    };

  const summary: WorkspaceImportSummary = {
    projects: 0,
    contentItems: 0,
    contentVersions: 0,
    brandProfileVersions: 0,
    knowledgeDocuments: 0,
    jobs: 0,
  };
  const projectIds: string[] = [];

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const project of workspacePackage.projects) {
          const ids = new Map<string, string>();
          const map = (oldId: string) => {
            let value = ids.get(oldId);
            if (!value) {
              value = newId();
              ids.set(oldId, value);
            }
            return value;
          };
          const ref = (oldId: string | null) => (oldId ? map(oldId) : null);
          const actor = (byOwner: boolean) => (byOwner ? input.userId : null);
          const projectId = map(project.id);
          // Chunk IDs first, so provenance can point at the new ones.
          for (const document of project.knowledgeDocuments)
            for (const chunk of document.chunks) map(chunk.id);
          for (const job of project.jobs) map(job.id);
          for (const projectModule of project.modules) map(projectModule.id);
          for (const item of project.contentItems) {
            map(item.id);
            for (const version of item.versions) map(version.id);
          }
          for (const version of project.brandProfile?.versions ?? [])
            map(version.id);

          await tx.project.create({
            data: {
              id: projectId,
              userId: input.userId,
              name: project.name,
              brandName: project.brandName,
              type: project.type,
              status: project.status,
              outputLanguage: project.outputLanguage,
              createdAt: new Date(project.createdAt),
              updatedAt: new Date(project.updatedAt),
            },
          });
          if (project.modules.length)
            await tx.projectModule.createMany({
              data: project.modules.map((projectModule) => ({
                id: map(projectModule.id),
                projectId,
                module: projectModule.module,
                status: projectModule.status,
                settings: asJson(projectModule.settings),
                createdAt: new Date(projectModule.createdAt),
                updatedAt: new Date(projectModule.updatedAt),
              })),
            });
          if (project.brief)
            await tx.projectBrief.create({
              data: {
                projectId,
                schemaVersion: project.brief.schemaVersion,
                revision: project.brief.revision,
                data: asJson(project.brief.data),
                createdAt: new Date(project.brief.createdAt),
                updatedAt: new Date(project.brief.updatedAt),
              },
            });
          if (project.brandProfile) {
            const brandProfile = await tx.brandProfile.create({
              data: {
                projectId,
                createdAt: new Date(project.brandProfile.createdAt),
              },
            });
            if (project.brandProfile.versions.length)
              await tx.brandProfileVersion.createMany({
                data: project.brandProfile.versions.map((version) => ({
                  id: map(version.id),
                  brandProfileId: brandProfile.id,
                  versionNumber: version.versionNumber,
                  schemaVersion: version.schemaVersion,
                  snapshot: asJson(version.snapshot),
                  source: version.source,
                  actorUserId: actor(version.byOwner),
                  mock: version.mock,
                  provenance: asJson(remapProvenance(version.provenance, ids)),
                  createdAt: new Date(version.createdAt),
                })),
              });
            summary.brandProfileVersions +=
              project.brandProfile.versions.length;
          }
          // Parents before children, so the self reference is always valid.
          const jobs = orderJobs(project.jobs);
          if (jobs.length) {
            await tx.generationJob.createMany({
              data: jobs.map((job) => ({
                id: map(job.id),
                projectId,
                parentJobId: ref(job.parentJobId),
                scopeType: job.scopeType,
                scopeId: job.scopeId
                  ? (ids.get(job.scopeId) ?? job.scopeId)
                  : null,
                module: job.module,
                status: job.status,
                mode: job.mode,
                provider: job.provider,
                modelTier: job.modelTier,
                modelId: job.modelId,
                promptKey: job.promptKey,
                promptVersion: job.promptVersion,
                generationPurpose: job.generationPurpose,
                briefRevision: job.briefRevision,
                providerAttemptCount: job.providerAttemptCount,
                normalizedProviderError: job.normalizedProviderError,
                repairAttempted: job.repairAttempted,
                runtimeKey: job.runtimeKey,
                modelRef: job.modelRef,
                providerKind: job.providerKind,
                policyKey: job.policyKey,
                policyVersion: job.policyVersion,
                fallbackUsed: job.fallbackUsed,
                structuredMode: job.structuredMode,
                idempotencyKey: job.idempotencyKey,
                attempt: job.attempt,
                maxAttempts: job.maxAttempts,
                availableAt: new Date(job.createdAt),
                brandProfileVersionId: ref(job.brandProfileVersionId),
                request: asJson(job.request),
                safeErrorCode: job.safeErrorCode,
                safeErrorDetails: asNullableJson(job.safeErrorDetails),
                usage: asNullableJson(job.usage),
                createdAt: new Date(job.createdAt),
                updatedAt: new Date(job.updatedAt),
                startedAt: job.startedAt ? new Date(job.startedAt) : null,
                completedAt: job.completedAt ? new Date(job.completedAt) : null,
                cancelRequestedAt: job.cancelRequestedAt
                  ? new Date(job.cancelRequestedAt)
                  : null,
              })),
            });
            const steps = jobs.flatMap((job) =>
              job.steps.map((step) => ({
                jobId: map(job.id),
                key: step.key,
                label: step.label,
                status: step.status,
                ordinal: step.ordinal,
                startedAt: step.startedAt ? new Date(step.startedAt) : null,
                completedAt: step.completedAt
                  ? new Date(step.completedAt)
                  : null,
                safeErrorCode: step.safeErrorCode,
              })),
            );
            if (steps.length)
              await tx.generationJobStep.createMany({ data: steps });
            summary.jobs += jobs.length;
          }
          if (project.contentItems.length) {
            await tx.contentItem.createMany({
              data: project.contentItems.map((item) => ({
                id: map(item.id),
                projectId,
                module: item.module,
                type: item.type,
                identityKey: item.identityKey,
                title: item.title,
                status: item.status,
                sourceJobId: ref(item.sourceJobId),
                sourceBrandProfileVersionId: map(
                  item.sourceBrandProfileVersionId,
                ),
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt),
              })),
            });
            const versions = project.contentItems.flatMap((item) =>
              item.versions.map((version) => ({
                id: map(version.id),
                contentItemId: map(item.id),
                versionNumber: version.versionNumber,
                schemaVersion: version.schemaVersion,
                snapshot: asJson(version.snapshot),
                source: version.source,
                sourceJobId: ref(version.sourceJobId),
                brandProfileVersionId: map(version.brandProfileVersionId),
                actorUserId: actor(version.byOwner),
                mock: version.mock,
                provenance: asJson(remapProvenance(version.provenance, ids)),
                createdAt: new Date(version.createdAt),
              })),
            );
            await tx.contentItemVersion.createMany({ data: versions });
            for (const item of project.contentItems)
              if (item.currentVersionId)
                await tx.contentItem.update({
                  where: { id: map(item.id) },
                  data: {
                    currentVersionId: map(item.currentVersionId),
                    // Keep the original timestamp; @updatedAt would reset it.
                    updatedAt: new Date(item.updatedAt),
                  },
                });
            summary.contentItems += project.contentItems.length;
            summary.contentVersions += versions.length;
          }
          if (project.currentBrandProfileVersionId)
            await tx.project.update({
              where: { id: projectId },
              data: {
                currentBrandProfileVersionId: map(
                  project.currentBrandProfileVersionId,
                ),
                updatedAt: new Date(project.updatedAt),
              },
            });
          if (project.usage.length)
            await tx.generationUsage.createMany({
              data: project.usage.map((usage) => ({
                projectId,
                userId: input.userId,
                generationJobId: map(usage.generationJobId),
                contentItemVersionId: ref(usage.contentItemVersionId),
                provider: usage.provider,
                modelId: usage.modelId,
                modelTier: usage.modelTier,
                promptKey: usage.promptKey,
                promptVersion: usage.promptVersion,
                generationPurpose: usage.generationPurpose,
                attemptNumber: usage.attemptNumber,
                repair: usage.repair,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                cachedInputTokens: usage.cachedInputTokens,
                reasoningTokens: usage.reasoningTokens,
                totalTokens: usage.totalTokens,
                estimatedCostMinorUnits:
                  usage.estimatedCostMinorUnits === null
                    ? null
                    : BigInt(usage.estimatedCostMinorUnits),
                currency: usage.currency,
                usageSource: usage.usageSource,
                providerRequestIdHash: usage.providerRequestIdHash,
                runtimeKey: usage.runtimeKey,
                modelRef: usage.modelRef,
                providerKind: usage.providerKind,
                policyKey: usage.policyKey,
                policyVersion: usage.policyVersion,
                fallbackUsed: usage.fallbackUsed,
                structuredMode: usage.structuredMode,
                latencyMs: usage.latencyMs,
                createdAt: new Date(usage.createdAt),
              })),
            });
          for (const document of project.knowledgeDocuments) {
            const created = await tx.knowledgeDocument.create({
              data: {
                projectId,
                title: document.title,
                mediaType: document.mediaType,
                content: document.content,
                byteSize: document.byteSize,
                contentSha256: document.contentSha256,
                status: document.status,
                createdAt: new Date(document.createdAt),
                updatedAt: new Date(document.updatedAt),
              },
            });
            if (document.chunks.length)
              await tx.knowledgeChunk.createMany({
                data: document.chunks.map((chunk) => ({
                  id: map(chunk.id),
                  documentId: created.id,
                  projectId,
                  ordinal: chunk.ordinal,
                  text: chunk.text,
                  tokenEstimate: chunk.tokenEstimate,
                  embedding: chunk.embedding
                    ? new Uint8Array(Buffer.from(chunk.embedding, "base64"))
                    : null,
                  embeddingModel: chunk.embeddingModel,
                  embeddingDims: chunk.embeddingDims,
                  createdAt: new Date(chunk.createdAt),
                })),
              });
            summary.knowledgeDocuments += 1;
          }
          projectIds.push(projectId);
          summary.projects += 1;
        }
      },
      { timeout: 300_000, maxWait: 30_000 },
    );
  } catch {
    // A constraint the schema cannot see (for example two versions claiming
    // the same job). The transaction rolled back: nothing was imported.
    return { ok: false, code: "INVALID", message: invalidMessage() };
  }

  return { ok: true, summary, projectIds };
}

function orderJobs<T extends { id: string; parentJobId: string | null }>(
  jobs: readonly T[],
): T[] {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const ordered: T[] = [];
  const placed = new Set<string>();
  const place = (job: T, depth: number) => {
    if (placed.has(job.id) || depth > jobs.length) return;
    const parent = job.parentJobId ? byId.get(job.parentJobId) : undefined;
    if (parent) place(parent, depth + 1);
    placed.add(job.id);
    ordered.push(job);
  };
  for (const job of jobs) place(job, 0);
  return ordered;
}
