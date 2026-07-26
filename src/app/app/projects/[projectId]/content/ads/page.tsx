import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdsChannelSchema,
  AdsContentTypeSchema,
  AdsGenerationRequestSchema,
  AdsSnapshotSchema,
} from "@/domain/ads/ads-schemas";
import { AdsFailedAssets } from "@/features/ads/ads-failed-assets";
import { AdsSetupForm } from "@/features/ads/ads-setup-form";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export default async function AdsModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const raw = await searchParams;
  const user = await requireUser(`/app/projects/${projectId}/content/ads`);
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const [projectModule, items, job] = await Promise.all([
    getPrisma().projectModule.findFirst({
      where: { projectId, module: "ADS", project: { userId: user.id } },
    }),
    createContentRepository(getPrisma()).listProjectItems(user.id, projectId, {
      module: "ADS",
    }),
    getPrisma().generationJob.findFirst({
      where: {
        projectId,
        module: "ADS",
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
    ? AdsGenerationRequestSchema.safeParse(projectModule.settings)
    : null;
  const channel = AdsChannelSchema.safeParse(raw.channel);
  const type = AdsContentTypeSchema.safeParse(raw.type);
  const parsedItems = items.flatMap((item) => {
    const snapshot = AdsSnapshotSchema.safeParse(item.currentVersion?.snapshot);
    if (!snapshot.success) return [];
    if (channel.success && snapshot.data.channel !== channel.data) return [];
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
          Ads &amp; Creative
        </h2>
        <p className="text-secondary mt-2 max-w-3xl">
          Create ad copy and creative direction from your Brief and Brand
          Profile.
        </p>
        <div className="border-default bg-surface-subtle rounded-control mt-3 space-y-1 border p-3 text-sm">
          <p>
            Content only — Web Content Flow does not launch or manage
            advertising campaigns.
          </p>
          <p>
            Review claims, disclosures and platform requirements before
            publishing.
          </p>
        </div>
      </header>
      <AdsSetupForm
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
          {completed} of {total} assets saved
          {job?.status === "PARTIAL" ? " · Partial completion" : ""}
        </p>
      ) : null}
      <AdsFailedAssets
        projectId={projectId}
        assets={(job?.childJobs ?? []).map((child) => {
          const request = child.request as {
            channel?: string;
            contentType?: string;
          };
          return {
            jobId: child.id,
            label: `${request.channel?.replaceAll("_", " ") ?? "Advertising"} ${request.contentType?.replaceAll("_", " ").toLowerCase() ?? "asset"}`,
          };
        })}
      />
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            Advertising assets
          </h2>
          <span className="text-secondary text-sm">
            {projectModule?.status ?? "Not configured"}
          </span>
        </div>
        <form className="border-default bg-surface rounded-card grid gap-3 border p-4 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            Channel
            <select
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              defaultValue={channel.success ? channel.data : ""}
              name="channel"
            >
              <option value="">All</option>
              {AdsChannelSchema.options.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Asset type
            <select
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              defaultValue={type.success ? type.data : ""}
              name="type"
            >
              <option value="">All</option>
              {AdsContentTypeSchema.options.map((value) => (
                <option key={value}>{value.replaceAll("_", " ")}</option>
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
        {parsedItems.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {parsedItems.map(({ item, snapshot }) => (
              <Link
                className="border-default bg-surface hover:border-strong rounded-card border p-5"
                href={`/app/projects/${projectId}/content/ads/${item.id}`}
                key={item.id}
              >
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span>{snapshot.channel}</span>
                  <span>·</span>
                  <span>{snapshot.contentType.replaceAll("_", " ")}</span>
                  <span>·</span>
                  <span>{snapshot.campaignObjective}</span>
                </div>
                <strong className="mt-2 block">{item.title}</strong>
                <p className="text-secondary mt-2 text-sm">
                  Version {item.currentVersion?.versionNumber ?? "—"} · Brand
                  Profile v{item.sourceBrandProfileVersion.versionNumber}
                  {item.currentVersion?.mock ? " · Mock" : ""}
                </p>
                {snapshot.contentType === "IMAGE_PROMPT_PACK" ? (
                  <p className="text-secondary mt-2 text-sm">
                    Prompt pack only — no image was generated.
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-secondary">
            {items.length
              ? "No advertising assets match these filters."
              : "Create ad copy and creative direction from your Brief and Brand Profile."}
          </p>
        )}
      </section>
    </div>
  );
}
