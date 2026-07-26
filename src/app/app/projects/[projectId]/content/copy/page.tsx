import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CopyPurposeSchema,
  GeneralCopySnapshotSchema,
  GeneralCopyTypeSchema,
  CopyGenerationRequestSchema,
} from "@/domain/copy/copy-schemas";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { CopyFailedAssets } from "@/features/copy/copy-failed-assets";
import { CopySetupForm } from "@/features/copy/copy-setup-form";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export default async function CopyModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const raw = await searchParams;
  const user = await requireUser(`/app/projects/${projectId}/content/copy`);
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const [projectModule, items, job] = await Promise.all([
    prisma.projectModule.findFirst({
      where: { projectId, module: "COPY", project: { userId: user.id } },
    }),
    createContentRepository(prisma).listProjectItems(user.id, projectId, {
      module: "COPY",
    }),
    prisma.generationJob.findFirst({
      where: {
        projectId,
        module: "COPY",
        parentJobId: null,
        request: { path: ["kind"], string_starts_with: "COPY_" },
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
    ? CopyGenerationRequestSchema.safeParse(projectModule.settings)
    : null;
  const type = GeneralCopyTypeSchema.safeParse(raw.type);
  const purpose = CopyPurposeSchema.safeParse(raw.purpose);
  const parsedItems = items.flatMap((item) => {
    if (item.type === "FOUNDATION_COPY") return [];
    const snapshot = GeneralCopySnapshotSchema.safeParse(
      item.currentVersion?.snapshot,
    );
    if (!snapshot.success || snapshot.data.contentType !== item.type) return [];
    if (type.success && snapshot.data.contentType !== type.data) return [];
    if (purpose.success && snapshot.data.purpose !== purpose.data) return [];
    return [{ item, snapshot: snapshot.data }];
  });
  const counts = job
    ? await prisma.generationJob.groupBy({
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
        <h2 className="font-display text-2xl font-semibold">General Copy</h2>
        <p className="text-secondary mt-2 max-w-3xl">
          Create structured marketing, editorial, product, company and sales
          copy from the shared Brand Profile.
        </p>
        <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
          Review factual claims, names and publication requirements before use.
          Web links are recorded as text and are not fetched.
        </p>
      </header>
      <CopySetupForm
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
          {completed} of {total} copy assets saved
          {job?.status === "PARTIAL" ? " · Partial completion" : ""}
        </p>
      ) : null}
      <CopyFailedAssets
        assets={(job?.childJobs ?? []).map((child) => {
          const request = child.request as { contentType?: string };
          return {
            jobId: child.id,
            label: request.contentType?.replaceAll("_", " ") ?? "Copy asset",
          };
        })}
        projectId={projectId}
      />
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Copy assets</h2>
          <Link
            className="text-link min-h-11 py-3 text-sm font-semibold"
            href={`/app/projects/${projectId}/library?module=COPY`}
          >
            View in Library
          </Link>
        </div>
        <form className="border-default bg-surface rounded-card grid gap-3 border p-4 sm:grid-cols-3">
          {[
            ["type", "Copy type", GeneralCopyTypeSchema.options],
            ["purpose", "Purpose", CopyPurposeSchema.options],
          ].map(([name, text, options]) => (
            <label className="text-sm font-semibold" key={String(name)}>
              {String(text)}
              <select
                className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                defaultValue={
                  name === "type" && type.success
                    ? type.data
                    : name === "purpose" && purpose.success
                      ? purpose.data
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
                href={`/app/projects/${projectId}/content/copy/${item.id}`}
                key={item.id}
              >
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span>{snapshot.contentType.replaceAll("_", " ")}</span>
                  <span>·</span>
                  <span>{snapshot.purpose}</span>
                  <span>·</span>
                  <span>{snapshot.tone}</span>
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
            {items.some((item) => item.type !== "FOUNDATION_COPY")
              ? "No copy assets match these filters."
              : "Configure a copy pack to create structured assets."}
          </p>
        )}
      </section>
    </div>
  );
}
