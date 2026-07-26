import { z } from "zod";

import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import {
  ContentItemIdSchema,
  ContentItemVersionIdSchema,
} from "@/domain/shared/schemas";

const plain = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/<[a-z][\s\S]*>/i.test(value), "HTML is not allowed.");
const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const stableId = z.string().regex(/^[a-z0-9-]{3,80}$/);
const unique = (values: readonly string[], context: z.RefinementCtx) => {
  if (new Set(values).size !== values.length)
    context.addIssue({ code: "custom", message: "Values must be unique." });
};
const daysBetween = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  ) + 1;
const validTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};
export const CalendarTimezoneSchema = plain(1, 80).refine(
  validTimezone,
  "Choose a valid IANA timezone.",
);
export const CalendarContentTypeSchema = z.enum([
  "EDITORIAL_CALENDAR",
  "CAMPAIGN_PLAN",
  "CONTENT_SCHEDULE",
]);
export const CalendarSourceModuleSchema = z.enum([
  "WEBSITE",
  "SOCIAL",
  "ADS",
  "VIDEO",
  "COPY",
]);
export const CalendarChannelSchema = z.enum([
  "WEBSITE",
  "BLOG",
  "EMAIL",
  "NEWSLETTER",
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "X",
  "TIKTOK",
  "YOUTUBE",
  "GOOGLE_ADS",
  "META_ADS",
  "LINKEDIN_ADS",
  "INTERNAL",
  "OTHER",
]);
export const CalendarObjectiveSchema = z.enum([
  "AWARENESS",
  "EDUCATION",
  "ENGAGEMENT",
  "LEAD_GENERATION",
  "CONVERSIONS",
  "SALES",
  "PRODUCT_LAUNCH",
  "COMMUNITY",
  "RETENTION",
  "TRUST_BUILDING",
]);
export const CalendarEntryStatusSchema = z.enum([
  "PLANNED",
  "DRAFT_READY",
  "NEEDS_REVIEW",
  "APPROVED_INTERNALLY",
  "BLOCKED",
  "COMPLETED_EXTERNALLY",
  "CANCELLED",
]);
export const CalendarSourceStrategySchema = z.enum([
  "USE_EXISTING_CONTENT",
  "PLAN_NEW_CONTENT",
  "MIX_EXISTING_AND_NEW",
]);
export const CampaignPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const WeekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);
export const CalendarTimeSlotSchema = z.enum([
  "MORNING",
  "MIDDAY",
  "AFTERNOON",
  "EVENING",
]);
export const CalendarViewSchema = z.enum(["MONTH", "WEEK", "LIST"]);
export const CalendarMockScenarioSchema = z.enum([
  "success",
  "one-week-failure",
  "invalid-entry-date",
  "duplicate-entry-id",
  "missing-source-item",
  "campaign-range-conflict",
  "cadence-constraint-conflict",
  "timeout-final-week",
]);

const period = z
  .object({
    startDate: date,
    endDate: date,
    timezone: CalendarTimezoneSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const duration = daysBetween(value.startDate, value.endDate);
    if (duration < 7 || duration > 366)
      context.addIssue({
        code: "custom",
        message: "Planning period must be between 7 and 366 days.",
      });
  });
const campaignRequest = z
  .object({
    id: stableId,
    name: plain(2, 100),
    priority: CampaignPrioritySchema,
    startDate: date.optional(),
    endDate: date.optional(),
    modules: z.array(CalendarSourceModuleSchema).max(5).optional(),
    channels: z.array(CalendarChannelSchema).max(15).optional(),
    notes: plain(1, 1000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate)
      context.addIssue({
        code: "custom",
        message: "Campaign range is invalid.",
      });
    if (value.modules) unique(value.modules, context);
    if (value.channels) unique(value.channels, context);
  });
