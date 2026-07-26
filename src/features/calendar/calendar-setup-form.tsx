"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  CalendarChannelSchema,
  CalendarContentTypeSchema,
  CalendarGenerationRequestSchema,
  CalendarMockScenarioSchema,
  CalendarObjectiveSchema,
  CalendarSourceModuleSchema,
  CalendarSourceStrategySchema,
  type CalendarGenerationRequest,
} from "@/domain/calendar/calendar-schemas";
import {
  configureCalendarAction,
  generateCalendarAction,
} from "./calendar-actions";

type Source = { id: string; title: string; module: string; type: string };
type Fields = {
  startDate: string;
  endDate: string;
  timezone: string;
  weeklyTarget: number;
  sourceStrategy: CalendarGenerationRequest["sourceSelection"]["strategy"];
  outputLanguage: string;
  notes: string;
  mockScenario: CalendarGenerationRequest["mockScenario"];
  campaignName: string;
};
const toggle = <T extends string>(values: T[], value: T) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
const defaultPeriod = () => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export function CalendarSetupForm({
  projectId,
  defaultLanguage,
  sources,
  initial,
}: {
  projectId: string;
  defaultLanguage: string;
  sources: Source[];
  initial?: CalendarGenerationRequest;
}) {
  const period = defaultPeriod();
  const [calendarType, setCalendarType] = useState(
    initial?.calendarType ?? "EDITORIAL_CALENDAR",
  );
  const [modules, setModules] = useState<CalendarGenerationRequest["modules"]>(
    initial?.modules ?? ["SOCIAL", "VIDEO", "COPY"],
  );
  const [channels, setChannels] = useState<
    CalendarGenerationRequest["channels"]
  >(initial?.channels ?? ["INSTAGRAM", "LINKEDIN", "EMAIL"]);
  const [objectives, setObjectives] = useState<
    CalendarGenerationRequest["objectives"]
  >(initial?.objectives ?? ["AWARENESS", "ENGAGEMENT"]);
  const [sourceIds, setSourceIds] = useState<string[]>(
    initial?.sourceSelection.contentItemIds ??
      sources.slice(0, 12).map(({ id }) => id),
  );
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { register, handleSubmit } = useForm<Fields>({
    defaultValues: {
      startDate: initial?.planningPeriod.startDate ?? period.start,
      endDate: initial?.planningPeriod.endDate ?? period.end,
      timezone: initial?.planningPeriod.timezone ?? "Europe/Lisbon",
      weeklyTarget: initial?.cadence.weeklyTarget ?? 3,
      sourceStrategy:
        initial?.sourceSelection.strategy ?? "MIX_EXISTING_AND_NEW",
      outputLanguage: initial?.outputLanguage ?? defaultLanguage,
      notes: initial?.notes ?? "",
      mockScenario: initial?.mockScenario ?? "success",
      campaignName: initial?.campaigns?.[0]?.name ?? "",
    },
  });
  return (
    <form
      className="border-default bg-surface rounded-panel space-y-5 border p-5 sm:p-6"
      onSubmit={handleSubmit((values) => {
        const parsed = CalendarGenerationRequestSchema.safeParse({
          schemaVersion: "1.0",
          calendarType,
          planningPeriod: {
            startDate: values.startDate,
            endDate: values.endDate,
            timezone: values.timezone,
          },
          modules,
          channels,
          cadence: { weeklyTarget: Number(values.weeklyTarget) },
          objectives,
          ...(values.campaignName
            ? {
                campaigns: [
                  {
                    id: "campaign-1",
                    name: values.campaignName,
                    priority: "HIGH",
                    startDate: values.startDate,
                    endDate: values.endDate,
                  },
                ],
              }
            : {}),
          sourceSelection: {
            strategy: values.sourceStrategy,
            ...(sourceIds.length ? { contentItemIds: sourceIds } : {}),
            includeUnscheduledExistingContent: true,
            allowPlannedPlaceholders:
              values.sourceStrategy !== "USE_EXISTING_CONTENT",
          },
          reuseRules: {
            allowCrossChannelReuse: true,
            maximumUsesPerSourceItem: 3,
            minimumDaysBetweenReuse: 3,
          },
          outputLanguage: values.outputLanguage,
          mockScenario: values.mockScenario,
          ...(values.notes ? { notes: values.notes } : {}),
        });
        if (!parsed.success)
          return setMessage(
            parsed.error.issues[0]?.message ?? "Check Calendar setup.",
          );
        startTransition(async () => {
          const configured = await configureCalendarAction(
            projectId,
            parsed.data,
          );
          if (!configured.ok) return setMessage(configured.error.message);
          const queued = await generateCalendarAction(projectId);
          setMessage(
            queued.ok
              ? "Calendar planning queued. You can continue working."
              : queued.error.message,
          );
          router.refresh();
        });
      })}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">Calendar setup</h2>
        <p className="text-secondary mt-2 text-sm">
          Configure editorial intent. Dates remain inside Web Content Flow.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Calendar type
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            onChange={(event) =>
              setCalendarType(
                event.target.value as CalendarGenerationRequest["calendarType"],
              )
            }
            value={calendarType}
          >
            {CalendarContentTypeSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {[
          ["Start date", "startDate", "date"],
          ["End date", "endDate", "date"],
          ["Timezone", "timezone", "text"],
          ["Weekly target", "weeklyTarget", "number"],
          ["Output language", "outputLanguage", "text"],
        ].map(([label, name, type]) => (
          <label className="text-sm font-semibold" key={name}>
            {label}
            <input
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              min={name === "weeklyTarget" ? 1 : undefined}
              max={name === "weeklyTarget" ? 50 : undefined}
              type={type}
              {...register(name as keyof Fields, {
                valueAsNumber: name === "weeklyTarget",
              })}
            />
          </label>
        ))}
        <label className="text-sm font-semibold">
          Source strategy
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("sourceStrategy")}
          >
            {CalendarSourceStrategySchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Campaign name, optional
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("campaignName")}
          />
        </label>
      </div>
      {[
        ["Modules", CalendarSourceModuleSchema.options, modules, setModules],
        ["Channels", CalendarChannelSchema.options, channels, setChannels],
        [
          "Objectives",
          CalendarObjectiveSchema.options,
          objectives,
          setObjectives,
        ],
      ].map(([legend, options, values, setter]) => (
        <fieldset key={String(legend)}>
          <legend className="text-sm font-semibold">{String(legend)}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(options as readonly string[]).map((value) => (
              <label
                className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
                key={value}
              >
                <input
                  checked={(values as string[]).includes(value)}
                  onChange={() =>
                    (setter as React.Dispatch<React.SetStateAction<string[]>>)(
                      (current) => toggle(current, value),
                    )
                  }
                  type="checkbox"
                />
                {value.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend className="text-sm font-semibold">
          Existing source content
        </legend>
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {sources.length ? (
            sources.map((source) => (
              <label
                className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
                key={source.id}
              >
                <input
                  checked={sourceIds.includes(source.id)}
                  onChange={() =>
                    setSourceIds((current) => toggle(current, source.id))
                  }
                  type="checkbox"
                />
                <span>
                  {source.title} · {source.module} / {source.type}
                </span>
              </label>
            ))
          ) : (
            <p className="text-secondary text-sm">
              No eligible content is available. Choose planned placeholders or
              generate content in another module first.
            </p>
          )}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        Notes, optional
        <textarea
          className="border-default rounded-control mt-1 min-h-24 w-full border p-3 font-normal"
          {...register("notes")}
        />
      </label>
      <label className="block text-sm font-semibold">
        Mock scenario
        <select
          className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
          {...register("mockScenario")}
        >
          {CalendarMockScenarioSchema.options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <button
        className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
        disabled={pending}
        type="submit"
      >
        {pending ? "Queuing Calendar…" : "Generate editorial calendar"}
      </button>
      {message ? (
        <p
          className="bg-surface-subtle rounded-control p-3 text-sm"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
