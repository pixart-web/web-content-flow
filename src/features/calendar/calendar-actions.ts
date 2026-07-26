"use server";

import { revalidatePath } from "next/cache";

import type { CalendarRegenerationTarget } from "@/domain/calendar/calendar-schemas";
import { requireUser } from "@/server/auth/require-user";
import {
  configureCalendarModule,
  queueCalendarGeneration,
  queueCalendarRegeneration,
  retryCalendarScope,
  saveCalendarVersion,
} from "@/server/services/calendar-service";

const path = (projectId: string) =>
  `/app/projects/${projectId}/content/calendar`;

export async function configureCalendarAction(
  projectId: string,
  request: unknown,
) {
  const user = await requireUser(path(projectId));
  const result = await configureCalendarModule({
    userId: user.id,
    projectId,
    request,
  });
  if (result.ok) revalidatePath(path(projectId));
  return result;
}
export async function generateCalendarAction(projectId: string) {
  const user = await requireUser(path(projectId));
  const result = await queueCalendarGeneration({
    userId: user.id,
    projectId,
  });
  if (result.ok) {
    revalidatePath(path(projectId));
    revalidatePath(`/app/projects/${projectId}`);
  }
  return result;
}
export async function regenerateCalendarAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  target?: CalendarRegenerationTarget;
}) {
  const user = await requireUser(`${path(input.projectId)}/${input.itemId}`);
  const result = await queueCalendarRegeneration({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    ...(input.target ? { target: input.target } : {}),
  });
  if (result.ok) revalidatePath(`${path(input.projectId)}/${input.itemId}`);
  return result;
}
export async function retryCalendarScopeAction(
  projectId: string,
  jobId: string,
) {
  const user = await requireUser(path(projectId));
  const result = await retryCalendarScope({ userId: user.id, jobId });
  if (result.ok) revalidatePath(path(projectId));
  return result;
}
export async function saveCalendarAction(input: {
  projectId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  snapshot: unknown;
}) {
  const user = await requireUser(`${path(input.projectId)}/${input.itemId}`);
  const result = await saveCalendarVersion({
    userId: user.id,
    itemId: input.itemId,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    snapshot: input.snapshot,
  });
  if (result.ok) {
    revalidatePath(`${path(input.projectId)}/${input.itemId}`);
    revalidatePath(`/app/projects/${input.projectId}/library`);
  }
  return result;
}
