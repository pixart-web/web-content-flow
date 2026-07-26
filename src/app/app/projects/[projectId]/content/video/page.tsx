import Link from "next/link";
import { notFound } from "next/navigation";

import {
  VideoContentTypeSchema,
  VideoFormatSchema,
  VideoGenerationRequestSchema,
  VideoPlatformSchema,
  VideoSnapshotSchema,
} from "@/domain/video/video-schemas";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { VideoFailedAssets } from "@/features/video/video-failed-assets";
import { VideoSetupForm } from "@/features/video/video-setup-form";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export default async function VideoModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const raw = await searchParams;
  const user = await requireUser(`/app/projects/${projectId}/content/video`);
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const [projectModule, items, job] = await Promise.all([
    getPrisma().projectModule.findFirst({
      where: { projectId, module: "VIDEO", project: { userId: user.id } },
    }),
    createContentRepository(getPrisma()).listProjectItems(user.id, projectId, {
      module: "VIDEO",
    }),
    getPrisma().generationJob.findFirst({
      where: {
        projectId,
        module: "VIDEO",
        parentJobId: null,
        project: { userId: user.id },
      },
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { ordinal: "asc" } },
        childJobs: {
          where: { status: "FAILED" },
          select: { id: true, request: true },
        },
      },
    }),
  ]);
  const settings = projectModule
    ? VideoGenerationRequestSchema.safeParse(projectModule.settings)
    : null;
  const platform = VideoPlatformSchema.safeParse(raw.platform);
  const format = VideoFormatSchema.safeParse(raw.format);
  const type = VideoContentTypeSchema.safeParse(raw.type);
  const parsedItems = items.flatMap((item) => {
    const snapshot = VideoSnapshotSchema.safeParse(
      item.currentVersion?.snapshot,
    );
    if (!snapshot.success) return [];
    if (platform.success && snapshot.data.platform !== platform.data) return [];
    if (format.success && snapshot.data.format !== format.data) return [];
    if (type.success && snapshot.data.contentType !== type.data) return [];
    return [{ item, snapshot: snapshot.data }];
  });
  const counts = job
    ? await getPrisma().generationJob.groupBy({
        by: ["status"],
        where: { parentJobId: job.id },
        _count: true,
      })
    : [];
  const total = counts.reduce((sum, count) => sum + count._count, 0);
  const completed =
    counts.find((count) => count.status === "COMPLETED")?._count ?? 0;
  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold">
          Video &amp; Reels
        </h2>
        <p className="text-secondary mt-2 max-w-3xl">
          Plan scripts, shots, voice-over, captions and production direction
          from the current Brief and Brand Profile.
        </p>
        <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
          Planning content only — no video, audio or images are rendered,
          uploaded or published.
        </p>
      </header>
      <VideoSetupForm
        defaultLanguage={project.outputLanguage}
        projectId={projectId}
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
      {total ? (
        <p
          className="bg-surface-subtle rounded-control p-3 text-sm"
          role="status"
        >
          {completed} of {total} planning assets saved
          {job?.status === "PARTIAL" ? " · Partial completion" : ""}
        </p>
      ) : null}
      <VideoFailedAssets
        assets={(job?.childJobs ?? []).map((child) => {
          const request = child.request as {
            platform?: string;
            contentType?: string;
          };
          return {
            jobId: child.id,
            label: `${request.platform?.replaceAll("_", " ") ?? "Video"} ${request.contentType?.replaceAll("_", " ").toLowerCase() ?? "asset"}`,
          };
        })}
        projectId={projectId}
      />
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            Video planning assets
          </h2>
          <span className="text-secondary text-sm">
            {projectModule?.status ?? "Not configured"}
          </span>
        </div>
        <form className="border-default bg-surface rounded-card grid gap-3 border p-4 sm:grid-cols-4">
          {[
            ["platform", "Platform", VideoPlatformSchema.options],
            ["format", "Format", VideoFormatSchema.options],
            ["type", "Asset type", VideoContentTypeSchema.options],
          ].map(([name, label, options]) => (
            <label className="text-sm font-semibold" key={String(name)}>
              {String(label)}
              <select
                className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                defaultValue={
                  name === "platform" && platform.success
                    ? platform.data
                    : name === "format" && format.success
                      ? format.data
                      : name === "type" && type.success
                        ? type.data
                        : ""
                }
                name={String(name)}
              >
                <option value="">All</option>
                {(options as readonly string[]).map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button
            className="bg-action-primary text-inverse rounded-control min-h-11 self-end px-4 text-sm font-semibold"
            type="submit"
          >
            Apply filters
          </button>
        </form>
        {parsedItems.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {parsedItems.map(({ item, snapshot }) => (
              <Link
                className="border-default bg-surface hover:border-strong rounded-card border p-5"
                href={`/app/projects/${projectId}/content/video/${item.id}`}
                key={item.id}
              >
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span>{snapshot.platform}</span>
                  <span>·</span>
                  <span>{snapshot.contentType.replaceAll("_", " ")}</span>
                  <span>·</span>
                  <span>{snapshot.format.replaceAll("_", " ")}</span>
                </div>
                <strong className="mt-2 block">{item.title}</strong>
                <p className="text-secondary mt-2 text-sm">
                  Version {item.currentVersion?.versionNumber ?? "—"} · Brand
                  Profile v{item.sourceBrandProfileVersion.versionNumber}
                  {item.currentVersion?.mock ? " · Mock" : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-secondary">
            {items.length
              ? "No video planning assets match these filters."
              : "Configure a planning pack to create structured video assets."}
          </p>
        )}
      </section>
    </div>
  );
}
