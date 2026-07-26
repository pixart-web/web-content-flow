import { describe, expect, it } from "vitest";

import {
  formatCalendarForCopy,
  getCalendarDefinition,
} from "@/domain/content/content-registry";
import {
  CalendarContentTypeSchema,
  CalendarGenerationRequestSchema,
  CalendarSnapshotSchema,
} from "./calendar-schemas";

const request = {
  schemaVersion: "1.0",
  calendarType: "EDITORIAL_CALENDAR",
  planningPeriod: {
    startDate: "2026-08-03",
    endDate: "2026-08-30",
    timezone: "Europe/Lisbon",
  },
  modules: ["SOCIAL", "COPY"],
  channels: ["INSTAGRAM", "LINKEDIN"],
  cadence: {
    weeklyTarget: 3,
    preferredWeekdays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
  },
  objectives: ["AWARENESS", "ENGAGEMENT"],
  sourceSelection: {
    strategy: "PLAN_NEW_CONTENT",
    includeUnscheduledExistingContent: false,
    allowPlannedPlaceholders: true,
  },
  outputLanguage: "English",
  mockScenario: "success",
} as const;

const snapshot = {
  schemaVersion: "1.0",
  contentType: "EDITORIAL_CALENDAR",
  title: "UrbanStride August editorial calendar",
  planningPeriod: request.planningPeriod,
  strategySummary: "A balanced fictional campaign plan.",
  entries: [
    {
      id: "entry-1",
      ordinal: 1,
      scheduledDate: "2026-08-03",
      timezone: "Europe/Lisbon",
      module: "SOCIAL",
      channel: "INSTAGRAM",
      objective: "AWARENESS",
      status: "PLANNED",
      title: "UrbanStride city movement story",
      source: { type: "PLANNED_PLACEHOLDER" },
    },
  ],
  provenance: {
    provider: "mock",
    model: "mock-calendar-v1",
    promptVersion: "calendar-1.0",
    schemaVersion: "1.0",
    requestId: "calendar-request-1",
    generationJobId: "calendar-job-1",
    brandProfileVersionId: "brand-profile-version-1",
    generatedAt: "1970-01-01T00:00:00.000Z",
    mock: true,
  },
} as const;

describe("Calendar schemas and registry", () => {
  it("accepts bounded planning settings and rejects invalid ranges/timezones", () => {
    expect(CalendarGenerationRequestSchema.safeParse(request).success).toBe(
      true,
    );
    expect(
      CalendarGenerationRequestSchema.safeParse({
        ...request,
        planningPeriod: {
          ...request.planningPeriod,
          endDate: "2026-08-04",
        },
      }).success,
    ).toBe(false);
    expect(
      CalendarGenerationRequestSchema.safeParse({
        ...request,
        planningPeriod: {
          ...request.planningPeriod,
          timezone: "Not/A_Real_Zone",
        },
      }).success,
    ).toBe(false);
  });

  it("validates entries strictly and within the planning period", () => {
    expect(CalendarSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(
      CalendarSnapshotSchema.safeParse({
        ...snapshot,
        entries: [{ ...snapshot.entries[0], scheduledDate: "2027-01-01" }],
      }).success,
    ).toBe(false);
    expect(
      CalendarSnapshotSchema.safeParse({
        ...snapshot,
        entries: [{ ...snapshot.entries[0], unsafe: "<script />" }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate entry IDs and excessive cadence", () => {
    expect(
      CalendarSnapshotSchema.safeParse({
        ...snapshot,
        entries: [snapshot.entries[0], { ...snapshot.entries[0], ordinal: 2 }],
      }).success,
    ).toBe(false);
    expect(
      CalendarGenerationRequestSchema.safeParse({
        ...request,
        cadence: { weeklyTarget: 51 },
      }).success,
    ).toBe(false);
  });

  it("registers all Calendar types and a plain-text formatter", () => {
    for (const type of CalendarContentTypeSchema.options) {
      const definition = getCalendarDefinition(type);
      expect(definition?.module).toBe("CALENDAR");
      expect(definition?.capabilities.wholeItemRegeneration).toBe(true);
    }
    expect(
      formatCalendarForCopy(CalendarSnapshotSchema.parse(snapshot)),
    ).toContain("UrbanStride August editorial calendar");
    expect(getCalendarDefinition("UNKNOWN")).toBeNull();
  });
});
