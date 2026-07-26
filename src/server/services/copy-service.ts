import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  COPY_FIELD_COMPATIBILITY,
  CopyGenerationRequestSchema,
  CopyRegenerationTargetSchema,
  GeneralCopyTypeSchema,
  SECTION_COPY_TYPES,
  type CopyRegenerationTarget,
  type GeneralCopyType,
} from "@/domain/copy/copy-schemas";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

type CopyError = {
  code: "NOT_FOUND" | "VALIDATION" | "CONFLICT";
  message: string;
};
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const itemSteps = [
  ["prepare", "Preparing project context"],
  ["generate", "Writing structured copy"],
  ["validate", "Validating copy"],
  ["save", "Saving copy asset"],
] as const;

export async function configureCopyModule(input: {
  userId: string;
  projectId: string;
  request: unknown;
}): Promise<Result<{ projectModuleId: string }, CopyError>> {
  const parsed = CopyGenerationRequestSchema.safeParse(input.request);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Check the Copy setup.",
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
    where: { projectId_module: { projectId: project.id, module: "COPY" } },
    create: {
      projectId: project.id,
      module: "COPY",
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

export async function queueCopyGeneration(input: {
  userId: string;
  projectId: string;
}): Promise<Result<{ jobId: string }, CopyError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  const projectModule = await prisma.projectModule.findFirst({
    where: {
      projectId: input.projectId,
      module: "COPY",
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
      error: { code: "NOT_FOUND", message: "Configure General Copy first." },
    };
  const settings = CopyGenerationRequestSchema.safeParse(
    projectModule.settings,
  );
  if (!settings.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Copy settings are invalid." },
    };
  const batchKey = digest(settings.data);
  const idempotencyKey = `copy:${project.currentBrandProfileVersionId}:${project.brief.revision}:${batchKey}`;
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
      module: "COPY",
      status: "QUEUED",
      ...getNewJobGenerationConfiguration({
        promptKey: "copy.module.generation",
        ...(project.brief ? { briefRevision: project.brief.revision } : {}),
      }),
      idempotencyKey,
      request: {
        kind: "COPY_MODULE",
        batchKey,
        brandProfileVersionId: project.currentBrandProfileVersionId,
        settings: settings.data,
      } as Prisma.InputJsonValue,
      steps: {
        create: [
          { key: "prepare", label: "Preparing project context", ordinal: 0 },
          { key: "plan", label: "Planning copy assets", ordinal: 1 },
          {
            key: "assets",
            label: "Writing and saving copy assets",
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

export async function queueSingleCopyAsset(input: {
  userId: string;
  projectId: string;
  contentType: GeneralCopyType;
}): Promise<Result<{ jobId: string }, CopyError>> {
  const type = GeneralCopyTypeSchema.safeParse(input.contentType);
  if (!type.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Choose a supported Copy type." },
    };
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  const projectModule = await prisma.projectModule.findFirst({
    where: {
      projectId: input.projectId,
      module: "COPY",
      project: { userId: input.userId },
    },
  });
  const settings = projectModule
    ? CopyGenerationRequestSchema.safeParse(projectModule.settings)
    : null;
  if (!project?.currentBrandProfileVersionId || !settings || !settings.success)
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Configure General Copy first." },
    };
  const ordinal =
    (await prisma.contentItem.count({
      where: { projectId: project.id, module: "COPY", type: type.data },
    })) + 1;
  const itemKey = `single-${type.data.toLocaleLowerCase()}-${String(ordinal).padStart(2, "0")}-${digest([settings.data.topic, ordinal])}`;
  const idempotencyKey = `copy-item:${project.currentBrandProfileVersionId}:${itemKey}`;
  const job = await prisma.generationJob.upsert({
    where: {
      projectId_idempotencyKey: { projectId: project.id, idempotencyKey },
    },
    update: {},
    create: {
      ...getNewJobGenerationConfiguration({
        promptKey: `copy.${type.data.toLocaleLowerCase()}.generation`,
        ...(project.brief ? { briefRevision: project.brief.revision } : {}),
        purpose: "ITEM_GENERATION",
      }),
      projectId: project.id,
      scopeType: "CONTENT_ITEM",
      scopeId: itemKey,
      module: "COPY",
      status: "QUEUED",
      idempotencyKey,
      request: {
        kind: "COPY_ITEM_NEW",
        itemKey,
        contentType: type.data,
        ordinal,
        settings: settings.data,
        brandProfileVersionId: project.currentBrandProfileVersionId,
        scenario: "success",
      } as Prisma.InputJsonValue,
      steps: {
        create: itemSteps.map(([key, label], index) => ({
          key,
          label,
          ordinal: index,
        })),
      },
    },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function queueCopyRegeneration(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: CopyRegenerationTarget;
}): Promise<Result<{ jobId: string }, CopyError>> {
  const target = input.target
    ? CopyRegenerationTargetSchema.safeParse(input.target)
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
      module: "COPY",
      project: { userId: input.userId },
    },
    include: { project: true, currentVersion: true },
  });
  const type = item ? GeneralCopyTypeSchema.safeParse(item.type) : null;
  if (
    !item?.currentVersion ||
    !type?.success ||
    item.currentVersionId !== input.expectedCurrentVersionId ||
    !item.project.currentBrandProfileVersionId
  )
    return {
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Reload the latest copy before regenerating.",
      },
    };
  if (target?.success) {
    if (target.data.kind === "SECTION" && !SECTION_COPY_TYPES.has(type.data))
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "This item has no regenerable sections.",
        },
      };
    if (
      target.data.kind === "FIELD" &&
      !COPY_FIELD_COMPATIBILITY[type.data].includes(target.data.field)
    )
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "This field cannot be regenerated for this copy type.",
        },
      };
  }
  const kind = target?.success
    ? target.data.kind === "SECTION"
      ? "COPY_SECTION_REGENERATE"
      : "COPY_FIELD_REGENERATE"
    : "COPY_ITEM_REGENERATE";
  const idempotencyKey = `${kind}:${item.id}:${item.currentVersionId}:${JSON.stringify(target?.success ? target.data : "item")}:${item.project.currentBrandProfileVersionId}`;
  const job = await prisma.generationJob.upsert({
    where: {
      projectId_idempotencyKey: { projectId: item.projectId, idempotencyKey },
    },
    update: {},
    create: {
      ...getNewJobGenerationConfiguration({
        promptKey: `copy.${item.type.toLocaleLowerCase()}.generation`,
        purpose:
          input.target?.kind === "SECTION"
            ? "SECTION_REGENERATION"
            : input.target?.kind === "FIELD"
              ? "FIELD_REGENERATION"
              : "WHOLE_ITEM_REGENERATION",
      }),
      projectId: item.projectId,
      scopeType: "CONTENT_ITEM",
      scopeId: item.id,
      module: "COPY",
      status: "QUEUED",
      idempotencyKey,
      request: {
        kind,
        itemId: item.id,
        contentType: type.data,
        expectedCurrentVersionId: item.currentVersionId,
        brandProfileVersionId: item.project.currentBrandProfileVersionId,
        ...(target?.success ? { target: target.data } : {}),
      } as Prisma.InputJsonValue,
      steps: {
        create: itemSteps.map(([key, label], index) => ({
          key,
          label,
          ordinal: index,
        })),
      },
    },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function retryFailedCopyAsset(input: {
  userId: string;
  jobId: string;
}): Promise<Result<{ jobId: string }, CopyError>> {
  const prisma = getPrisma();
  const job = await prisma.generationJob.findFirst({
    where: {
      id: input.jobId,
      module: "COPY",
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
        message: "This Copy asset cannot be retried.",
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
      where: { projectId: job.projectId, module: "COPY" },
      data: { status: "GENERATING" },
    }),
  ]);
  return { ok: true, value: { jobId: job.id } };
}
