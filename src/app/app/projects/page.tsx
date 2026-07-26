import { ProjectCard } from "@/components/shared/project-card";
import Link from "next/link";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createProjectRepository } from "@/server/repositories/project-repository";

export default async function ProjectsPage() {
  const user = await requireUser("/app/projects");
  const projects = await createProjectRepository(getPrisma()).listOwned(
    user.id,
  );

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-secondary text-sm">Workspace</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">Projects</h1>
          <p className="text-secondary mt-2">
            Projects available to your account.
          </p>
        </div>
        <Link
          className="bg-action-primary text-inverse rounded-control inline-flex min-h-11 items-center px-4 text-sm font-semibold"
          href="/app/projects/new"
        >
          Create project
        </Link>
      </header>
      {projects.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <section className="border-default bg-surface rounded-panel mt-8 border p-6">
          <h2 className="font-display text-xl font-semibold">
            No projects yet
          </h2>
          <p className="text-secondary mt-2">
            Create a project to begin the guided brief.
          </p>
        </section>
      )}
    </div>
  );
}