const blackout = z
  .object({
    startDate: date,
    endDate: date,
    reason: plain(1, 300).optional(),
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, {
    message: "Blackout range is invalid.",
  });

export const CalendarGenerationRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    calendarType: CalendarContentTypeSchema,
    planningPeriod: period,
    modules: z.array(CalendarSourceModuleSchema).min(1).max(5),
    channels: z.array(CalendarChannelSchema).min(1).max(15),
    cadence: z
      .object({
        weeklyTarget: z.number().int().min(1).max(50),
        preferredWeekdays: z.array(WeekdaySchema).max(7).optional(),
        preferredTimeSlots: z.array(CalendarTimeSlotSchema).max(4).optional(),
        minimumGapHours: z.number().int().min(0).max(168).optional(),
      })
      .strict(),
    objectives: z.array(CalendarObjectiveSchema).min(1).max(10),
    campaigns: z.array(campaignRequest).max(20).optional(),
    sourceSelection: z
      .object({
        strategy: CalendarSourceStrategySchema,
        contentItemIds: z.array(ContentItemIdSchema).max(200).optional(),
        includeUnscheduledExistingContent: z.boolean(),
        allowPlannedPlaceholders: z.boolean(),
      })
      .strict(),
    reuseRules: z
      .object({
        allowCrossChannelReuse: z.boolean(),
        maximumUsesPerSourceItem: z.number().int().min(1).max(20).optional(),
        minimumDaysBetweenReuse: z.number().int().min(0).max(366).optional(),
      })
      .strict()
      .optional(),
    constraints: z
      .object({
        excludedDates: z.array(date).max(366).optional(),
        excludedWeekdays: z.array(WeekdaySchema).max(7).optional(),
        blackoutPeriods: z.array(blackout).max(50).optional(),
      })
      .strict()
      .optional(),
    outputLanguage: plain(2, 80),
    notes: plain(1, 1500).optional(),
    mockScenario: CalendarMockScenarioSchema.default("success"),
  })
  .strict()
  .superRefine((value, context) => {
    unique(value.modules, context);
    unique(value.channels, context);
    unique(value.objectives, context);
    if (value.cadence.preferredWeekdays)
      unique(value.cadence.preferredWeekdays, context);
    if (value.cadence.preferredTimeSlots)
      unique(value.cadence.preferredTimeSlots, context);
    if (value.constraints?.excludedDates)
      unique(value.constraints.excludedDates, context);
    if (value.constraints?.excludedWeekdays)
      unique(value.constraints.excludedWeekdays, context);
    if (value.campaigns) {
      unique(
        value.campaigns.map(({ id }) => id),
        context,
      );
      for (const campaign of value.campaigns) {
        if (
          (campaign.startDate &&
            campaign.startDate < value.planningPeriod.startDate) ||
          (campaign.endDate && campaign.endDate > value.planningPeriod.endDate)
        )
          context.addIssue({
            code: "custom",
            message: "Campaign dates must be inside the planning period.",
          });
      }
    }
    if (
      value.sourceSelection.strategy === "USE_EXISTING_CONTENT" &&
      !value.sourceSelection.contentItemIds?.length
    )
      context.addIssue({
        code: "custom",
        message: "Select at least one existing content item.",
      });
    if (
      value.sourceSelection.strategy === "PLAN_NEW_CONTENT" &&
      !value.sourceSelection.allowPlannedPlaceholders
    )
      context.addIssue({
        code: "custom",
        message: "Planning new content requires placeholders.",
      });
  });

const source = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("CONTENT_ITEM"),
      contentItemId: ContentItemIdSchema,
      contentItemVersionId: ContentItemVersionIdSchema,
      sourceTitleSnapshot: plain(2, 200),
      sourceType: plain(2, 80),
      sourceModule: CalendarSourceModuleSchema,
      sourceMock: z.boolean(),
      sourceBrandProfileVersionId: z.string().min(8).max(128),
    })
    .strict(),
  z.object({ type: z.literal("PLANNED_PLACEHOLDER") }).strict(),
]);
export const CalendarEntrySchema = z
  .object({
    id: stableId,
    ordinal: z.number().int().min(1).max(500),
    scheduledDate: date,
    scheduledTime: time.optional(),
    timezone: CalendarTimezoneSchema,
    module: CalendarSourceModuleSchema,
    channel: CalendarChannelSchema,
    objective: CalendarObjectiveSchema,
    status: CalendarEntryStatusSchema,
    title: plain(2, 200),
    summary: plain(1, 1500).optional(),
    campaignId: stableId.optional(),
    campaignName: plain(2, 100).optional(),
    source,
    reuseOfEntryId: stableId.optional(),
    desiredAction: plain(1, 300).optional(),
    audienceNote: plain(1, 500).optional(),
    publishingNotes: plain(1, 1000).optional(),
    productionNotes: plain(1, 1000).optional(),
    internalOwnerLabel: plain(1, 100).optional(),
    tags: z.array(plain(1, 80)).max(20).optional(),
  })
  .strict();
const campaignSnapshot = z
  .object({
    id: stableId,
    name: plain(2, 100),
    priority: CampaignPrioritySchema,
    startDate: date.optional(),
    endDate: date.optional(),
    objective: CalendarObjectiveSchema.optional(),
    notes: plain(1, 1000).optional(),
  })
  .strict();

export const EditorialCalendarSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    contentType: z.literal("EDITORIAL_CALENDAR"),
    title: plain(2, 200),
    planningPeriod: period,
    strategySummary: plain(2, 3000),
    entries: z.array(CalendarEntrySchema).min(1).max(500),
    campaigns: z.array(campaignSnapshot).max(20).optional(),
    recommendations: z.array(plain(1, 500)).max(30).optional(),
    risksOrGaps: z.array(plain(1, 500)).max(30).optional(),
    notes: plain(1, 1500).optional(),
    provenance: ContentProvenanceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    unique(
      value.entries.map(({ id }) => id),
      context,
    );
    unique(
      value.entries.map(({ ordinal }) => String(ordinal)),
      context,
    );
    const ids = new Set(value.entries.map(({ id }) => id));
    const campaignIds = new Set((value.campaigns ?? []).map(({ id }) => id));
    for (const entry of value.entries) {
      if (
        entry.scheduledDate < value.planningPeriod.startDate ||
        entry.scheduledDate > value.planningPeriod.endDate
      )
        context.addIssue({
          code: "custom",
          message: "Entry dates must be inside the planning period.",
        });
      if (entry.campaignId && !campaignIds.has(entry.campaignId))
        context.addIssue({
          code: "custom",
          message: "Entry campaign reference is invalid.",
        });
      if (
        entry.reuseOfEntryId &&
        (!ids.has(entry.reuseOfEntryId) ||
          entry.reuseOfEntryId === entry.id ||
          value.entries.find(({ id }) => id === entry.reuseOfEntryId)
            ?.reuseOfEntryId === entry.id)
      )
        context.addIssue({
          code: "custom",
          message: "Entry reuse reference is invalid or circular.",
        });
    }
  });

