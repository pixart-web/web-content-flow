import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  SocialGenerationRequestSchema,
  SocialRegenerationTargetSchema,
  type SocialGenerationRequest,
  type SocialRegenerationTarget,
} from "@/domain/social/social-schemas";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

type SocialError = {
  code: "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INTERNAL";
  message: string;
};

const itemSteps = [
  ["prepare", "Preparing project context"],
  ["generate", "Creating Social item"],
  ["validate", "Validating Social content"],
  ["save", "Saving Social content"],
] as const;

function digest(request: SocialGenerationRequest) {
  return createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex")
    .slice(0, 16);
}

export async function configureSocialModule(input: {
  userId: string;
  projectId: string;
  request: unknown;
}): Promise<Result<{ projectModuleId: string }, SocialError>> {
  const parsed = SocialGenerationRequestSchema.safeParse(input.request);
  if (!parsed.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Check the Social setup fields." },
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
    where: {
      projectId_module: { projectId: project.id, module: "SOCIAL" },
    },
    create: {
      projectId: project.id,
      module: "SOCIAL",
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

export async function queueSocialGeneration(input: {
  userId: string;
  projectId: string;
}): Promise<Result<{ jobId: string }, SocialError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  const projectModule = await prisma.projectModule.findFirst({
    where: {
      projectId: input.projectId,
      module: "SOCIAL",
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
      error: { code: "NOT_FOUND", message: "Configure Social first." },
    };
  const settings = SocialGenerationRequestSchema.safeParse(
    projectModule.settings,
  );
  if (!settings.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Social settings are invalid." },
    };
  const batchKey = digest(settings.data);
  const idempotencyKey = `social:${project.currentBrandProfileVersionId}:${project.brief.revision}:${batchKey}`;
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
      module: "SOCIAL",
      status: "QUEUED",
      ...getNewJobGenerationConfiguration({
        promptKey: "social.module.generation",
        briefRevision: project.brief.revision,
      }),
      idempotencyKey,
      request: {
        kind: "SOCIAL_MODULE",
        batchKey,
        briefRevision: project.brief.revision,
        brandProfileVersionId: project.currentBrandProfileVersionId,
        settings: settings.data,
      } as Prisma.InputJsonValue,
      steps: {
        create: [
          {
            key: "prepare",
            label: "Preparing project context",
            ordinal: 0,
          },
          { key: "plan", label: "Planning Social content", ordinal: 1 },
          { key: "items", label: "Creating Social items", ordinal: 2 },
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

export async function queueSocialRegeneration(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: SocialRegenerationTarget;
}): Promise<Result<{ jobId: string }, SocialError>> {
  const target = input.target
    ? SocialRegenerationTargetSchema.safeParse(input.target)
    : null;
  if (target && !target.success)
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
      module: "SOCIAL",
      project: { userId: input.userId },
    },
    include: { project: true },
  });
  if (
    !item ||
    item.currentVersionId !== input.expectedCurrentVersionId ||
    !item.project.currentBrandProfileVersionId
  )
    return {
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Reload the latest item before regenerating.",
      },
    };
  const supported: Record<string, readonly SocialRegenerationTarget[]> = {
    SOCIAL_POST: ["POST_BODY", "HASHTAGS"],
    SOCIAL_CAROUSEL: ["CAROUSEL_CAPTION", "HASHTAGS"],
    SOCIAL_STORY: [],
    SOCIAL_CAPTION: ["STANDALONE_CAPTION", "HASHTAGS"],
  };
  if (input.target && !supported[item.type]?.includes(input.target))
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "This field cannot be regenerated.",
      },
    };
  const kind = input.target
    ? "SOCIAL_FIELD_REGENERATE"
    : "SOCIAL_ITEM_REGENERATE";
  const idempotencyKey = `${kind}:${item.id}:${item.currentVersionId}:${input.target ?? "item"}:${item.project.currentBrandProfileVersionId}`;
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
      module: "SOCIAL",
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

export async function retryFailedSocialItem(input: {
  userId: string;
  jobId: string;
}): Promise<Result<{ jobId: string }, SocialError>> {
  const prisma = getPrisma();
  const job = await prisma.generationJob.findFirst({
    where: {
      id: input.jobId,
      module: "SOCIAL",
      status: "FAILED",
      parentJobId: { not: null },
      project: { userId: input.userId },
    },
  });
  if (!job || job.attempt >= job.maxAttempts)
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This item cannot be retried." },
    };
  const retryRequest =
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
        request: retryRequest as Prisma.InputJsonValue,
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
      where: { projectId: job.projectId, module: "SOCIAL" },
      data: { status: "GENERATING" },
    }),
  ]);
  return { ok: true, value: { jobId: job.id } };
}
