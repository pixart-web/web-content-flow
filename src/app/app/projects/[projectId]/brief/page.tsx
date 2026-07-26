import { notFound } from "next/navigation";

import { ProjectWizard } from "@/features/projects/project-wizard";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";
import { parseStoredBrief } from "@/server/services/project-setup-service";

export default async function ProjectBriefPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser(`/app/projects/${projectId}/brief`);
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  const brief = project?.brief ? parseStoredBrief(project.brief.data) : null;
  if (!project?.brief || !brief) notFound();

  return (
    <div>
      <p className="text-secondary mb-6 text-sm">
        Changes affect future generation only. Existing Brand Profile versions
        are retained.
      </p>
      <ProjectWizard
        editMode
        initialBrief={brief}
        initialProjectId={project.id}
        initialRevision={project.brief.revision}
      />
    </div>
  );
}
