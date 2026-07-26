import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  CalendarGenerationRequestSchema,
  CalendarRegenerationTargetSchema,
  CalendarSnapshotSchema,
  type CalendarRegenerationTarget,
} from "@/domain/calendar/calendar-schemas";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";
import { saveManualContentVersion } from "@/server/services/content-version-service";

type CalendarError = {
  code: "NOT_FOUND" | "VALIDATION" | "CONFLICT";
  message: string;
};
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const jobSteps = [
  ["prepare", "Preparing project context"],
  ["source", "Reviewing available content"],
  ["plan", "Planning editorial cadence"],
  ["validate", "Validating dates and constraints"],
  ["save", "Saving the calendar"],
] as const;

async function ownedSources(
  userId: string,
  projectId: string,
  ids: readonly string[],
) {
  if (!ids.length) return [];
  return getPrisma().contentItem.findMany({
    where: {
      id: { in: [...ids] },
      projectId,
      module: { in: ["WEBSITE", "SOCIAL", "ADS", "VIDEO", "COPY"] },
      project: { userId },
      currentVersionId: { not: null },
    },
    include: {
      currentVersion: true,
      sourceBrandProfileVersion: true,
    },
    take: 200,
  });
}

export async function configureCalendarModule(input: {
  userId: string;
  projectId: string;
  request: unknown;
}): Promise<Result<{ projectModuleId: string }, CalendarError>> {
  const parsed = CalendarGenerationRequestSchema.safeParse(input.request);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Check Calendar setup.",
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
  const requestedIds = parsed.data.sourceSelection.contentItemIds ?? [];
  const sources = await ownedSources(input.userId, project.id, requestedIds);
  if (sources.length !== new Set(requestedIds).size)
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "One or more selected source items are unavailable.",
      },
    };
  const projectModule = await prisma.projectModule.upsert({
    where: { projectId_module: { projectId: project.id, module: "CALENDAR" } },
    create: {
      projectId: project.id,
      module: "CALENDAR",
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

export async function queueCalendarGeneration(input: {
  userId: string;
  projectId: string;
}): Promise<Result<{ jobId: string }, CalendarError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  const projectModule = await prisma.projectModule.findFirst({
    where: {
      projectId: input.projectId,
      module: "CALENDAR",
      project: { userId: input.userId },
    },
  });
  const settings = projectModule
    ? CalendarGenerationRequestSchema.safeParse(projectModule.settings)
    : null;
  if (
    !project?.brief ||
    !project.currentBrandProfileVersionId ||
    !projectModule ||
    !settings?.success
  )
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Configure Calendar first." },
    };
  let ids: string[] = [...(settings.data.sourceSelection.contentItemIds ?? [])];
  if (
    settings.data.sourceSelection.includeUnscheduledExistingContent &&
    !ids.length
  ) {
    const eligible = await prisma.contentItem.findMany({
      where: {
        projectId: project.id,
        module: { in: settings.data.modules },
        currentVersionId: { not: null },
      },
      select: { id: true },
      take: 200,
      orderBy: { updatedAt: "desc" },
    });
    ids = eligible.map(({ id }) => id);
  }
  const sources = await ownedSources(input.userId, project.id, ids);
  if (sources.length !== new Set(ids).size)
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Selected source content changed. Review Calendar setup.",
      },
    };
  const capturedSources = sources.map((item) => ({
    contentItemId: item.id,
    contentItemVersionId: item.currentVersion!.id,
    sourceTitleSnapshot: item.title,
    sourceType: item.type,
    sourceModule: item.module,
    sourceMock: item.currentVersion!.mock,
    sourceBrandProfileVersionId: item.sourceBrandProfileVersionId,
  }));
  const batchKey = digest({
    settings: settings.data,
    sources: capturedSources.map((source) => [
      source.contentItemId,
      source.contentItemVersionId,
    ]),
  });
  const idempotencyKey = `calendar:${project.currentBrandProfileVersionId}:${project.brief.revision}:${batchKey}`;
  const job = await prisma.generationJob.upsert({
    where: {
      projectId_idempotencyKey: { projectId: project.id, idempotencyKey },
    },
    update: {},
    create: {
      projectId: project.id,
      scopeType: "MODULE",
      scopeId: projectModule.id,
      module: "CALENDAR",
      status: "QUEUED",
      ...getNewJobGenerationConfiguration({
        promptKey: `calendar.${settings.data.calendarType.toLocaleLowerCase()}.generation`,
        briefRevision: project.brief.revision,
      }),
      idempotencyKey,
      request: {
        kind: "CALENDAR_MODULE",
        batchKey,
        briefRevision: project.brief.revision,
        brandProfileVersionId: project.currentBrandProfileVersionId,
        settings: settings.data,
        sources: capturedSources,
      } as Prisma.InputJsonValue,
      steps: {
        create: jobSteps.map(([key, label], ordinal) => ({
          key,
          label,
          ordinal,
        })),
      },
    },
  });
  await prisma.projectModule.update({
    where: { id: projectModule.id },
    data: { status: "GENERATING" },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function queueCalendarRegeneration(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: CalendarRegenerationTarget;
}): Promise<Result<{ jobId: string }, CalendarError>> {
  const target = input.target
    ? CalendarRegenerationTargetSchema.safeParse(input.target)
    : null;
  if (target && !target.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Invalid Calendar target." },
    };
  const prisma = getPrisma();
  const item = await prisma.contentItem.findFirst({
    where: {
      id: input.itemId,
      module: "CALENDAR",
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
        message: "Reload the latest Calendar before regenerating.",
      },
    };
  const snapshot = CalendarSnapshotSchema.safeParse(
    item.currentVersion.snapshot,
  );
  if (!snapshot.success)
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Calendar content is invalid." },
    };
  if (
    target?.success &&
    snapshot.data.contentType !== "EDITORIAL_CALENDAR" &&
    ["ENTRY", "WEEK", "MONTH", "FIELD"].includes(target.data.kind)
  )
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "This target is not available for this Calendar type.",
      },
    };
  const kind = target?.success
    ? `CALENDAR_${target.data.kind}_REGENERATE`
    : "CALENDAR_ITEM_REGENERATE";
  const idempotencyKey = `${kind}:${item.id}:${item.currentVersionId}:${JSON.stringify(target?.success ? target.data : "item")}:${item.project.currentBrandProfileVersionId}`;
  const job = await prisma.generationJob.upsert({
    where: {
      projectId_idempotencyKey: { projectId: item.projectId, idempotencyKey },
    },
    update: {},
    create: {
      ...getNewJobGenerationConfiguration({
        promptKey: `calendar.${snapshot.data.contentType.toLocaleLowerCase()}.generation`,
        purpose:
          target?.success && target.data.kind === "ENTRY"
            ? "CALENDAR_ENTRY_REGENERATION"
            : target?.success &&
                ["WEEK", "MONTH", "CAMPAIGN"].includes(target.data.kind)
              ? "CALENDAR_PERIOD_REGENERATION"
              : "WHOLE_ITEM_REGENERATION",
      }),
      projectId: item.projectId,
      scopeType: "CONTENT_ITEM",
      scopeId: item.id,
      module: "CALENDAR",
      status: "QUEUED",
      idempotencyKey,
      request: {
        kind,
        itemId: item.id,
        contentType: item.type,
        expectedCurrentVersionId: item.currentVersionId,
        brandProfileVersionId: item.project.currentBrandProfileVersionId,
        currentSnapshot: snapshot.data,
        ...(target?.success ? { target: target.data } : {}),
      } as Prisma.InputJsonValue,
      steps: {
        create: jobSteps.map(([key, label], ordinal) => ({
          key,
          label,
          ordinal,
        })),
      },
    },
  });
  return { ok: true, value: { jobId: job.id } };
}