const plannedContent = z
  .object({
    id: stableId,
    ordinal: z.number().int().min(1).max(500),
    title: plain(2, 200),
    scheduledDate: date.optional(),
    source: source,
    notes: plain(1, 1000).optional(),
  })
  .strict();
const channelPlan = z
  .object({
    id: stableId,
    ordinal: z.number().int().min(1).max(50),
    channel: CalendarChannelSchema,
    module: CalendarSourceModuleSchema,
    roleInCampaign: plain(2, 500),
    plannedContent: z.array(plannedContent).min(1).max(200),
  })
  .strict();
export const CampaignPlanSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    contentType: z.literal("CAMPAIGN_PLAN"),
    title: plain(2, 200),
    campaign: z
      .object({
        id: stableId,
        name: plain(2, 100),
        priority: CampaignPrioritySchema,
        startDate: date,
        endDate: date,
        objective: CalendarObjectiveSchema,
        audience: plain(1, 1000).optional(),
        keyMessage: plain(1, 1000).optional(),
        desiredAction: plain(1, 300).optional(),
      })
      .strict(),
    channelPlan: z.array(channelPlan).min(1).max(50),
    milestones: z
      .array(
        z
          .object({
            id: stableId,
            date,
            label: plain(2, 200),
            notes: plain(1, 500).optional(),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    risksOrDependencies: z.array(plain(1, 500)).max(30).optional(),
    notes: plain(1, 1500).optional(),
    provenance: ContentProvenanceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.campaign.startDate > value.campaign.endDate)
      context.addIssue({
        code: "custom",
        message: "Campaign range is invalid.",
      });
    unique(
      value.channelPlan.map(({ id }) => id),
      context,
    );
    unique(
      value.channelPlan.flatMap(({ plannedContent }) =>
        plannedContent.map(({ id }) => id),
      ),
      context,
    );
  });

export const ContentScheduleSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    contentType: z.literal("CONTENT_SCHEDULE"),
    title: plain(2, 200),
    planningPeriod: period,
    scope: z
      .object({
        modules: z.array(CalendarSourceModuleSchema).min(1).max(5),
        channels: z.array(CalendarChannelSchema).min(1).max(15),
      })
      .strict(),
    entries: z.array(CalendarEntrySchema).min(1).max(500),
    notes: plain(1, 1500).optional(),
    provenance: ContentProvenanceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    unique(
      value.entries.map(({ id }) => id),
      context,
    );
    for (const entry of value.entries)
      if (
        entry.scheduledDate < value.planningPeriod.startDate ||
        entry.scheduledDate > value.planningPeriod.endDate
      )
        context.addIssue({
          code: "custom",
          message: "Entry dates must be inside the planning period.",
        });
  });

export const CalendarSnapshotSchema = z.discriminatedUnion("contentType", [
  EditorialCalendarSnapshotSchema,
  CampaignPlanSnapshotSchema,
  ContentScheduleSnapshotSchema,
]);
export const CalendarRegenerationTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ENTRY"), entryId: stableId }).strict(),
  z.object({ kind: z.literal("WEEK"), weekStartDate: date }).strict(),
  z
    .object({
      kind: z.literal("MONTH"),
      year: z.number().int().min(2000).max(2200),
      month: z.number().int().min(1).max(12),
    })
    .strict(),
  z.object({ kind: z.literal("CAMPAIGN"), campaignId: stableId }).strict(),
  z
    .object({
      kind: z.literal("FIELD"),
      field: z.enum([
        "STRATEGY_SUMMARY",
        "RECOMMENDATIONS",
        "RISKS_OR_GAPS",
        "ENTRY_TITLE",
        "ENTRY_SUMMARY",
        "ENTRY_OBJECTIVE",
        "ENTRY_NOTES",
        "ENTRY_DATE_SUGGESTION",
      ]),
      entryId: stableId.optional(),
    })
    .strict(),
]);

export type CalendarContentType = z.infer<typeof CalendarContentTypeSchema>;
export type CalendarGenerationRequest = z.infer<
  typeof CalendarGenerationRequestSchema
>;
export type CalendarSnapshot = z.infer<typeof CalendarSnapshotSchema>;
export type EditorialCalendarSnapshot = z.infer<
  typeof EditorialCalendarSnapshotSchema
>;
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;
export type CalendarRegenerationTarget = z.infer<
  typeof CalendarRegenerationTargetSchema
>;
