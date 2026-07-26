import Link from "next/link";
import { notFound } from "next/navigation";

import { WebsiteGenerationRequestSchema } from "@/domain/website/website-schemas";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { WebsiteSetupForm } from "@/features/website/website-setup-form";
import { WebsiteFailedPages } from "@/features/website/website-failed-pages";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export default async function WebsiteModulePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser(`/app/projects/${projectId}/content/website`);
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const [module, pages, job] = await Promise.all([
    getPrisma().projectModule.findFirst({
      where: { projectId, module: "WEBSITE", project: { userId: user.id } },
    }),
    createContentRepository(getPrisma()).listProjectItems(user.id, projectId, {
      module: "WEBSITE",
    }),
    getPrisma().generationJob.findFirst({
      where: {
        projectId,
        module: "WEBSITE",
        parentJobId: null,
        project: { userId: user.id },
      },
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { ordinal: "asc" } },
        childJobs: {
          where: { status: "FAILED" },
          select: { id: true, request: true, safeErrorCode: true },
        },
      },
    }),
  ]);
  const settings = module
    ? WebsiteGenerationRequestSchema.safeParse(module.settings)
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold">Website</h2>
        <p className="text-secondary mt-2 max-w-3xl">
          Generate website structure and copy from your Brief and Brand Profile.
        </p>
        <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
          Copy only — Web Content Flow does not build or publish the website.
        </p>
      </header>
      <WebsiteSetupForm
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
      <WebsiteFailedPages
        projectId={projectId}
        pages={(job?.childJobs ?? []).map((child) => {
          const request = child.request as { pageName?: string };
          return {
            jobId: child.id,
            pageName: request.pageName ?? "Website page",
            errorCode: child.safeErrorCode,
          };
        })}
      />
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Pages</h2>
          <span className="text-secondary text-sm">
            {module?.status ?? "Not configured"}
          </span>
        </div>
        {pages.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {pages.map((page) => (
              <Link
                className="border-default bg-surface hover:border-strong rounded-card border p-5"
                href={`/app/projects/${projectId}/content/website/${page.id}`}
                key={page.id}
              >
                <strong>{page.title}</strong>
                <p className="text-secondary mt-2 text-sm">
                  Version {page.currentVersion?.versionNumber ?? "—"} · Brand
                  Profile v{page.sourceBrandProfileVersion.versionNumber}
                  {page.currentVersion?.mock ? " · Mock" : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-secondary mt-4">
            Generate website structure and copy from your Brief and Brand
            Profile.
          </p>
        )}
      </section>
    </div>
  );
}