export async function retryCalendarScope(input: {
  userId: string;
  jobId: string;
}): Promise<Result<{ jobId: string }, CalendarError>> {
  const prisma = getPrisma();
  const job = await prisma.generationJob.findFirst({
    where: {
      id: input.jobId,
      module: "CALENDAR",
      status: "FAILED",
      parentJobId: { not: null },
      project: { userId: input.userId },
    },
  });
  if (!job || job.attempt >= job.maxAttempts)
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This period cannot be retried." },
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
      where: { projectId: job.projectId, module: "CALENDAR" },
      data: { status: "GENERATING" },
    }),
  ]);
  return { ok: true, value: { jobId: job.id } };
}

export async function saveCalendarVersion(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  snapshot: unknown;
}) {
  const parsed = CalendarSnapshotSchema.safeParse(input.snapshot);
  if (!parsed.success)
    return {
      ok: false as const,
      error: {
        code: "VALIDATION" as const,
        message: parsed.error.issues[0]?.message ?? "Check Calendar fields.",
      },
    };
  const item = await getPrisma().contentItem.findFirst({
    where: {
      id: input.itemId,
      module: "CALENDAR",
      project: { userId: input.userId },
    },
    select: { projectId: true },
  });
  if (!item)
    return {
      ok: false as const,
      error: {
        code: "NOT_FOUND" as const,
        message: "Calendar is not available.",
      },
    };
  const refs: Array<readonly [string, string]> =
    parsed.data.contentType === "EDITORIAL_CALENDAR" ||
    parsed.data.contentType === "CONTENT_SCHEDULE"
      ? parsed.data.entries.flatMap((entry) =>
          entry.source.type === "CONTENT_ITEM"
            ? [[entry.source.contentItemId, entry.source.contentItemVersionId]]
            : [],
        )
      : (parsed.data.channelPlan.flatMap((plan) =>
          plan.plannedContent.flatMap((entry) =>
            entry.source.type === "CONTENT_ITEM"
              ? [
                  [
                    entry.source.contentItemId,
                    entry.source.contentItemVersionId,
                  ],
                ]
              : [],
          ),
        ) as Array<readonly [string, string]>);
  const valid = refs.length
    ? await getPrisma().contentItemVersion.count({
        where: {
          OR: refs.map(([contentItemId, id]) => ({
            id,
            contentItemId,
            contentItem: { projectId: item.projectId },
          })),
        },
      })
    : 0;
  if (valid !== new Set(refs.map((pair) => pair.join(":"))).size)
    return {
      ok: false as const,
      error: {
        code: "VALIDATION" as const,
        message: "One or more linked sources are unavailable.",
      },
    };
  return saveManualContentVersion({
    userId: input.userId,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    snapshot: parsed.data,
  });
}
