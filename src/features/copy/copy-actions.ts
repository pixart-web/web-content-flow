"use server";

import { revalidatePath } from "next/cache";

import type {
  CopyRegenerationTarget,
  GeneralCopyType,
} from "@/domain/copy/copy-schemas";
import { requireUser } from "@/server/auth/require-user";
import {
  configureCopyModule,
  queueCopyGeneration,
  queueCopyRegeneration,
  queueSingleCopyAsset,
  retryFailedCopyAsset,
} from "@/server/services/copy-service";

const copyPath = (projectId: string) =>
  `/app/projects/${projectId}/content/copy`;

export async function configureCopyAction(projectId: string, request: unknown) {
  const user = await requireUser(copyPath(projectId));
  const result = await configureCopyModule({
    userId: user.id,
    projectId,
    request,
  });
  if (result.ok) revalidatePath(copyPath(projectId));
  return result;
}

export async function generateCopyAction(projectId: string) {
  const user = await requireUser(copyPath(projectId));
  const result = await queueCopyGeneration({ userId: user.id, projectId });
  if (result.ok) {
    revalidatePath(copyPath(projectId));
    revalidatePath(`/app/projects/${projectId}`);
  }
  return result;
}

export async function addCopyAssetAction(
  projectId: string,
  type: GeneralCopyType,
) {
  const user = await requireUser(copyPath(projectId));
  const result = await queueSingleCopyAsset({
    userId: user.id,
    projectId,
    contentType: type,
  });
  if (result.ok) revalidatePath(copyPath(projectId));
  return result;
}

export async function regenerateCopyAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: CopyRegenerationTarget;
}) {
  const user = await requireUser(
    `${copyPath(input.projectId)}/${input.itemId}`,
  );
  const result = await queueCopyRegeneration({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    ...(input.target ? { target: input.target } : {}),
  });
  if (result.ok) revalidatePath(`${copyPath(input.projectId)}/${input.itemId}`);
  return result;
}

export async function retryCopyAssetAction(projectId: string, jobId: string) {
  const user = await requireUser(copyPath(projectId));
  const result = await retryFailedCopyAsset({ userId: user.id, jobId });
  if (result.ok) revalidatePath(copyPath(projectId));
  return result;
}
