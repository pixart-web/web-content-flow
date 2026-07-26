"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/require-user";
import {
  createDraftProject,
  finalizeProject,
  queueProfileRegeneration,
  saveBriefSection,
} from "@/server/services/project-setup-service";
import {
  restoreProfileVersion,
  saveManualProfile,
} from "@/server/services/brand-profile-service";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

export async function createDraftAction() {
  const user = await requireUser("/app/projects/new");
  return createDraftProject(user.id);
}

export async function saveBriefStepAction(input: {
  projectId: string;
  revision: number;
  section:
    "project" | "audience" | "objective" | "direction" | "languageModules";
  value: unknown;
}) {
  const user = await requireUser(`/app/projects/new?draft=${input.projectId}`);
  const result = await saveBriefSection({ ...input, userId: user.id });
  if (result.ok) {
    revalidatePath("/app");
    revalidatePath("/app/projects");
  }
  return result;
}

export async function finalizeProjectAction(input: {
  projectId: string;
  scenario?: "success" | "provider-failure" | "invalid-output" | "timeout";
}) {
  const user = await requireUser(`/app/projects/new?draft=${input.projectId}`);
  const result = await finalizeProject({ ...input, userId: user.id });
  if (result.ok) {
    revalidatePath(`/app/projects/${input.projectId}`);
  }
  return result;
}

export async function retryProfileJobAction(projectId: string) {
  const user = await requireUser(`/app/projects/${projectId}`);
  const owned = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  const job = owned?.generationJobs[0];
  if (!job || job.status !== "FAILED" || job.attempt >= job.maxAttempts) {
    return { ok: false as const, error: "This job cannot be retried." };
  }
  await getPrisma().generationJob.update({
    where: { id: job.id },
    data: {
      status: "QUEUED",
      availableAt: new Date(),
      completedAt: null,
      safeErrorCode: null,
      safeErrorDetails: {},
      steps: {
        updateMany: {
          where: {},
          data: {
            status: "PENDING",
            startedAt: null,
            completedAt: null,
            safeErrorCode: null,
          },
        },
      },
    },
  });
  revalidatePath(`/app/projects/${projectId}`);
  return { ok: true as const };
}

export async function regenerateProfileAction(projectId: string) {
  const user = await requireUser(`/app/projects/${projectId}/brand-profile`);
  const result = await queueProfileRegeneration({
    userId: user.id,
    projectId,
  });
  if (result.ok) {
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/brand-profile`);
  }
  return result;
}

export async function saveProfileAction(projectId: string, snapshot: unknown) {
  const user = await requireUser(`/app/projects/${projectId}/brand-profile`);
  const result = await saveManualProfile({
    userId: user.id,
    projectId,
    snapshot,
  });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/brand-profile`);
  return result;
}

export async function restoreProfileAction(
  projectId: string,
  versionId: string,
) {
  const user = await requireUser(`/app/projects/${projectId}/brand-profile`);
  const result = await restoreProfileVersion({
    userId: user.id,
    projectId,
    versionId,
  });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/brand-profile`);
  return result;
}
