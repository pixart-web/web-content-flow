"use server";

import { revalidatePath } from "next/cache";

import type { SocialRegenerationTarget } from "@/domain/social/social-schemas";
import { requireUser } from "@/server/auth/require-user";
import {
  configureSocialModule,
  queueSocialGeneration,
  queueSocialRegeneration,
  retryFailedSocialItem,
} from "@/server/services/social-service";

export async function configureSocialAction(
  projectId: string,
  request: unknown,
) {
  const user = await requireUser(`/app/projects/${projectId}/content/social`);
  const result = await configureSocialModule({
    userId: user.id,
    projectId,
    request,
  });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/social`);
  return result;
}

export async function generateSocialAction(projectId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/social`);
  const result = await queueSocialGeneration({ userId: user.id, projectId });
  if (result.ok) {
    revalidatePath(`/app/projects/${projectId}/content/social`);
    revalidatePath(`/app/projects/${projectId}`);
  }
  return result;
}

export async function regenerateSocialAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: SocialRegenerationTarget;
}) {
  const user = await requireUser(
    `/app/projects/${input.projectId}/content/social/${input.itemId}`,
  );
  const result = await queueSocialRegeneration({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    ...(input.target ? { target: input.target } : {}),
  });
  if (result.ok)
    revalidatePath(
      `/app/projects/${input.projectId}/content/social/${input.itemId}`,
    );
  return result;
}

export async function retrySocialItemAction(projectId: string, jobId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/social`);
  const result = await retryFailedSocialItem({ userId: user.id, jobId });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/social`);
  return result;
}
