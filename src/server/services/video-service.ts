import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  VideoGenerationRequestSchema,
  VideoRegenerationTargetSchema,
  type VideoGenerationRequest,
  type VideoRegenerationTarget,
} from "@/domain/video/video-schemas";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

type VideoError = {
  code: "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INTERNAL";
  message: string;
};
const steps = [
  ["prepare", "Preparing project context"],
  ["generate", "Writing video content"],
  ["validate", "Validating video plan"],
  ["save", "Saving video content"],
] as const;
const digest = (request: VideoGenerationRequest) =>
  createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex")
    .slice(0, 16);

export async function configureVideoModule(input: {
  userId: string;
  projectId: string;
  request: unknown;
}): Promise<Result<{ projectModuleId: string }, VideoError>> {
  const parsed = VideoGenerationRequestSchema.safeParse(input.request);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Check the Video setup.",
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
    where: { projectId_module: { projectId: project.id, module: "VIDEO" } },
    create: {
      projectId: project.id,
      module: "VIDEO",
      status: "READY",
      settings: parsed.data as unknown as Prisma.InputJsonValue,
    },
    update: {
      status: "READY",
      settings: parsed.data as unknown as Prisma.InputJsonValue,
    },
  });
  return { ok: true, value: { projectModuleId: projectModule.id } };
}

export async function queueVideoGeneration(input: {
  userId: string;
  projectId: string;
}): Promise<Result<{ jobId: string }, VideoError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  const projectModule = await prisma.projectModule.findFirst({
    where: {
      projectId: input.projectId,
      module: "VIDEO",
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
      error: { code: "NOT_FOUND", message: "Configure Video & Reels first." },
    };
  const settings = VideoGenerationRequestSchema.safeParse(
    projectModule.settings,
  );
  if (!settings.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Video settings are invalid." },
    };
  const batchKey = digest(settings.data);
  const idempotencyKey = `video:${project.currentBrandProfileVersionId}:${project.brief.revision}:${batchKey}`;
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
      module: "VIDEO",
      status: "QUEUED",
      ...getNewJobGenerationConfiguration({
        promptKey: "video.module.generation",
        briefRevision: project.brief.revision,
      }),
      idempotencyKey,
      request: {
        kind: "VIDEO_MODULE",
        batchKey,
        briefRevision: project.brief.revision,
        brandProfileVersionId: project.currentBrandProfileVersionId,
        settings: settings.data,
      } as Prisma.InputJsonValue,
      steps: {
        create: [
          { key: "prepare", label: "Preparing project context", ordinal: 0 },
          { key: "plan", label: "Planning video concepts", ordinal: 1 },
          {
            key: "assets",
            label: "Writing scripts and production assets",
            ordinal: 2,
          },
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

export async function queueVideoRegeneration(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: VideoRegenerationTarget;
}): Promise<Result<{ jobId: string }, VideoError>> {
  const parsed = input.target
    ? VideoRegenerationTargetSchema.safeParse(input.target)
    : null;
  if (parsed && !parsed.success)
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
      module: "VIDEO",
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
        message: "Reload the latest video plan before regenerating.",
      },
    };
  const kind = input.target
    ? input.target.kind === "SCENE"
      ? "VIDEO_SCENE_REGENERATE"
      : input.target.kind === "SHOT"
        ? "VIDEO_SHOT_REGENERATE"
        : "VIDEO_FIELD_REGENERATE"
    : "VIDEO_ITEM_REGENERATE";
  const idempotencyKey = `${kind}:${item.id}:${item.currentVersionId}:${JSON.stringify(input.target ?? "item")}:${item.project.currentBrandProfileVersionId}`;
  const existing = await prisma.generationJob.findUnique({
    where: {
      projectId_idempotencyKey: { projectId: item.projectId, idempotencyKey },
    },
  });
  if (existing) return { ok: true, value: { jobId: existing.id } };
  const job = await prisma.generationJob.create({
    data: {
      projectId: item.projectId,
      scopeType: "CONTENT_ITEM",
      scopeId: item.id,
      module: "VIDEO",
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
        create: steps.map(([key, label], ordinal) => ({ key, label, ordinal })),
      },
    },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function retryFailedVideoAsset(input: {
  userId: string;
  jobId: string;
}): Promise<Result<{ jobId: string }, VideoError>> {
  const prisma = getPrisma();
  const job = await prisma.generationJob.findFirst({
    where: {
      id: input.jobId,
      module: "VIDEO",
      status: "FAILED",
      parentJobId: { not: null },
      project: { userId: input.userId },
    },
  });
  if (!job || job.attempt >= job.maxAttempts)
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "This video asset cannot be retried.",
      },
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
      where: { projectId: job.projectId, module: "VIDEO" },
      data: { status: "GENERATING" },
    }),
  ]);
  return { ok: true, value: { jobId: job.id } };
}
