import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  AdsGenerationRequestSchema,
  AdsRegenerationTargetSchema,
  type AdsGenerationRequest,
  type AdsRegenerationTarget,
} from "@/domain/ads/ads-schemas";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

type AdsError = {
  code: "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INTERNAL";
  message: string;
};

const itemSteps = [
  ["prepare", "Preparing campaign context"],
  ["generate", "Creating advertising content"],
  ["validate", "Validating advertising content"],
  ["save", "Saving advertising asset"],
] as const;

function digest(request: AdsGenerationRequest) {
  return createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex")
    .slice(0, 16);
}

export async function configureAdsModule(input: {
  userId: string;
  projectId: string;
  request: unknown;
}): Promise<Result<{ projectModuleId: string }, AdsError>> {
  const parsed = AdsGenerationRequestSchema.safeParse(input.request);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Check the Ads setup.",
      },
    };
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  if (!project?.brief || !project.currentBrandProfileVersionId)
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Complete the Brief and Brand Profile first.",
      },
    };
  const projectModule = await prisma.projectModule.upsert({
    where: { projectId_module: { projectId: project.id, module: "ADS" } },
    create: {
      projectId: project.id,
      module: "ADS",
      status: "READY",
      settings: parsed.data as unknown as Prisma.InputJsonValue,
    },
    update: {
      settings: parsed.data as unknown as Prisma.InputJsonValue,
      status: "READY",
    },
  });
  return { ok: true, value: { projectModuleId: projectModule.id } };
}

export async function queueAdsGeneration(input: {
  userId: string;
  projectId: string;
}): Promise<Result<{ jobId: string }, AdsError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  const projectModule = await prisma.projectModule.findFirst({
    where: {
      projectId: input.projectId,
      module: "ADS",
      project: { userId: input.userId },
    },
  });
  if (
    !project?.brief ||
    !project.currentBrandProfileVersionId ||
    !projectModule
  )
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Configure Ads & Creative first." },
    };
  const settings = AdsGenerationRequestSchema.safeParse(projectModule.settings);
  if (!settings.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Ads settings are invalid." },
    };
  const batchKey = digest(settings.data);
  const idempotencyKey = `ads:${project.currentBrandProfileVersionId}:${project.brief.revision}:${batchKey}`;
  const existing = await prisma.generationJob.findUnique({
    where: {
      projectId_idempotencyKey: { projectId: project.id, idempotencyKey },
    },
  });
  if (existing) return { ok: true, value: { jobId: existing.id } };
  const job = await prisma.generationJob.create({
    data: {
      projectId: project.id,
      scopeType: "MODULE",
      scopeId: projectModule.id,
      module: "ADS",
      status: "QUEUED",
      ...getNewJobGenerationConfiguration({
        promptKey: "ads.module.generation",
        briefRevision: project.brief.revision,
      }),
      idempotencyKey,
      request: {
        kind: "ADS_MODULE",
        batchKey,
        briefRevision: project.brief.revision,
        brandProfileVersionId: project.currentBrandProfileVersionId,
        settings: settings.data,
      } as Prisma.InputJsonValue,
      steps: {
        create: [
          { key: "prepare", label: "Preparing campaign context", ordinal: 0 },
          { key: "plan", label: "Planning advertising assets", ordinal: 1 },
          { key: "assets", label: "Creating advertising assets", ordinal: 2 },
        ],
      },
    },
  });
  await prisma.projectModule.update({
    where: { id: projectModule.id },
    data: { status: "GENERATING" },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function queueAdsRegeneration(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: AdsRegenerationTarget;
}): Promise<Result<{ jobId: string }, AdsError>> {
  const parsedTarget = input.target
    ? AdsRegenerationTargetSchema.safeParse(input.target)
    : null;
  if (parsedTarget && !parsedTarget.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Unsupported regeneration target.",
      },
    };
  const prisma = getPrisma();
  const item = await prisma.contentItem.findFirst({
    where: {
      id: input.itemId,
      module: "ADS",
      project: { userId: input.userId },
    },
    include: { project: true, currentVersion: true },
  });
  if (
    !item?.currentVersion ||
    item.currentVersionId !== input.expectedCurrentVersionId ||
    !item.project.currentBrandProfileVersionId
  )
    return {
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Reload the latest asset before regenerating.",
      },
    };
  const kind = input.target
    ? input.target.kind === "VARIANT"
      ? "ADS_VARIANT_REGENERATE"
      : input.target.kind === "PROMPT"
        ? "ADS_PROMPT_REGENERATE"
        : "ADS_FIELD_REGENERATE"
    : "ADS_ITEM_REGENERATE";
  const idempotencyKey = `${kind}:${item.id}:${item.currentVersionId}:${JSON.stringify(input.target ?? "item")}:${item.project.currentBrandProfileVersionId}`;
  const existing = await prisma.generationJob.findUnique({
    where: {
      projectId_idempotencyKey: {
        projectId: item.projectId,
        idempotencyKey,
      },
    },
  });
  if (existing) return { ok: true, value: { jobId: existing.id } };
  const job = await prisma.generationJob.create({
    data: {
      projectId: item.projectId,
      scopeType: "CONTENT_ITEM",
      scopeId: item.id,
      module: "ADS",
      status: "QUEUED",
      idempotencyKey,
      request: {
        kind,
        itemId: item.id,
        contentType: item.type,
        expectedCurrentVersionId: item.currentVersionId,
        brandProfileVersionId: item.project.currentBrandProfileVersionId,
        ...(input.target ? { target: input.target } : {}),
      } as Prisma.InputJsonValue,
      steps: {
        create: itemSteps.map(([key, label], ordinal) => ({
          key,
          label,
          ordinal,
        })),
      },
    },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function retryFailedAdsAsset(input: {
  userId: string;
  jobId: string;
}): Promise<Result<{ jobId: string }, AdsError>> {
  const prisma = getPrisma();
  const job = await prisma.generationJob.findFirst({
    where: {
      id: input.jobId,
      module: "ADS",
      status: "FAILED",
      parentJobId: { not: null },
      project: { userId: input.userId },
    },
  });
  if (!job || job.attempt >= job.maxAttempts)
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This asset cannot be retried." },
    };
  const request =
    typeof job.request === "object" &&
    job.request !== null &&
    !Array.isArray(job.request)
      ? { ...job.request, scenario: "success" }
      : job.request;
  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "QUEUED",
        availableAt: new Date(),
        completedAt: null,
        safeErrorCode: null,
        safeErrorDetails: {},
        request: request as Prisma.InputJsonValue,
      },
    }),
    prisma.generationJobStep.updateMany({
      where: { jobId: job.id },
      data: {
        status: "PENDING",
        startedAt: null,
        completedAt: null,
        safeErrorCode: null,
      },
    }),
    prisma.generationJob.update({
      where: { id: job.parentJobId! },
      data: { status: "RUNNING", completedAt: null, safeErrorCode: null },
    }),
    prisma.projectModule.updateMany({
      where: { projectId: job.projectId, module: "ADS" },
      data: { status: "GENERATING" },
    }),
  ]);
  return { ok: true, value: { jobId: job.id } };
}
