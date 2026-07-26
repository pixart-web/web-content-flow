import "server-only";

import { notFound } from "next/navigation";

import type { Project } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { createProjectRepository } from "@/server/repositories/project-repository";
import { createContentRepository } from "@/server/repositories/content-repository";

import { requireUser } from "./require-user";

export async function requireProjectOwner(
  projectId: string,
): Promise<{ userId: string; project: Project }> {
  const user = await requireUser(`/app/projects/${projectId}`);
  const project = await createProjectRepository(getPrisma()).findOwnedById(
    user.id,
    projectId,
  );

  if (!project) notFound();
  return { userId: user.id, project };
}

export async function requireContentItemOwner(itemId: string) {
  const user = await requireUser("/app");
  const item = await createContentRepository(getPrisma()).findOwnedItem(
    user.id,
    itemId,
  );
  if (!item) notFound();
  return { userId: user.id, item };
}

export async function requireContentItemVersionOwner(versionId: string) {
  const user = await requireUser("/app");
  const version = await createContentRepository(getPrisma()).findOwnedVersion(
    user.id,
    versionId,
  );
  if (!version) notFound();
  return { userId: user.id, version };
}
