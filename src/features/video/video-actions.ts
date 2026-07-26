"use server";

import { revalidatePath } from "next/cache";

import type { VideoRegenerationTarget } from "@/domain/video/video-schemas";
import { requireUser } from "@/server/auth/require-user";
import {
  configureVideoModule,
  queueVideoGeneration,
  queueVideoRegeneration,
  retryFailedVideoAsset,
} from "@/server/services/video-service";

export async function configureVideoAction(
  projectId: string,
  request: unknown,
) {
  const user = await requireUser(`/app/projects/${projectId}/content/video`);
  const result = await configureVideoModule({
    userId: user.id,
    projectId,
    request,
  });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/video`);
  return result;
}

export async function generateVideoAction(projectId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/video`);
  const result = await queueVideoGeneration({ userId: user.id, projectId });
  if (result.ok) {
    revalidatePath(`/app/projects/${projectId}/content/video`);
    revalidatePath(`/app/projects/${projectId}`);
  }
  return result;
}

export async function regenerateVideoAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: VideoRegenerationTarget;
}) {
  const user = await requireUser(
    `/app/projects/${input.projectId}/content/video/${input.itemId}`,
  );
  const result = await queueVideoRegeneration({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    ...(input.target ? { target: input.target } : {}),
  });
  if (result.ok)
    revalidatePath(
      `/app/projects/${input.projectId}/content/video/${input.itemId}`,
    );
  return result;
}

export async function retryVideoAssetAction(projectId: string, jobId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/video`);
  const result = await retryFailedVideoAsset({ userId: user.id, jobId });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/video`);
  return result;
}
