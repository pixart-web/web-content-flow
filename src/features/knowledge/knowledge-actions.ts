"use server";

import { revalidatePath } from "next/cache";

import { requireProjectOwner } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";
import {
  addKnowledgeDocument,
  deleteKnowledgeDocument,
  KnowledgeDocumentInputSchema,
} from "@/server/knowledge/knowledge-service";

// L6 (doc 53, B2): add and remove a project's client documents. Ownership
// is checked on every call; documents are indexed later by the worker.

export type KnowledgeFormState = { message?: string; ok?: boolean };

export async function addKnowledgeDocumentAction(
  projectId: string,
  _state: KnowledgeFormState,
  formData: FormData,
): Promise<KnowledgeFormState> {
  await requireProjectOwner(projectId);
  const parsed = KnowledgeDocumentInputSchema.safeParse({
    title: formData.get("title"),
    mediaType: formData.get("mediaType"),
    content: formData.get("content"),
  });
  if (!parsed.success)
    return {
      message: parsed.error.issues[0]?.message ?? "Check the document.",
    };
  const result = await addKnowledgeDocument(
    getPrisma(),
    projectId,
    parsed.data,
  );
  revalidatePath(`/app/projects/${projectId}/knowledge`);
  return result.duplicate
    ? { ok: true, message: "This document is already in the project." }
    : { ok: true, message: "Document added. It will be indexed shortly." };
}

export async function deleteKnowledgeDocumentAction(
  projectId: string,
  documentId: string,
): Promise<void> {
  await requireProjectOwner(projectId);
  await deleteKnowledgeDocument(getPrisma(), projectId, documentId);
  revalidatePath(`/app/projects/${projectId}/knowledge`);
}
