import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import {
  CalendarGenerationRequestSchema,
  CalendarEntrySchema,
  CalendarRegenerationTargetSchema,
  CalendarSnapshotSchema,
  EditorialCalendarSnapshotSchema,
  type CalendarEntry,
  type CalendarGenerationRequest,
  type CalendarSnapshot,
} from "@/domain/calendar/calendar-schemas";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import { generateProductionSnapshot } from "@/server/ai/generation-executor";

type Job = {
  id: string;
  projectId: string;
  request: unknown;
  leaseToken: string | null;
};
type CapturedSource = {
  contentItemId: string;
  contentItemVersionId: string;
  sourceTitleSnapshot: string;
  sourceType: string;
  sourceModule: "WEBSITE" | "SOCIAL" | "ADS" | "VIDEO" | "COPY";
  sourceMock: boolean;
  sourceBrandProfileVersionId: string;
};
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const diffDays = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  );
const provenance = (jobId: string, brandProfileVersionId: string) =>
  ContentProvenanceSchema.parse({
    provider: "mock",
    model: "mock-calendar-v1",
    promptVersion: "calendar-1.0",
    schemaVersion: "1.0",
    requestId: jobId,
    generationJobId: jobId,
    brandProfileVersionId,
    generatedAt: new Date(0).toISOString(),
    mock: true,
  });
const stepState = async (
  prisma: PrismaClient,
  jobId: string,
  key: string,
  status: "RUNNING" | "COMPLETED" | "FAILED",
  code?: string,
) =>
  prisma.generationJobStep.updateMany({
    where: { jobId, key },
    data: {
      status,
      ...(status === "RUNNING" ? { startedAt: new Date() } : {}),
      ...(status !== "RUNNING" ? { completedAt: new Date() } : {}),
      ...(code ? { safeErrorCode: code } : {}),
    },
  });

function sourceFor(
  source: CapturedSource | undefined,
): CalendarEntry["source"] {
  return CalendarEntrySchema.shape.source.parse(
    source
      ? { type: "CONTENT_ITEM", ...source }
      : { type: "PLANNED_PLACEHOLDER" },
  );
}

function planWeek(input: {
  weekIndex: number;
  startDate: string;
  endDate: string;
  settings: CalendarGenerationRequest;
  sources: CapturedSource[];
}): CalendarEntry[] {
  const { settings } = input;
  const excluded = new Set(settings.constraints?.excludedDates ?? []);
  const days = Math.max(1, diffDays(input.startDate, input.endDate) + 1);
  const entries: CalendarEntry[] = [];
  for (let index = 0; index < settings.cadence.weeklyTarget; index += 1) {
    let offset = Math.floor((index * days) / settings.cadence.weeklyTarget);
    let scheduledDate = addDays(input.startDate, offset);
    while (excluded.has(scheduledDate) && offset < days - 1) {
      offset += 1;
      scheduledDate = addDays(input.startDate, offset);
    }
    const source =
      settings.sourceSelection.strategy === "PLAN_NEW_CONTENT"
        ? undefined
        : input.sources[
            (input.weekIndex * settings.cadence.weeklyTarget + index) %
              Math.max(input.sources.length, 1)
          ];
    const useSource =
      settings.sourceSelection.strategy === "USE_EXISTING_CONTENT" ||
      (settings.sourceSelection.strategy === "MIX_EXISTING_AND_NEW" &&
        index % 2 === 0);
    const selected = useSource ? source : undefined;
    const contentModule =
      selected?.sourceModule ??
      settings.modules[
        (input.weekIndex * settings.cadence.weeklyTarget + index) %
          settings.modules.length
      ]!;
    const channel =
      settings.channels[
        (input.weekIndex * settings.cadence.weeklyTarget + index) %
          settings.channels.length
      ]!;
    const campaign =
      settings.campaigns?.[
        (input.weekIndex + index) % Math.max(settings.campaigns.length, 1)
      ];
    entries.push({
      id: `entry-${input.weekIndex + 1}-${index + 1}`,
      ordinal: input.weekIndex * settings.cadence.weeklyTarget + index + 1,
      scheduledDate,
      ...(settings.cadence.preferredTimeSlots?.length
        ? { scheduledTime: index % 2 === 0 ? "09:00" : "14:00" }
        : {}),
      timezone: settings.planningPeriod.timezone,
      module: contentModule,
      channel,
      objective:
        settings.objectives[
          (input.weekIndex + index) % settings.objectives.length
        ]!,
      status: "PLANNED",
      title: selected
        ? selected.sourceTitleSnapshot
        : `${contentModule.replaceAll("_", " ")} plan for ${scheduledDate}`,
      summary: selected
        ? "Plan the linked content in the selected editorial context."
        : "Planned placeholder. Create or link content before external use.",
      ...(campaign
        ? { campaignId: campaign.id, campaignName: campaign.name }
        : {}),
      source: sourceFor(selected),
      publishingNotes:
        "Planning only — Web Content Flow did not publish or externally schedule this entry.",
    });
  }
  return entries;
}

