import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { ProjectSummary } from "@/server/repositories/project-repository";

function formatStatus(status: ProjectSummary["status"]): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="border-default bg-surface hover:border-strong rounded-card border p-5 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display truncate text-lg font-semibold">
            {project.name}
          </h3>
          <p className="text-secondary mt-1 truncate text-sm">
            {project.brandName}
          </p>
        </div>
        <span className="border-default bg-surface-subtle rounded-pill border px-2.5 py-1 text-xs font-semibold">
          {formatStatus(project.status)}
        </span>
      </div>
      <dl className="text-secondary mt-5 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Type</dt>
          <dd className="text-primary text-right font-medium">
            {project.type}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Last updated</dt>
          <dd className="text-primary text-right font-medium">
            {new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
            }).format(project.updatedAt)}
          </dd>
        </div>
      </dl>
      <Link
        className="text-link mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
        href={
          project.status === "DRAFT"
            ? `/app/projects/new?draft=${project.id}`
            : `/app/projects/${project.id}`
        }
      >
        {project.status === "DRAFT" ? "Continue brief" : "Open project"}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </article>
  );
}
