"use server";

import { revalidatePath } from "next/cache";

import type { AdsRegenerationTarget } from "@/domain/ads/ads-schemas";
import { requireUser } from "@/server/auth/require-user";
import {
  configureAdsModule,
  queueAdsGeneration,
  queueAdsRegeneration,
  retryFailedAdsAsset,
} from "@/server/services/ads-service";

export async function configureAdsAction(projectId: string, request: unknown) {
  const user = await requireUser(`/app/projects/${projectId}/content/ads`);
  const result = await configureAdsModule({
    userId: user.id,
    projectId,
    request,
  });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/ads`);
  return result;
}

export async function generateAdsAction(projectId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/ads`);
  const result = await queueAdsGeneration({ userId: user.id, projectId });
  if (result.ok) {
    revalidatePath(`/app/projects/${projectId}/content/ads`);
    revalidatePath(`/app/projects/${projectId}`);
  }
  return result;
}

export async function regenerateAdsAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: AdsRegenerationTarget;
}) {
  const user = await requireUser(
    `/app/projects/${input.projectId}/content/ads/${input.itemId}`,
  );
  const result = await queueAdsRegeneration({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    ...(input.target ? { target: input.target } : {}),
  });
  if (result.ok)
    revalidatePath(
      `/app/projects/${input.projectId}/content/ads/${input.itemId}`,
    );
  return result;
}

export async function retryAdsAssetAction(projectId: string, jobId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/ads`);
  const result = await retryFailedAdsAsset({ userId: user.id, jobId });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/ads`);
  return result;
}
