import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SocialContentTypeSchema,
  SocialGenerationRequestSchema,
  SocialPlatformSchema,
  SocialSnapshotSchema,
} from "@/domain/social/social-schemas";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { SocialFailedItems } from "@/features/social/social-failed-items";
import { SocialSetupForm } from "@/features/social/social-setup-form";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export default async function SocialModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const rawFilters = await searchParams;
  const user = await requireUser(`/app/projects/${projectId}/content/social`);
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const [projectModule, items, job] = await Promise.all([
    getPrisma().projectModule.findFirst({
      where: { projectId, module: "SOCIAL", project: { userId: user.id } },
    }),
    createContentRepository(getPrisma()).listProjectItems(user.id, projectId, {
      module: "SOCIAL",
    }),
    getPrisma().generationJob.findFirst({
      where: {
        projectId,
        module: "SOCIAL",
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
    ? SocialGenerationRequestSchema.safeParse(projectModule.settings)
    : null;
  const platform = SocialPlatformSchema.safeParse(rawFilters.platform);
  const contentType = SocialContentTypeSchema.safeParse(rawFilters.type);
  const parsedItems = items.flatMap((item) => {
    const snapshot = SocialSnapshotSchema.safeParse(
      item.currentVersion?.snapshot,
    );
    if (!snapshot.success) return [];
    if (platform.success && snapshot.data.platform !== platform.data) return [];
    if (contentType.success && snapshot.data.contentType !== contentType.data)
      return [];
    return [{ item, snapshot: snapshot.data }];
  });
  const childCount = job
    ? await getPrisma().generationJob.count({ where: { parentJobId: job.id } })
    : 0;
  const completedCount = job
    ? await getPrisma().generationJob.count({
        where: { parentJobId: job.id, status: "COMPLETED" },
      })
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold">Social</h2>
        <p className="text-secondary mt-2 max-w-3xl">
          Create structured Social content from your Brief and Brand Profile.
        </p>
        <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
          Content only — Web Content Flow does not publish or schedule Social
          posts.
        </p>
      </header>
      <SocialSetupForm
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
      {childCount ? (
        <p
          className="bg-surface-subtle rounded-control p-3 text-sm"
          role="status"
        >
          {completedCount} of {childCount} items saved
          {job?.status === "PARTIAL" ? " · Partial completion" : ""}
        </p>
      ) : null}
      <SocialFailedItems
        projectId={projectId}
        items={(job?.childJobs ?? []).map((child) => {
          const request = child.request as {
            platform?: string;
            contentType?: string;
          };
          return {
            jobId: child.id,
            label: `${request.platform ?? "Social"} ${(
              request.contentType ?? "item"
            )
              .replace("SOCIAL_", "")
              .toLowerCase()}`,
          };
        })}
      />
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Social content</h2>
          <span className="text-secondary text-sm">
            {projectModule?.status ?? "Not configured"}
          </span>
        </div>
        <form className="border-default bg-surface rounded-card grid gap-3 border p-4 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            Platform
            <select
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              defaultValue={platform.success ? platform.data : ""}
              name="platform"
            >
              <option value="">All</option>
              {SocialPlatformSchema.options.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Content type
            <select
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              defaultValue={contentType.success ? contentType.data : ""}
              name="type"
            >
              <option value="">All</option>
              {SocialContentTypeSchema.options.map((value) => (
                <option key={value} value={value}>
                  {value.replace("SOCIAL_", "").replaceAll("_", " ")}
                </option>
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
                href={`/app/projects/${projectId}/content/social/${item.id}`}
                key={item.id}
              >
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span>{snapshot.platform}</span>
                  <span>·</span>
                  <span>{snapshot.contentType.replace("SOCIAL_", "")}</span>
                  <span>·</span>
                  <span>{snapshot.objective}</span>
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
              ? "No Social content matches these filters."
              : "Create Social content from your Brief and Brand Profile."}
          </p>
        )}
      </section>
    </div>
  );
}
