import { notFound } from "next/navigation";

import { ProjectWizard } from "@/features/projects/project-wizard";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";
import { emptyProjectBrief } from "@/domain/brief/brief-schema";
import { parseStoredBrief } from "@/server/services/project-setup-service";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const user = await requireUser("/app/projects/new");
  const { draft } = await searchParams;
  if (!draft) {
    return <ProjectWizard initialBrief={emptyProjectBrief} />;
  }
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    draft,
  );
  const parsedBrief = project?.brief
    ? parseStoredBrief(project.brief.data)
    : null;
  if (!project?.brief || project.status !== "DRAFT" || !parsedBrief) notFound();
  return (
    <ProjectWizard
      initialBrief={parsedBrief}
      initialProjectId={project.id}
      initialRevision={project.brief.revision}
    />
  );
}