function assembleSnapshot(input: {
  settings: CalendarGenerationRequest;
  entries: CalendarEntry[];
  jobId: string;
  brandProfileVersionId: string;
  brand: ReturnType<typeof BrandProfileSchema.parse>;
}): CalendarSnapshot {
  const { settings } = input;
  const commonProvenance = provenance(input.jobId, input.brandProfileVersionId);
  if (settings.calendarType === "CAMPAIGN_PLAN") {
    const campaign = settings.campaigns?.[0] ?? {
      id: "campaign-main",
      name: "Primary editorial campaign",
      priority: "MEDIUM" as const,
      startDate: settings.planningPeriod.startDate,
      endDate: settings.planningPeriod.endDate,
    };
    return CalendarSnapshotSchema.parse({
      schemaVersion: "1.0",
      contentType: "CAMPAIGN_PLAN",
      title: `${campaign.name} campaign plan`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        priority: campaign.priority,
        startDate: campaign.startDate ?? settings.planningPeriod.startDate,
        endDate: campaign.endDate ?? settings.planningPeriod.endDate,
        objective: settings.objectives[0],
        audience: input.brand.targetAudienceSummary,
        keyMessage: input.brand.keyMarketingMessages[0],
        desiredAction: input.brand.primaryCallsToAction[0],
      },
      channelPlan: settings.channels
        .map((channel, index) => ({
          id: `channel-${index + 1}`,
          ordinal: index + 1,
          channel,
          module: settings.modules[index % settings.modules.length],
          roleInCampaign: `Support ${settings.objectives[0]!.toLocaleLowerCase().replaceAll("_", " ")} across this editorial channel.`,
          plannedContent: input.entries
            .filter((entry) => entry.channel === channel)
            .map((entry, contentIndex) => ({
              id: `planned-${index + 1}-${contentIndex + 1}`,
              ordinal: contentIndex + 1,
              title: entry.title,
              scheduledDate: entry.scheduledDate,
              source: entry.source,
              notes: entry.publishingNotes,
            })),
        }))
        .filter((plan) => plan.plannedContent.length),
      risksOrDependencies: [
        "Review source readiness before manually publishing or scheduling.",
      ],
      provenance: commonProvenance,
    });
  }
  if (settings.calendarType === "CONTENT_SCHEDULE")
    return CalendarSnapshotSchema.parse({
      schemaVersion: "1.0",
      contentType: "CONTENT_SCHEDULE",
      title: `Content schedule · ${settings.planningPeriod.startDate}`,
      planningPeriod: settings.planningPeriod,
      scope: { modules: settings.modules, channels: settings.channels },
      entries: input.entries,
      notes: "Editorial planning only; completion is recorded manually.",
      provenance: commonProvenance,
    });
  return EditorialCalendarSnapshotSchema.parse({
    schemaVersion: "1.0",
    contentType: "EDITORIAL_CALENDAR",
    title: `Editorial calendar · ${settings.planningPeriod.startDate} to ${settings.planningPeriod.endDate}`,
    planningPeriod: settings.planningPeriod,
    strategySummary: `${input.brand.positioning} The plan distributes ${settings.cadence.weeklyTarget} editorial entries per week across the selected channels.`,
    entries: input.entries,
    ...(settings.campaigns?.length
      ? {
          campaigns: settings.campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            priority: campaign.priority,
            ...(campaign.startDate ? { startDate: campaign.startDate } : {}),
            ...(campaign.endDate ? { endDate: campaign.endDate } : {}),
            objective: settings.objectives[0],
            ...(campaign.notes ? { notes: campaign.notes } : {}),
          })),
        }
      : {}),
    recommendations: [
      "Review linked content before manually publishing or scheduling.",
      "Use placeholders to identify production work without generating it automatically.",
    ],
    risksOrGaps: input.entries.some(
      ({ source }) => source.type === "PLANNED_PLACEHOLDER",
    )
      ? ["One or more entries still need content."]
      : [],
    provenance: commonProvenance,
  });
}

