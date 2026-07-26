import { notFound } from "next/navigation";

import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { BrandProfileEditor } from "@/features/projects/brand-profile-editor";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export default async function BrandProfilePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser(`/app/projects/${projectId}/brand-profile`);
  const repository = createPhase2Repository(getPrisma());
  const project = await repository.findOwnedProject(user.id, projectId);
  if (!project) notFound();
  if (!project.currentBrandProfileVersion) {
    return (
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">
          Brand Profile not ready
        </h2>
        <p className="text-secondary mt-2">
          Return to Overview to monitor generation. Your brief remains
          available.
        </p>
      </section>
    );
  }
  const parsed = BrandProfileSchema.safeParse(
    project.currentBrandProfileVersion.snapshot,
  );
  if (!parsed.success) notFound();
  const versions = await repository.listVersionsOwned(user.id, projectId);

  return (
    <BrandProfileEditor
      initialProfile={parsed.data}
      projectId={projectId}
      versions={versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        source: version.source,
        createdAt: version.createdAt.toISOString(),
        current: version.id === project.currentBrandProfileVersionId,
      }))}
    />
  );
}
