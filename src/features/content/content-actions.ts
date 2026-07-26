"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/require-user";
import {
  queueContentRegeneration,
  queueFoundationCopyGeneration,
} from "@/server/services/content-generation-service";
import {
  restoreContentVersion,
  saveManualContentVersion,
} from "@/server/services/content-version-service";

export async function generateFoundationCopyAction(projectId: string) {
  const user = await requireUser(`/app/projects/${projectId}`);
  const result = await queueFoundationCopyGeneration({
    userId: user.id,
    projectId,
  });
  if (result.ok) {
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/library`);
  }
  return result;
}

export async function saveContentAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  snapshot: unknown;
}) {
  const user = await requireUser(
    `/app/projects/${input.projectId}/content/copy/${input.itemId}`,
  );
  const result = await saveManualContentVersion({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    snapshot: input.snapshot,
  });
  if (result.ok) {
    revalidatePath(
      `/app/projects/${input.projectId}/content/copy/${input.itemId}`,
    );
    revalidatePath(`/app/projects/${input.projectId}/library`);
  }
  return result;
}

export async function regenerateContentAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
}) {
  const user = await requireUser(
    `/app/projects/${input.projectId}/content/copy/${input.itemId}`,
  );
  const result = await queueContentRegeneration({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
  });
  if (result.ok) {
    revalidatePath(
      `/app/projects/${input.projectId}/content/copy/${input.itemId}`,
    );
  }
  return result;
}

export async function restoreContentAction(input: {
  projectId: string;
  itemId: string;
  versionId: string;
  expectedCurrentVersionId: string;
}) {
  const user = await requireUser(
    `/app/projects/${input.projectId}/content/copy/${input.itemId}`,
  );
  const result = await restoreContentVersion({
    userId: user.id,
    itemId: input.itemId,
    versionId: input.versionId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
  });
  if (result.ok) {
    revalidatePath(
      `/app/projects/${input.projectId}/content/copy/${input.itemId}`,
    );
    revalidatePath(`/app/projects/${input.projectId}/library`);
  }
  return result;
}
