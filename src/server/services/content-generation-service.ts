import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

type GenerationError = {
  code: "NOT_FOUND" | "CONFLICT" | "INTERNAL";
  message: string;
};

const steps = [
  ["prepare", "Preparing project and Brand Profile"],
  ["generate", "Generating foundation copy"],
  ["validate", "Validating structured content"],
  ["save", "Saving content version"],
] as const;

export async function queueFoundationCopyGeneration(input: {
  userId: string;
  projectId: string;
  scenario?: "success" | "provider-failure" | "invalid-output" | "timeout";
}): Promise<Result<{ jobId: string }, GenerationError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  if (!project?.brief || !project.currentBrandProfileVersionId) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Complete the Brand Profile before generating content.",
      },
    };
  }
  const idempotencyKey = `foundation-copy:${project.currentBrandProfileVersionId}`;
  const existing = await prisma.generationJob.findUnique({
    where: {
      projectId_idempotencyKey: {
        projectId: project.id,
        idempotencyKey,
      },
    },
  });
  if (existing) return { ok: true, value: { jobId: existing.id } };
  try {
    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "CONTENT_ITEM",
        scopeId: project.id,
        module: "COPY",
        status: "QUEUED",
        ...getNewJobGenerationConfiguration({
          promptKey: "copy.foundation_copy.generation",
          ...(project.brief ? { briefRevision: project.brief.revision } : {}),
          purpose: "ITEM_GENERATION",
        }),
        idempotencyKey,
        request: {
          kind: "NEW_ITEM",
          projectId: project.id,
          contentType: "FOUNDATION_COPY",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          promptVersion: "foundation-copy-1.0",
          schemaVersion: "1.0",
          scenario: input.scenario ?? "success",
        } as Prisma.InputJsonValue,
        steps: {
          create: steps.map(([key, label], ordinal) => ({
            key,
            label,
            ordinal,
          })),
        },
      },
    });
    return { ok: true, value: { jobId: job.id } };
  } catch {
    const existingAfterConflict = await prisma.generationJob.findUnique({
      where: {
        projectId_idempotencyKey: {
          projectId: project.id,
          idempotencyKey,
        },
      },
    });
    return existingAfterConflict
      ? { ok: true, value: { jobId: existingAfterConflict.id } }
      : {
          ok: false,
          error: {
            code: "INTERNAL",
            message: "Content generation could not be queued.",
          },
        };
  }
}

export async function queueContentRegeneration(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  scenario?: "success" | "provider-failure" | "invalid-output" | "timeout";
}): Promise<Result<{ jobId: string }, GenerationError>> {
  const prisma = getPrisma();
  const item = await createContentRepository(prisma).findOwnedItem(
    input.userId,
    input.itemId,
  );
  if (
    !item?.currentVersion ||
    item.currentVersionId !== input.expectedCurrentVersionId
  ) {
    return {
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Reload the latest version before regenerating.",
      },
    };
  }
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    item.projectId,
  );
  if (!project?.currentBrandProfileVersionId) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Brand Profile is not available." },
    };
  }
  const idempotencyKey = `content-regenerate:${item.id}:${item.currentVersionId}:${project.currentBrandProfileVersionId}`;
  const existing = await prisma.generationJob.findUnique({
    where: {
      projectId_idempotencyKey: {
        projectId: item.projectId,
        idempotencyKey,
      },
    },
  });
  if (existing) return { ok: true, value: { jobId: existing.id } };
  try {
    const job = await prisma.generationJob.create({
      data: {
        projectId: item.projectId,
        scopeType: "CONTENT_ITEM",
        scopeId: item.id,
        module: "COPY",
        status: "QUEUED",
        ...getNewJobGenerationConfiguration({
          promptKey: "copy.foundation_copy.generation",
          ...(project.brief ? { briefRevision: project.brief.revision } : {}),
          purpose: "WHOLE_ITEM_REGENERATION",
        }),
        idempotencyKey,
        request: {
          kind: "REGENERATE",
          projectId: item.projectId,
          itemId: item.id,
          expectedCurrentVersionId: item.currentVersionId,
          contentType: item.type,
          brandProfileVersionId: project.currentBrandProfileVersionId,
          promptVersion: "foundation-copy-1.0",
          schemaVersion: "1.0",
          scenario: input.scenario ?? "success",
          requestNonce: randomUUID(),
        } as Prisma.InputJsonValue,
        steps: {
          create: steps.map(([key, label], ordinal) => ({
            key,
            label,
            ordinal,
          })),
        },
      },
    });
    return { ok: true, value: { jobId: job.id } };
  } catch {
    const afterConflict = await prisma.generationJob.findUnique({
      where: {
        projectId_idempotencyKey: {
          projectId: item.projectId,
          idempotencyKey,
        },
      },
    });
    return afterConflict
      ? { ok: true, value: { jobId: afterConflict.id } }
      : {
          ok: false,
          error: {
            code: "INTERNAL",
            message: "Regeneration could not be queued.",
          },
        };
  }
}
