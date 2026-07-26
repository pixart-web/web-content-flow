"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  CalendarChannelSchema,
  CalendarEntrySchema,
  CalendarEntryStatusSchema,
  CalendarObjectiveSchema,
  CalendarSnapshotSchema,
  type CalendarSnapshot,
  type EditorialCalendarSnapshot,
} from "@/domain/calendar/calendar-schemas";
import { formatCalendarForCopy } from "@/domain/content/content-registry";
import { restoreContentAction } from "@/features/content/content-actions";
import {
  regenerateCalendarAction,
  saveCalendarAction,
} from "./calendar-actions";

type Version = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  brandProfileVersion: number;
  mock: boolean;
  current: boolean;
};
type Source = {
  id: string;
  title: string;
  type: string;
  module: "WEBSITE" | "SOCIAL" | "ADS" | "VIDEO" | "COPY";
  currentVersionId: string;
  mock: boolean;
  brandProfileVersionId: string;
};
const control =
  "border-default rounded-control mt-1 min-h-11 w-full border px-3 py-2 font-normal disabled:bg-surface-subtle";
const addDays = (date: string, amount: number) => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
};

export function CalendarItemEditor({
  projectId,
  itemId,
  currentVersionId,
  snapshot,
  versions,
  sources,
}: {
  projectId: string;
  itemId: string;
  currentVersionId: string;
  snapshot: CalendarSnapshot;
  versions: Version[];
  sources: Source[];
}) {
  const {
    control: formControl,
    reset,
    setValue,
  } = useForm<{
    snapshot: CalendarSnapshot;
  }>({ defaultValues: { snapshot } });
  const draft =
    useWatch({ control: formControl, name: "snapshot" }) ?? snapshot;
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (editing && dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, editing]);
  const update = (next: CalendarSnapshot) => {
    setValue("snapshot", next, { shouldDirty: true });
    setDirty(true);
  };
  async function copy(value: string, scope: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${scope} copied.`);
    } catch {
      setMessage(`${scope} could not be copied.`);
    }
  }
  const regenerate = (
    target?: Parameters<typeof regenerateCalendarAction>[0]["target"],
  ) =>
    startTransition(async () => {
      const result = await regenerateCalendarAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        ...(target ? { target } : {}),
      });
      setMessage(
        result.ok
          ? "Calendar regeneration queued. Previous version retained."
          : result.error.message,
      );
      if (result.ok) router.refresh();
    });
  const save = () => {
    const parsed = CalendarSnapshotSchema.safeParse(draft);
    if (!parsed.success)
      return setMessage(
        parsed.error.issues[0]?.message ?? "Check Calendar fields.",
      );
    startTransition(async () => {
      const result = await saveCalendarAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        snapshot: parsed.data,
      });
      if (!result.ok)
        return setMessage(
          result.error.code === "CONFLICT"
            ? "A newer Calendar version exists. Your draft is still here."
            : "Changes could not be saved. Your draft is still here.",
        );
      setEditing(false);
      setDirty(false);
      setMessage(`Version ${result.value.versionNumber} saved.`);
      router.refresh();
    });
  };
  const editorial = draft.contentType === "EDITORIAL_CALENDAR" ? draft : null;
  const updateEditorial = (next: EditorialCalendarSnapshot) => update(next);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,60rem)_18rem]">
      <section className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            onClick={() =>
              void copy(formatCalendarForCopy(snapshot), "Complete Calendar")
            }
            type="button"
          >
            Copy complete Calendar
          </button>
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            disabled={pending}
            onClick={() => regenerate()}
            type="button"
          >
            Regenerate Calendar
          </button>
          {!editing ? (
            <button
              className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
              onClick={() => setEditing(true)}
              type="button"
            >
              Edit
            </button>
          ) : null}
        </div>
        {message ? (
          <p
            className="bg-surface-subtle rounded-control p-3 text-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}
        <fieldset className="border-default bg-surface rounded-card space-y-4 border p-5">
          <legend className="px-1 font-semibold">Calendar details</legend>
          <label className="block text-sm font-semibold">
            Title
            <input
              className={control}
              disabled={!editing}
              onChange={(event) =>
                update({ ...draft, title: event.target.value })
              }
              value={draft.title}
            />
          </label>
          {editorial ? (
            <>
              <label className="block text-sm font-semibold">
                Strategy summary
                <textarea
                  className={`${control} min-h-28`}
                  disabled={!editing}
                  onChange={(event) =>
                    updateEditorial({
                      ...editorial,
                      strategySummary: event.target.value,
                    })
                  }
                  value={editorial.strategySummary}
                />
              </label>
              <button
                className="text-link min-h-11 text-sm font-semibold"
                onClick={() =>
                  regenerate({
                    kind: "FIELD",
                    field: "STRATEGY_SUMMARY",
                  })
                }
                type="button"
              >
                Regenerate strategy summary
              </button>
            </>
          ) : (
            <p className="text-secondary text-sm">
              {draft.contentType === "CAMPAIGN_PLAN"
                ? `${draft.campaign.name} · ${draft.channelPlan.length} channel plans`
                : `${draft.entries.length} scheduled entries`}
            </p>
          )}
        </fieldset>
        {editorial ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                Entries ({editorial.entries.length})
              </h2>
              {editing ? (
                <button
                  className="border-default rounded-control min-h-11 border px-3 text-sm font-semibold"
                  onClick={() => {
                    const firstSource = sources[0];
                    const ordinal = editorial.entries.length + 1;
                    updateEditorial({
                      ...editorial,
                      entries: [
                        ...editorial.entries,
                        {
                          id: `entry-${crypto.randomUUID()}`,
                          ordinal,
                          scheduledDate: editorial.planningPeriod.startDate,
                          timezone: editorial.planningPeriod.timezone,
                          module: firstSource?.module ?? "COPY",
                          channel: "INTERNAL",
                          objective: "AWARENESS",
                          status: "PLANNED",
                          title: "Planned content",
                          source: { type: "PLANNED_PLACEHOLDER" },
                        },
                      ],
                    });
                  }}
                  type="button"
                >
                  Add planned entry
                </button>
              ) : null}
            </div>
            {editorial.entries.map((entry, index) => (
              <fieldset
                className="border-default bg-surface rounded-card space-y-4 border p-5"
                key={entry.id}
              >
                <legend className="px-1 font-semibold">
                  {entry.scheduledDate} · {entry.title}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Title
                    <input
                      className={control}
                      disabled={!editing}
                      onChange={(event) =>
                        updateEditorial({
                          ...editorial,
                          entries: editorial.entries.map((value, position) =>
                            position === index
                              ? { ...entry, title: event.target.value }
                              : value,
                          ),
                        })
                      }
                      value={entry.title}
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Date
                    <input
                      className={control}
                      disabled={!editing}
                      onChange={(event) =>
                        updateEditorial({
                          ...editorial,
                          entries: editorial.entries.map((value, position) =>
                            position === index
                              ? {
                                  ...entry,
                                  scheduledDate: event.target.value,
                                }
                              : value,
                          ),
                        })
                      }
                      type="date"
                      value={entry.scheduledDate}
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Channel
                    <select
                      className={control}
                      disabled={!editing}
                      onChange={(event) =>
                        updateEditorial({
                          ...editorial,
                          entries: editorial.entries.map((value, position) =>
                            position === index
                              ? {
                                  ...entry,
                                  channel: CalendarChannelSchema.parse(
                                    event.target.value,
                                  ),
                                }
                              : value,
                          ),
                        })
                      }
                      value={entry.channel}
                    >
                      {CalendarChannelSchema.options.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Objective
                    <select
                      className={control}
                      disabled={!editing}
                      onChange={(event) =>
                        updateEditorial({
                          ...editorial,
                          entries: editorial.entries.map((value, position) =>
                            position === index
                              ? {
                                  ...entry,
                                  objective: CalendarObjectiveSchema.parse(
                                    event.target.value,
                                  ),
                                }
                              : value,
                          ),
                        })
                      }
                      value={entry.objective}
                    >
                      {CalendarObjectiveSchema.options.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Status
                    <select
                      className={control}
                      disabled={!editing}
                      onChange={(event) =>
                        updateEditorial({
                          ...editorial,
                          entries: editorial.entries.map((value, position) =>
                            position === index
                              ? {
                                  ...entry,
                                  status: CalendarEntryStatusSchema.parse(
                                    event.target.value,
                                  ),
                                }
                              : value,
                          ),
                        })
                      }
                      value={entry.status}
                    >
                      {CalendarEntryStatusSchema.options.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Linked source
                    <select
                      className={control}
                      disabled={!editing}
                      onChange={(event) => {
                        const source = sources.find(
                          ({ id }) => id === event.target.value,
                        );
                        updateEditorial({
                          ...editorial,
                          entries: editorial.entries.map((value, position) =>
                            position === index
                              ? {
                                  ...entry,
                                  module: source?.module ?? entry.module,
                                  source: source
                                    ? CalendarEntrySchema.shape.source.parse({
                                        type: "CONTENT_ITEM",
                                        contentItemId: source.id,
                                        contentItemVersionId:
                                          source.currentVersionId,
                                        sourceTitleSnapshot: source.title,
                                        sourceType: source.type,
                                        sourceModule: source.module,
                                        sourceMock: source.mock,
                                        sourceBrandProfileVersionId:
                                          source.brandProfileVersionId,
                                      })
                                    : { type: "PLANNED_PLACEHOLDER" },
                                }
                              : value,
                          ),
                        });
                      }}
                      value={
                        entry.source.type === "CONTENT_ITEM"
                          ? entry.source.contentItemId
                          : ""
                      }
                    >
                      <option value="">Planned placeholder</option>
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="text-link min-h-11 px-2 text-sm font-semibold"
                    onClick={() =>
                      void copy(
                        `${entry.scheduledDate}\n${entry.channel}\n${entry.title}\n${entry.status}`,
                        "Calendar entry",
                      )
                    }
                    type="button"
                  >
                    Copy entry
                  </button>
                  <button
                    className="text-link min-h-11 px-2 text-sm font-semibold"
                    disabled={pending}
                    onClick={() =>
                      regenerate({ kind: "ENTRY", entryId: entry.id })
                    }
                    type="button"
                  >
                    Regenerate entry
                  </button>
                  {editing
                    ? [
                        ["Previous day", -1],
                        ["Next day", 1],
                        ["One week earlier", -7],
                        ["One week later", 7],
                      ].map(([text, amount]) => (
                        <button
                          className="border-default rounded-control min-h-11 border px-2 text-xs font-semibold"
                          key={String(text)}
                          onClick={() =>
                            updateEditorial({
                              ...editorial,
                              entries: editorial.entries.map(
                                (value, position) =>
                                  position === index
                                    ? {
                                        ...entry,
                                        scheduledDate: addDays(
                                          entry.scheduledDate,
                                          Number(amount),
                                        ),
                                      }
                                    : value,
                              ),
                            })
                          }
                          type="button"
                        >
                          Move {text}
                        </button>
                      ))
                    : null}
                  {editing ? (
                    <button
                      className="border-default rounded-control min-h-11 border px-2 text-xs font-semibold"
                      onClick={() => {
                        const copy = {
                          ...entry,
                          id: `entry-${crypto.randomUUID()}`,
                          ordinal: editorial.entries.length + 1,
                          status: "PLANNED" as const,
                          source: { type: "PLANNED_PLACEHOLDER" as const },
                        };
                        updateEditorial({
                          ...editorial,
                          entries: [...editorial.entries, copy],
                        });
                      }}
                      type="button"
                    >
                      Duplicate as planned entry
                    </button>
                  ) : null}
                </div>
              </fieldset>
            ))}
          </section>
        ) : null}
        {editing ? (
          <div className="bg-surface border-default sticky bottom-0 flex flex-wrap gap-2 border-t p-3">
            <button
              className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
              disabled={pending || !dirty}
              onClick={save}
              type="button"
            >
              Save new version
            </button>
            <button
              className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
              onClick={() => {
                reset({ snapshot });
                setDirty(false);
                setEditing(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </section>
      <aside>
        <details
          className="border-default bg-surface rounded-card border p-4"
          open
        >
          <summary className="min-h-11 cursor-pointer font-semibold">
            Version history ({versions.length})
          </summary>
          <ol className="mt-3 space-y-3">
            {versions.map((version) => (
              <li
                className="border-default border-t pt-3 text-sm"
                key={version.id}
              >
                <strong>
                  Version {version.versionNumber}
                  {version.current ? " · Current" : ""}
                </strong>
                <p className="text-secondary">
                  {version.source} · Brand Profile v
                  {version.brandProfileVersion}
                  {version.mock ? " · Mock" : ""}
                </p>
                {!version.current ? (
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await restoreContentAction({
                          projectId,
                          itemId,
                          versionId: version.id,
                          expectedCurrentVersionId: currentVersionId,
                        });
                        setMessage(
                          result.ok
                            ? "Calendar restored as a new version."
                            : result.error.message,
                        );
                        if (result.ok) router.refresh();
                      })
                    }
                    type="button"
                  >
                    Restore as new version
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      </aside>
    </div>
  );
}
