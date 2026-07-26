import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { Result } from "@/lib/result/result";
import {
  WebsiteGenerationRequestSchema,
  type WebsiteGenerationRequest,
} from "@/domain/website/website-schemas";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

type WebsiteError = {
  code: "NOT_FOUND" | "VALIDATION" | "INTERNAL";
  message: string;
};

const steps = [
  ["prepare", "Preparing project context"],
  ["generate", "Generating page copy"],
  ["validate", "Validating page structure"],
  ["save", "Saving page content"],
] as const;

export async function configureWebsiteModule(input: {
  userId: string;
  projectId: string;
  request: unknown;
}): Promise<Result<{ projectModuleId: string }, WebsiteError>> {
  const parsed = WebsiteGenerationRequestSchema.safeParse(input.request);
  if (!parsed.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Check the Website setup fields." },
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
      projectId_module: { projectId: project.id, module: "WEBSITE" },
    },
    create: {
      projectId: project.id,
      module: "WEBSITE",
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

function requestDigest(request: WebsiteGenerationRequest) {
  return createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex")
    .slice(0, 16);
}

export async function queueWebsiteGeneration(input: {
  userId: string;
  projectId: string;
}): Promise<Result<{ jobId: string }, WebsiteError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  const projectModule = await prisma.projectModule.findFirst({
    where: {
      projectId: input.projectId,
      module: "WEBSITE",
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
      error: { code: "NOT_FOUND", message: "Configure Website first." },
    };
  const settings = WebsiteGenerationRequestSchema.safeParse(
    projectModule.settings,
  );
  if (!settings.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Website settings are invalid." },
    };
  const idempotencyKey = `website:${project.currentBrandProfileVersionId}:${project.brief.revision}:${requestDigest(settings.data)}`;
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
      module: "WEBSITE",
      status: "QUEUED",
      ...getNewJobGenerationConfiguration({
        promptKey: "website.module.generation",
        briefRevision: project.brief.revision,
      }),
      idempotencyKey,
      request: {
        kind: "WEBSITE_MODULE",
        brandProfileVersionId: project.currentBrandProfileVersionId,
        briefRevision: project.brief.revision,
        settings: settings.data,
      } as Prisma.InputJsonValue,
      steps: {
        create: [
          {
            key: "prepare",
            label: "Preparing website page jobs",
            ordinal: 0,
          },
          {
            key: "pages",
            label: "Generating selected pages",
            ordinal: 1,
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

export async function queueWebsitePageRegeneration(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  sectionId?: string;
}): Promise<Result<{ jobId: string }, WebsiteError>> {
  const prisma = getPrisma();
  const item = await prisma.contentItem.findFirst({
    where: {
      id: input.itemId,
      module: "WEBSITE",
      type: "WEBSITE_PAGE",
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
        code: "NOT_FOUND",
        message: "Reload the latest page before regenerating.",
      },
    };
  const kind = input.sectionId
    ? "WEBSITE_SECTION_REGENERATE"
    : "WEBSITE_PAGE_REGENERATE";
  const idempotencyKey = `${kind}:${item.id}:${item.currentVersionId}:${input.sectionId ?? "page"}:${item.project.currentBrandProfileVersionId}`;
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
      scopeType: input.sectionId ? "CONTENT_SECTION" : "CONTENT_ITEM",
      scopeId: item.id,
      module: "WEBSITE",
      status: "QUEUED",
      idempotencyKey,
      request: {
        kind,
        itemId: item.id,
        expectedCurrentVersionId: item.currentVersionId,
        brandProfileVersionId: item.project.currentBrandProfileVersionId,
        ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      } as Prisma.InputJsonValue,
      steps: {
        create: steps.map(([key, label], ordinal) => ({
          key,
          label,
          ordinal,
        })),
      },
    },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function retryFailedWebsitePage(input: {
  userId: string;
  jobId: string;
}): Promise<Result<{ jobId: string }, WebsiteError>> {
  const prisma = getPrisma();
  const job = await prisma.generationJob.findFirst({
    where: {
      id: input.jobId,
      module: "WEBSITE",
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
        message: "This page job cannot be retried.",
      },
    };
  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "QUEUED",
        availableAt: new Date(),
        completedAt: null,
        safeErrorCode: null,
        safeErrorDetails: {},
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
      where: { projectId: job.projectId, module: "WEBSITE" },
      data: { status: "GENERATING" },
    }),
  ]);
  return { ok: true, value: { jobId: job.id } };
}