async function persistAggregate(
  prisma: PrismaClient,
  parentId: string,
  projectId: string,
) {
  const parent = await prisma.generationJob.findUniqueOrThrow({
    where: { id: parentId },
    include: { childJobs: { orderBy: { createdAt: "asc" } } },
  });
  if (
    !parent.childJobs.length ||
    parent.childJobs.some((child) =>
      ["QUEUED", "RUNNING", "VALIDATING", "SAVING"].includes(child.status),
    )
  )
    return;
  const request = parent.request as {
    batchKey: string;
    brandProfileVersionId: string;
    settings: unknown;
  };
  const settings = CalendarGenerationRequestSchema.parse(request.settings);
  const entries = parent.childJobs.flatMap((child) => {
    if (child.status !== "COMPLETED") return [];
    const details = child.safeErrorDetails as { entries?: unknown } | null;
    const parsed = EditorialCalendarSnapshotSchema.shape.entries.safeParse(
      details?.entries,
    );
    return parsed.success ? parsed.data : [];
  });
  const failed = parent.childJobs.filter(
    ({ status }) => status === "FAILED",
  ).length;
  if (!entries.length) {
    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: parent.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          safeErrorCode: "CALENDAR_GENERATION_FAILED",
        },
      }),
      prisma.projectModule.updateMany({
        where: { projectId, module: "CALENDAR" },
        data: { status: "FAILED" },
      }),
    ]);
    return;
  }
  const brandVersion = await prisma.brandProfileVersion.findFirstOrThrow({
    where: {
      id: request.brandProfileVersionId,
      brandProfile: { projectId },
    },
  });
  let snapshot = assembleSnapshot({
    settings,
    entries: entries
      .sort(
        (a, b) =>
          a.scheduledDate.localeCompare(b.scheduledDate) ||
          a.ordinal - b.ordinal,
      )
      .map((entry, index) => ({ ...entry, ordinal: index + 1 })),
    jobId: parent.id,
    brandProfileVersionId: request.brandProfileVersionId,
    brand: BrandProfileSchema.parse(brandVersion.snapshot),
  });
  if (parent.mode === "REAL") {
    const usage = await prisma.generationUsage.findMany({
      where: { generationJob: { parentJobId: parent.id } },
      select: { id: true, modelId: true, modelTier: true },
    });
    const base = snapshot.provenance;
    snapshot = CalendarSnapshotSchema.parse({
      ...snapshot,
      provenance: {
        ...base,
        provider: "openai",
        model: usage[0]?.modelId ?? parent.modelId ?? "configured-model",
        mock: false,
        generationMode: "REAL",
        providerName: "OPENAI",
        modelTier: usage[0]?.modelTier ?? parent.modelTier,
        promptKey: `calendar.${settings.calendarType.toLocaleLowerCase()}.generation`,
        generationPurpose: "MODULE_GENERATION",
        repairAttempted: parent.repairAttempted,
        usageRecordIds: usage.map(({ id }) => id),
      },
    });
  }
  const identityKey = `${settings.calendarType.toLocaleLowerCase()}-${settings.planningPeriod.startDate}-${settings.planningPeriod.endDate}-${request.batchKey}`;
  const existing = await prisma.contentItem.findUnique({
    where: {
      projectId_module_identityKey: {
        projectId,
        module: "CALENDAR",
        identityKey,
      },
    },
    include: { currentVersion: true, versions: true },
  });
  if (!existing) {
    await prisma.$transaction(async (tx) => {
      const item = await tx.contentItem.create({
        data: {
          projectId,
          module: "CALENDAR",
          type: settings.calendarType,
          identityKey,
          title: snapshot.title,
          status: "DRAFT",
          sourceJobId: parent.id,
          sourceBrandProfileVersionId: request.brandProfileVersionId,
        },
      });
      const version = await tx.contentItemVersion.create({
        data: {
          contentItemId: item.id,
          versionNumber: 1,
          schemaVersion: "1.0",
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          source: "GENERATED",
          sourceJobId: parent.id,
          brandProfileVersionId: request.brandProfileVersionId,
          mock: snapshot.provenance.mock,
          provenance: snapshot.provenance as Prisma.InputJsonValue,
        },
      });
      await tx.contentItem.update({
        where: { id: item.id },
        data: { currentVersionId: version.id },
      });
    });
  } else {
    const current = CalendarSnapshotSchema.safeParse(
      existing.currentVersion?.snapshot,
    );
    const currentCount = !current.success
      ? 0
      : current.data.contentType === "CAMPAIGN_PLAN"
        ? current.data.channelPlan.reduce(
            (sum, plan) => sum + plan.plannedContent.length,
            0,
          )
        : current.data.entries.length;
    if (entries.length > currentCount) {
      await prisma.$transaction(async (tx) => {
        const version = await tx.contentItemVersion.create({
          data: {
            contentItemId: existing.id,
            versionNumber:
              Math.max(
                0,
                ...existing.versions.map((value) => value.versionNumber),
              ) + 1,
            schemaVersion: "1.0",
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            source: "REGENERATED",
            brandProfileVersionId: request.brandProfileVersionId,
            mock: snapshot.provenance.mock,
            provenance: snapshot.provenance as Prisma.InputJsonValue,
          },
        });
        await tx.contentItem.update({
          where: { id: existing.id },
          data: {
            currentVersionId: version.id,
            sourceBrandProfileVersionId: request.brandProfileVersionId,
          },
        });
      });
    }
  }
  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: parent.id },
      data: {
        status: failed ? "PARTIAL" : "COMPLETED",
        completedAt: new Date(),
        safeErrorCode: failed ? "CALENDAR_PARTIAL" : null,
      },
    }),
    prisma.generationJobStep.updateMany({
      where: { jobId: parent.id, status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
    prisma.projectModule.updateMany({
      where: { projectId, module: "CALENDAR" },
      data: { status: failed ? "PARTIAL" : "COMPLETE" },
    }),
  ]);
}

