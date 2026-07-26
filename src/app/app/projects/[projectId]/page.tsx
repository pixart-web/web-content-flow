import Link from "next/link";
import { notFound } from "next/navigation";

import { GenerationStatus } from "@/features/projects/generation-status";
import { GenerateProofContent } from "@/features/content/generate-proof-content";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";
import { createContentRepository } from "@/server/repositories/content-repository";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser(`/app/projects/${projectId}`);
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const job = project.generationJobs.find(
    (candidate) => candidate.module === "BRAND_PROFILE",
  );
  const [items, contentJob] = await Promise.all([
    createContentRepository(getPrisma()).listProjectItems(
      user.id,
      projectId,
      {},
    ),
    getPrisma().generationJob.findFirst({
      where: {
        projectId,
        scopeType: "CONTENT_ITEM",
        project: { userId: user.id },
      },
      orderBy: { createdAt: "desc" },
      include: { steps: { orderBy: { ordinal: "asc" } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">Next action</h2>
        {project.currentBrandProfileVersion ? (
          <>
            <p className="text-secondary mt-2">
              Your Brand Profile is ready for review.
            </p>
            <Link
              className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
              href={`/app/projects/${projectId}/brand-profile`}
            >
              Review Brand Profile
            </Link>
          </>
        ) : job ? (
          <GenerationStatus initialJob={job} projectId={projectId} />
        ) : (
          <p className="text-secondary mt-2">
            Complete the brief to generate the Brand Profile.
          </p>
        )}
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">Content Calendar</h2>
        <p className="text-secondary mt-2 max-w-2xl text-sm">
          Organise existing content and planned placeholders into an editorial
          calendar. No external publishing or scheduling is included.
        </p>
        {project.currentBrandProfileVersion ? (
          <Link
            className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
            href={`/app/projects/${projectId}/content/calendar`}
          >
            Add or open Content Calendar
          </Link>
        ) : (
          <p className="text-secondary mt-3 text-sm">
            Generate the Brand Profile before adding Content Calendar.
          </p>
        )}
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">General Copy</h2>
        <p className="text-secondary mt-2 max-w-2xl text-sm">
          Create structured marketing, editorial, product, company and sales
          copy. Sending, publishing and external content fetching are not
          included.
        </p>
        {project.currentBrandProfileVersion ? (
          <Link
            className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
            href={`/app/projects/${projectId}/content/copy`}
          >
            Add or open General Copy
          </Link>
        ) : (
          <p className="text-secondary mt-3 text-sm">
            Generate the Brand Profile before adding General Copy.
          </p>
        )}
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">
          Video &amp; Reels
        </h2>
        <p className="text-secondary mt-2 max-w-2xl text-sm">
          Create structured scripts, shot lists, voice-over, captions and
          production direction. No video or audio rendering is included.
        </p>
        {project.currentBrandProfileVersion ? (
          <Link
            className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
            href={`/app/projects/${projectId}/content/video`}
          >
            Add or open Video &amp; Reels
          </Link>
        ) : (
          <p className="text-secondary mt-3 text-sm">
            Generate the Brand Profile before adding Video &amp; Reels.
          </p>
        )}
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">
          Ads &amp; Creative
        </h2>
        <p className="text-secondary mt-2 max-w-2xl text-sm">
          Prepare advertising copy, editorial variants, creative briefs and
          image prompt packs. Campaign publishing and performance forecasting
          are not included.
        </p>
        {project.currentBrandProfileVersion ? (
          <Link
            className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
            href={`/app/projects/${projectId}/content/ads`}
          >
            Add or open Ads &amp; Creative
          </Link>
        ) : (
          <p className="text-secondary mt-3 text-sm">
            Generate the Brand Profile before adding Ads &amp; Creative.
          </p>
        )}
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">Social content</h2>
        <p className="text-secondary mt-2 max-w-2xl text-sm">
          Prepare structured posts, carousels, stories and captions. Publishing
          and scheduling are not included.
        </p>
        {project.currentBrandProfileVersion ? (
          <Link
            className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
            href={`/app/projects/${projectId}/content/social`}
          >
            Add or open Social
          </Link>
        ) : (
          <p className="text-secondary mt-3 text-sm">
            Generate the Brand Profile before adding Social.
          </p>
        )}
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">Website content</h2>
        <p className="text-secondary mt-2 max-w-2xl text-sm">
          Create structured, editable website pages from the current Brief and
          Brand Profile. Copy only; no builder or publishing is included.
        </p>
        {project.currentBrandProfileVersion ? (
          <Link
            className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
            href={`/app/projects/${projectId}/content/website`}
          >
            Add or open Website
          </Link>
        ) : (
          <p className="text-secondary mt-3 text-sm">
            Generate the Brand Profile before adding Website.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="border-default bg-surface rounded-card border p-5">
          <h2 className="font-semibold">Brief</h2>
          <p className="text-secondary mt-2 text-sm">
            Revision {project.brief?.revision ?? 0}
          </p>
        </article>
        <article className="border-default bg-surface rounded-card border p-5">
          <h2 className="font-semibold">Brand Profile</h2>
          <p className="text-secondary mt-2 text-sm">
            {project.currentBrandProfileVersion
              ? `Version ${project.currentBrandProfileVersion.versionNumber}`
              : "Not ready"}
          </p>
        </article>
        <article className="border-default bg-surface rounded-card border p-5">
          <h2 className="font-semibold">Generation mode</h2>
          <p className="text-secondary mt-2 text-sm">Mock mode</p>
        </article>
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Shared content platform
            </h2>
            <p className="text-secondary mt-2 max-w-2xl text-sm">
              Phase 3 proof only: generate one structured foundation-copy item
              through the durable mock worker. This is not the complete Copy
              module.
            </p>
          </div>
          <Link
            className="text-link inline-flex min-h-11 items-center font-semibold"
            href={`/app/projects/${projectId}/library`}
          >
            Open Library
          </Link>
        </div>
        {contentJob &&
        !["COMPLETED", "CANCELLED"].includes(contentJob.status) ? (
          <div className="mt-5">
            <ContentJobStatus
              projectId={projectId}
              initialJob={{
                id: contentJob.id,
                status: contentJob.status,
                mode: contentJob.mode,
                attempt: contentJob.attempt,
                maxAttempts: contentJob.maxAttempts,
                safeErrorCode: contentJob.safeErrorCode,
                steps: contentJob.steps.map((step) => ({
                  key: step.key,
                  label: step.label,
                  status: step.status,
                })),
              }}
            />
          </div>
        ) : null}
        <div className="mt-5">
          {items.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.slice(0, 4).map((item) => (
                <Link
                  className="border-default hover:border-strong rounded-card border p-4"
                  href={`/app/projects/${projectId}/content/copy/${item.id}`}
                  key={item.id}
                >
                  <strong>{item.title}</strong>
                  <p className="text-secondary mt-1 text-sm">
                    Version {item.currentVersion?.versionNumber ?? "—"} · Mock
                    platform proof
                  </p>
                </Link>
              ))}
            </div>
          ) : project.currentBrandProfileVersion ? (
            <GenerateProofContent projectId={projectId} />
          ) : (
            <p className="text-secondary text-sm">
              Generate the Brand Profile before creating proof content.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
