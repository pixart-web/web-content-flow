import {
  CalendarDays,
  Clapperboard,
  Globe2,
  Megaphone,
  PenLine,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GenerationStatus } from "@/features/projects/generation-status";
import { GenerateProofContent } from "@/features/content/generate-proof-content";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { aiStatusLabel, serverAiStatus } from "@/features/studio/studio-data";
import styles from "@/features/studio/studio.module.css";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";
import { createContentRepository } from "@/server/repositories/content-repository";

// The six content modules as creation tiles (doc 55, S4). Each keeps the
// boundary statement of what the module does not do.
const PROJECT_MODULES = [
  {
    module: "WEBSITE",
    label: "Website",
    icon: Globe2,
    path: "content/website",
    description:
      "Structured, editable website pages from the Brief and Brand Profile. Copy only; no builder or publishing is included.",
  },
  {
    module: "SOCIAL",
    label: "Social",
    icon: Share2,
    path: "content/social",
    description:
      "Structured posts, carousels, stories and captions. Publishing and scheduling are not included.",
  },
  {
    module: "ADS",
    label: "Ads & Creative",
    icon: Megaphone,
    path: "content/ads",
    description:
      "Advertising copy, editorial variants, creative briefs and image prompt packs. Campaign publishing and performance forecasting are not included.",
  },
  {
    module: "VIDEO",
    label: "Video & Reels",
    icon: Clapperboard,
    path: "content/video",
    description:
      "Scripts, shot lists, voice-over, captions and production direction. No video or audio rendering is included.",
  },
  {
    module: "COPY",
    label: "General Copy",
    icon: PenLine,
    path: "content/copy",
    description:
      "Marketing, editorial, product, company and sales copy. Sending, publishing and external content fetching are not included.",
  },
  {
    module: "CALENDAR",
    label: "Content Calendar",
    icon: CalendarDays,
    path: "content/calendar",
    description:
      "Existing content and planned placeholders in an editorial calendar. No external publishing or scheduling is included.",
  },
] as const;

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
  const [items, contentJob, moduleCounts] = await Promise.all([
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
    getPrisma().contentItem.groupBy({
      by: ["module"],
      where: { projectId, project: { userId: user.id } },
      _count: { _all: true },
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
      <section aria-labelledby="project-modules" className={styles.home}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle} id="project-modules">
            Create in this project
          </h2>
          <span className={styles.sectionMeta}>
            Content only: nothing is published or sent from here
          </span>
        </div>
        <ul className={styles.moduleTiles}>
          {PROJECT_MODULES.map((entry) => {
            const Icon = entry.icon;
            const count =
              moduleCounts.find((row) => row.module === entry.module)?._count
                ._all ?? 0;
            return (
              <li key={entry.module}>
                <article className={styles.moduleTile}>
                  <div className={styles.moduleTileHead}>
                    <span className={styles.tileIcon}>
                      <Icon aria-hidden size={20} />
                    </span>
                    <h3 className={styles.tileLabel}>{entry.label}</h3>
                    <span className={styles.moduleCount}>
                      {count} {count === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <p className={styles.moduleText}>{entry.description}</p>
                  {project.currentBrandProfileVersion ? (
                    <Link
                      className={styles.moduleAction}
                      href={`/app/projects/${projectId}/${entry.path}`}
                    >
                      Add or open {entry.label}
                    </Link>
                  ) : (
                    <p className={styles.moduleBlocked}>
                      Generate the Brand Profile before adding {entry.label}.
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
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
          <p className="text-secondary mt-2 text-sm">
            {aiStatusLabel(serverAiStatus())}
          </p>
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
                  // Each item opens in its own module's editor.
                  href={`/app/projects/${projectId}/content/${item.module.toLowerCase()}/${item.id}`}
                  key={item.id}
                >
                  <strong>{item.title}</strong>
                  <p className="text-secondary mt-1 text-sm">
                    {PROJECT_MODULES.find(
                      (entry) => entry.module === item.module,
                    )?.label ?? item.module}{" "}
                    · Version {item.currentVersion?.versionNumber ?? "—"}
                    {item.currentVersion?.mock ? " · Mock" : ""}
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