async function fail(
  prisma: PrismaClient,
  job: Job,
  code: string,
  parentJobId?: string | null,
) {
  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
      safeErrorCode: code,
      safeErrorDetails: { currentCalendarUnchanged: true },
    },
  });
  if (parentJobId) await persistAggregate(prisma, parentJobId, job.projectId);
}

async function regenerate(prisma: PrismaClient, job: Job) {
  const request = job.request as {
    itemId: string;
    expectedCurrentVersionId: string;
    brandProfileVersionId: string;
    currentSnapshot: unknown;
    target?: unknown;
  };
  const current = CalendarSnapshotSchema.safeParse(request.currentSnapshot);
  if (!current.success) return fail(prisma, job, "INVALID_CURRENT_CALENDAR");
  const item = await prisma.contentItem.findFirst({
    where: {
      id: request.itemId,
      projectId: job.projectId,
      module: "CALENDAR",
      currentVersionId: request.expectedCurrentVersionId,
    },
  });
  if (!item) return fail(prisma, job, "VERSION_CONFLICT");
  let next: CalendarSnapshot = structuredClone(current.data);
  const target = request.target
    ? CalendarRegenerationTargetSchema.safeParse(request.target)
    : null;
  const targetData = target?.success ? target.data : undefined;
  if (current.data.contentType === "EDITORIAL_CALENDAR") {
    let editorial = structuredClone(current.data);
    const refreshed = editorial.entries.map((entry) => ({
      ...entry,
      publishingNotes:
        "Regenerated editorial guidance. Planning only; no external scheduling occurred.",
    }));
    if (targetData?.kind === "ENTRY")
      editorial = {
        ...editorial,
        entries: refreshed.map((entry) =>
          entry.id === targetData.entryId
            ? { ...entry, summary: "Refreshed plan for this entry." }
            : editorial.entries.find(({ id }) => id === entry.id)!,
        ),
      };
    else if (targetData?.kind === "WEEK") {
      const weekStartDate = targetData.weekStartDate;
      const end = addDays(weekStartDate, 6);
      editorial = {
        ...editorial,
        entries: refreshed.map((entry) =>
          entry.scheduledDate >= weekStartDate && entry.scheduledDate <= end
            ? entry
            : editorial.entries.find(({ id }) => id === entry.id)!,
        ),
      };
    } else if (targetData?.kind === "MONTH") {
      const prefix = `${targetData.year}-${String(targetData.month).padStart(2, "0")}`;
      editorial = {
        ...editorial,
        entries: refreshed.map((entry) =>
          entry.scheduledDate.startsWith(prefix)
            ? entry
            : editorial.entries.find(({ id }) => id === entry.id)!,
        ),
      };
    } else if (targetData?.kind === "FIELD") {
      if (targetData.field === "STRATEGY_SUMMARY")
        editorial = {
          ...editorial,
          strategySummary: `${editorial.strategySummary} Reviewed.`,
        };
      else if (targetData.field === "RECOMMENDATIONS")
        editorial = {
          ...editorial,
          recommendations: [
            "Review readiness and channel fit before external use.",
          ],
        };
      else if (targetData.field === "RISKS_OR_GAPS")
        editorial = {
          ...editorial,
          risksOrGaps: ["Confirm every placeholder has an owner and source."],
        };
      else if (targetData.entryId) {
        const entryId = targetData.entryId;
        const field = targetData.field;
        editorial = {
          ...editorial,
          entries: editorial.entries.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  ...(field === "ENTRY_TITLE"
                    ? { title: `${entry.title} · revised` }
                    : {}),
                  ...(field === "ENTRY_SUMMARY"
                    ? { summary: "Refreshed editorial summary." }
                    : {}),
                  ...(field === "ENTRY_OBJECTIVE"
                    ? { objective: "ENGAGEMENT" as const }
                    : {}),
                  ...(field === "ENTRY_NOTES"
                    ? { productionNotes: "Review production readiness." }
                    : {}),
                  ...(field === "ENTRY_DATE_SUGGESTION"
                    ? {
                        scheduledDate:
                          addDays(entry.scheduledDate, 1) <=
                          editorial.planningPeriod.endDate
                            ? addDays(entry.scheduledDate, 1)
                            : entry.scheduledDate,
                      }
                    : {}),
                }
              : entry,
          ),
        };
      }
    } else {
      editorial = {
        ...editorial,
        strategySummary: `${editorial.strategySummary} Regenerated against the current Brand Profile.`,
        entries: refreshed,
      };
    }
    next = editorial;
  }
  const parsed = CalendarSnapshotSchema.safeParse({
    ...next,
    provenance: provenance(job.id, request.brandProfileVersionId),
  });
  if (!parsed.success) return fail(prisma, job, "INVALID_OUTPUT");
  const { createContentVersion } =
    await import("@/server/services/content-version-service");
  const result = await createContentVersion(prisma, {
    itemId: item.id,
    expectedCurrentVersionId: request.expectedCurrentVersionId,
    snapshot: parsed.data,
    source: "REGENERATED",
    sourceJobId: job.id,
    brandProfileVersionId: request.brandProfileVersionId,
    mock: true,
    provenance: parsed.data.provenance,
  });
  if (!result.ok) return fail(prisma, job, result.error.code);
  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });
}

