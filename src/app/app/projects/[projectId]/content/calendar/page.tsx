import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CalendarChannelSchema,
  CalendarGenerationRequestSchema,
  CalendarObjectiveSchema,
  CalendarSnapshotSchema,
  CalendarViewSchema,
} from "@/domain/calendar/calendar-schemas";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { CalendarFailedPeriods } from "@/features/calendar/calendar-failed-periods";
import { CalendarSetupForm } from "@/features/calendar/calendar-setup-form";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export default async function CalendarModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const raw = await searchParams;
  const user = await requireUser(`/app/projects/${projectId}/content/calendar`);
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const [projectModule, calendarItems, sources, job] = await Promise.all([
    prisma.projectModule.findFirst({
      where: { projectId, module: "CALENDAR", project: { userId: user.id } },
    }),
    createContentRepository(prisma).listProjectItems(user.id, projectId, {
      module: "CALENDAR",
    }),
    prisma.contentItem.findMany({
      where: {
        projectId,
        module: { in: ["WEBSITE", "SOCIAL", "ADS", "VIDEO", "COPY"] },
        currentVersionId: { not: null },
        project: { userId: user.id },
      },
      select: { id: true, title: true, module: true, type: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.generationJob.findFirst({
      where: {
        projectId,
        module: "CALENDAR",
        parentJobId: null,
        project: { userId: user.id },
      },
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { ordinal: "asc" } },
        childJobs: {
          where: { status: "FAILED" },
          select: { id: true, scopeId: true },
        },
      },
    }),
  ]);
  const settings = projectModule
    ? CalendarGenerationRequestSchema.safeParse(projectModule.settings)
    : null;
  const selected =
    calendarItems.find((item) => item.id === raw.itemId) ??
    calendarItems[0] ??
    null;
  const snapshot = selected
    ? CalendarSnapshotSchema.safeParse(selected.currentVersion?.snapshot)
    : null;
  const view = CalendarViewSchema.catch("LIST").parse(raw.view);
  const channel = CalendarChannelSchema.safeParse(raw.channel);
  const objective = CalendarObjectiveSchema.safeParse(raw.objective);
  const entries =
    snapshot?.success && "entries" in snapshot.data
      ? snapshot.data.entries.filter(
          (entry) =>
            (!channel.success || entry.channel === channel.data) &&
            (!objective.success || entry.objective === objective.data),
        )
      : [];
  const grouped = Map.groupBy(entries, (entry) => entry.scheduledDate);
  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold">
          Content Calendar
        </h2>
        <p className="text-secondary mt-2 max-w-3xl">
          Organise existing content and planned work into a connected editorial
          plan.
        </p>
        <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
          Planning only — no content was published or externally scheduled.
        </p>
      </header>
      <CalendarSetupForm
        defaultLanguage={project.outputLanguage}
        projectId={projectId}
        sources={sources}
        {...(settings?.success ? { initial: settings.data } : {})}
      />
      {job && !["COMPLETED", "CANCELLED"].includes(job.status) ? (
        <ContentJobStatus
          projectId={projectId}
          initialJob={{
            id: job.id,
            status: job.status,
            mode: job.mode,
            attempt: job.attempt,
            maxAttempts: job.maxAttempts,
            safeErrorCode: job.safeErrorCode,
            steps: job.steps.map((step) => ({
              key: step.key,
              label: step.label,
              status: step.status,
            })),
          }}
        />
      ) : null}
      <CalendarFailedPeriods
        periods={(job?.childJobs ?? []).map((child) => ({
          jobId: child.id,
          label: `Week of ${child.scopeId ?? "selected period"}`,
        }))}
        projectId={projectId}
      />
      {calendarItems.length ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <form className="flex flex-wrap items-end gap-2">
              <input name="view" type="hidden" value={view} />
              <label className="text-sm font-semibold">
                Calendar asset
                <select
                  className="border-default rounded-control ml-2 min-h-11 border px-3 font-normal"
                  defaultValue={selected?.id}
                  name="itemId"
                >
                  {calendarItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="border-default rounded-control min-h-11 border px-3 text-sm font-semibold"
                type="submit"
              >
                Open
              </button>
            </form>
            {selected ? (
              <Link
                className="text-link min-h-11 py-3 font-semibold"
                href={`/app/projects/${projectId}/content/calendar/${selected.id}`}
              >
                Open structured editor
              </Link>
            ) : null}
          </div>
          <nav aria-label="Calendar views" className="flex flex-wrap gap-2">
            {CalendarViewSchema.options.map((value) => (
              <Link
                aria-current={view === value ? "page" : undefined}
                className="border-default rounded-control min-h-11 border px-4 py-3 text-sm font-semibold"
                href={`?view=${value}${selected ? `&itemId=${selected.id}` : ""}`}
                key={value}
              >
                {value[0]}
                {value.slice(1).toLocaleLowerCase()}
              </Link>
            ))}
          </nav>
          <form className="border-default bg-surface rounded-card grid gap-3 border p-4 sm:grid-cols-3">
            <input name="view" type="hidden" value={view} />
            {selected ? (
              <input name="itemId" type="hidden" value={selected.id} />
            ) : null}
            <label className="text-sm font-semibold">
              Channel
              <select
                className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                defaultValue={channel.success ? channel.data : ""}
                name="channel"
              >
                <option value="">All</option>
                {CalendarChannelSchema.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Objective
              <select
                className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                defaultValue={objective.success ? objective.data : ""}
                name="objective"
              >
                <option value="">All</option>
                {CalendarObjectiveSchema.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button
              className="bg-action-primary text-inverse rounded-control min-h-11 self-end px-4 text-sm font-semibold"
              type="submit"
            >
              Apply filters
            </button>
          </form>
          {snapshot?.success ? (
            <div>
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="bg-surface-selected rounded-pill px-3 py-1">
                  {snapshot.data.contentType.replaceAll("_", " ")}
                </span>
                <span className="border-default rounded-pill border px-3 py-1">
                  Mock
                </span>
                <span className="border-default rounded-pill border px-3 py-1">
                  Brand Profile v
                  {selected?.sourceBrandProfileVersion.versionNumber}
                </span>
              </div>
              {view === "MONTH" ? (
                <div
                  aria-label="Month calendar"
                  className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7"
                >
                  {[...grouped].map(([date, dayEntries]) => (
                    <section
                      aria-label={`${date}, ${dayEntries.length} entries`}
                      className="border-default bg-surface rounded-card min-h-32 border p-3"
                      key={date}
                    >
                      <h3 className="font-semibold">{date}</h3>
                      <ul className="mt-2 space-y-2 text-sm">
                        {dayEntries.map((entry) => (
                          <li key={entry.id}>
                            {entry.scheduledTime
                              ? `${entry.scheduledTime} · `
                              : ""}
                            {entry.title}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[...grouped]
                    .slice(0, view === "WEEK" ? 7 : undefined)
                    .map(([date, dayEntries]) => (
                      <section
                        className="border-default bg-surface rounded-card border p-4"
                        key={date}
                      >
                        <h3 className="font-display font-semibold">{date}</h3>
                        <ul className="mt-3 space-y-3">
                          {dayEntries.map((entry) => (
                            <li
                              className="bg-surface-subtle rounded-control p-3"
                              key={entry.id}
                            >
                              <strong>{entry.title}</strong>
                              <p className="text-secondary mt-1 text-sm">
                                {entry.scheduledTime
                                  ? `${entry.scheduledTime} · `
                                  : ""}
                                {entry.channel} · {entry.module} ·{" "}
                                {entry.status}
                              </p>
                              <span className="mt-1 block text-xs font-semibold">
                                {entry.source.type === "CONTENT_ITEM"
                                  ? "Linked content"
                                  : "Planned placeholder"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                </div>
              )}
              {!entries.length ? (
                <p className="text-secondary">
                  No Calendar entries match these filters.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-secondary">
              This Calendar asset is not available.
            </p>
          )}
        </section>
      ) : (
        <section className="border-default bg-surface rounded-card border p-6">
          <h2 className="font-display text-lg font-semibold">
            Create an editorial calendar
          </h2>
          <p className="text-secondary mt-2">
            Create an editorial calendar from your existing content and project
            strategy.
          </p>
        </section>
      )}
    </div>
  );
}
