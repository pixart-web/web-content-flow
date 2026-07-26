"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/require-user";
import {
  configureWebsiteModule,
  queueWebsiteGeneration,
  queueWebsitePageRegeneration,
  retryFailedWebsitePage,
} from "@/server/services/website-service";

export async function configureWebsiteAction(
  projectId: string,
  request: unknown,
) {
  const user = await requireUser(`/app/projects/${projectId}/content/website`);
  const result = await configureWebsiteModule({
    userId: user.id,
    projectId,
    request,
  });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/website`);
  return result;
}

export async function retryWebsitePageAction(projectId: string, jobId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/website`);
  const result = await retryFailedWebsitePage({ userId: user.id, jobId });
  if (result.ok) revalidatePath(`/app/projects/${projectId}/content/website`);
  return result;
}

export async function generateWebsiteAction(projectId: string) {
  const user = await requireUser(`/app/projects/${projectId}/content/website`);
  const result = await queueWebsiteGeneration({ userId: user.id, projectId });
  if (result.ok) {
    revalidatePath(`/app/projects/${projectId}/content/website`);
    revalidatePath(`/app/projects/${projectId}`);
  }
  return result;
}

export async function regenerateWebsitePageAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  sectionId?: string;
}) {
  const user = await requireUser(
    `/app/projects/${input.projectId}/content/website/${input.itemId}`,
  );
  const result = await queueWebsitePageRegeneration({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    ...(input.sectionId ? { sectionId: input.sectionId } : {}),
  });
  if (result.ok)
    revalidatePath(
      `/app/projects/${input.projectId}/content/website/${input.itemId}`,
    );
  return result;
}
