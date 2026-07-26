import { ArrowRight, FileText, Layers3, PanelTop } from "lucide-react";
import Link from "next/link";

import { ProjectCard } from "@/components/shared/project-card";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createProjectRepository } from "@/server/repositories/project-repository";

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = await createProjectRepository(getPrisma()).listOwned(
    user.id,
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-secondary text-sm">Workspace</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">
            Dashboard
          </h1>
        </div>
        <div>
          <Link
            className="bg-action-primary text-inverse rounded-control inline-flex min-h-11 items-center px-4 text-sm font-semibold"
            href="/app/projects/new"
          >
            Create project
          </Link>
        </div>
      </header>

      {projects.length === 0 ? (
        <section className="border-default bg-surface rounded-panel border p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">
            Create your first connected content project
          </h2>
          <p className="text-secondary mt-2 max-w-2xl">
            Start with a guided business brief. Web Content Flow will create a
            shared Brand Profile in clearly labelled mock mode.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Brief", icon: FileText },
              { label: "Brand Profile", icon: Layers3 },
              { label: "Modules", icon: PanelTop },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  className="border-default bg-surface-subtle rounded-card border p-4"
                  key={step.label}
                >
                  <Icon aria-hidden="true" className="text-link size-5" />
                  <p className="mt-3 text-sm font-semibold">
                    {index + 1}. {step.label}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <>
          <section aria-labelledby="continue-heading">
            <h2
              className="font-display text-xl font-semibold"
              id="continue-heading"
            >
              Continue your latest project
            </h2>
            <div className="mt-4 max-w-xl">
              <ProjectCard project={projects[0]!} />
            </div>
          </section>
          <section aria-labelledby="projects-heading">
            <div className="flex items-center justify-between gap-4">
              <h2
                className="font-display text-xl font-semibold"
                id="projects-heading"
              >
                Your projects
              </h2>
              <Link
                className="text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
                href="/app/projects"
              >
                View all <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.slice(0, 6).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