export async function handleCalendarJob(prisma: PrismaClient, job: Job) {
  const stored = await prisma.generationJob.findUniqueOrThrow({
    where: { id: job.id },
    select: { parentJobId: true, mode: true, briefRevision: true },
  });
  const raw = job.request as { kind?: string };
  if (raw.kind === "CALENDAR_MODULE") {
    const request = job.request as {
      batchKey: string;
      brandProfileVersionId: string;
      settings: unknown;
      sources: CapturedSource[];
    };
    const settings = CalendarGenerationRequestSchema.parse(request.settings);
    const weeks = Math.ceil(
      (diffDays(
        settings.planningPeriod.startDate,
        settings.planningPeriod.endDate,
      ) +
        1) /
        7,
    );
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < weeks; index += 1) {
        const startDate = addDays(settings.planningPeriod.startDate, index * 7);
        const endDate =
          addDays(startDate, 6) > settings.planningPeriod.endDate
            ? settings.planningPeriod.endDate
            : addDays(startDate, 6);
        const scenario =
          settings.mockScenario === "one-week-failure" && index === weeks - 1
            ? "fail"
            : settings.mockScenario;
        await tx.generationJob.upsert({
          where: {
            projectId_idempotencyKey: {
              projectId: job.projectId,
              idempotencyKey: `${job.id}:week:${startDate}`,
            },
          },
          update: {},
          create: {
            projectId: job.projectId,
            parentJobId: job.id,
            scopeType: "CONTENT_SECTION",
            scopeId: startDate,
            module: "CALENDAR",
            mode: stored.mode,
            provider: stored.mode === "REAL" ? "OPENAI" : "MOCK",
            briefRevision: stored.briefRevision,
            promptKey: "calendar.editorial_calendar.generation",
            promptVersion: "1.0.0",
            generationPurpose: "CALENDAR_PERIOD_REGENERATION",
            status: "QUEUED",
            idempotencyKey: `${job.id}:week:${startDate}`,
            request: {
              kind: "CALENDAR_WEEK",
              weekIndex: index,
              startDate,
              endDate,
              settings,
              sources: request.sources,
              brandProfileVersionId: request.brandProfileVersionId,
              scenario,
            } as Prisma.InputJsonValue,
            steps: {
              create: [
                { key: "prepare", label: "Preparing period", ordinal: 0 },
                { key: "plan", label: "Planning cadence", ordinal: 1 },
                { key: "validate", label: "Validating entries", ordinal: 2 },
              ],
            },
          },
        });
      }
      await tx.generationJob.update({
        where: { id: job.id },
        data: {
          status: "RUNNING",
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
      await tx.generationJobStep.updateMany({
        where: { jobId: job.id, key: { in: ["prepare", "source", "plan"] } },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    });
    return;
  }
  if (raw.kind === "CALENDAR_WEEK") {
    const request = job.request as {
      weekIndex: number;
      startDate: string;
      endDate: string;
      settings: unknown;
      sources: CapturedSource[];
      scenario: string;
    };
    if (
      request.scenario === "fail" ||
      request.scenario === "timeout-final-week" ||
      request.scenario === "invalid-entry-date" ||
      request.scenario === "duplicate-entry-id" ||
      request.scenario === "missing-source-item" ||
      request.scenario === "campaign-range-conflict" ||
      request.scenario === "cadence-constraint-conflict"
    )
      return fail(prisma, job, "PERIOD_GENERATION_FAILED", stored.parentJobId);
    await stepState(prisma, job.id, "prepare", "COMPLETED");
    let entries = planWeek({
      weekIndex: request.weekIndex,
      startDate: request.startDate,
      endDate: request.endDate,
      settings: CalendarGenerationRequestSchema.parse(request.settings),
      sources: request.sources,
    });
    entries = (
      await generateProductionSnapshot(prisma, {
        jobId: job.id,
        candidate: entries,
        schema: EditorialCalendarSnapshotSchema.shape.entries,
        context: {
          planningPeriod: {
            startDate: request.startDate,
            endDate: request.endDate,
          },
          settings: request.settings,
          sourceVersions: request.sources,
        },
        promptKey: "calendar.editorial_calendar.generation",
        promptVersion: "1.0.0",
        purpose: "CALENDAR_PERIOD_REGENERATION",
      })
    ).snapshot;
    const validated =
      EditorialCalendarSnapshotSchema.shape.entries.safeParse(entries);
    if (!validated.success)
      return fail(prisma, job, "INVALID_OUTPUT", stored.parentJobId);
    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          leaseToken: null,
          leaseExpiresAt: null,
          safeErrorDetails: {
            entries: validated.data,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.generationJobStep.updateMany({
        where: { jobId: job.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
    ]);
    if (stored.parentJobId)
      await persistAggregate(prisma, stored.parentJobId, job.projectId);
    return;
  }
  await regenerate(prisma, job);
}
