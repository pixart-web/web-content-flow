import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  BRIEF_SCHEMA_VERSION,
  AudienceSectionSchema,
  DirectionSectionSchema,
  emptyProjectBrief,
  LanguageModulesSectionSchema,
  ObjectiveSectionSchema,
  ProjectSectionSchema,
  ProjectBriefDraftSchema,
  ProjectBriefSchema,
  type ProjectBrief,
} from "@/domain/brief/brief-schema";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { getNewJobGenerationConfiguration } from "@/server/ai/job-configuration";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";
import { resolvePlanPolicy } from "@/server/plans/plan-policy";

type SetupError = {
  code: "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INTERNAL";
  message: string;
};

export async function createDraftProject(
  userId: string,
): Promise<Result<{ projectId: string; revision: number }, SetupError>> {
  try {
    const account = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { plan: true, _count: { select: { projects: true } } },
    });
    const policy = account ? resolvePlanPolicy(account.plan) : null;
    if (!account || !policy || account._count.projects >= policy.projectLimit)
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Your current plan has reached its project limit.",
        },
      };
    const project = await createPhase2Repository(getPrisma()).createDraft(
      userId,
      emptyProjectBrief as unknown as Prisma.InputJsonValue,
      BRIEF_SCHEMA_VERSION,
    );
    return {
      ok: true,
      value: { projectId: project.id, revision: project.brief!.revision },
    };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "The draft could not be created." },
    };
  }
}

export async function saveBriefSection(input: {
  userId: string;
  projectId: string;
  revision: number;
  section:
    "project" | "audience" | "objective" | "direction" | "languageModules";
  value: unknown;
}): Promise<Result<{ revision: number }, SetupError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  if (!project?.brief || project.status === "ARCHIVED") {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This draft is not available." },
    };
  }

  const sectionSchemas = {
    project: ProjectSectionSchema,
    audience: AudienceSectionSchema,
    objective: ObjectiveSectionSchema,
    direction: DirectionSectionSchema,
    languageModules: LanguageModulesSectionSchema,
  } as const;
  const sectionParsed = sectionSchemas[input.section].safeParse(input.value);
  if (!sectionParsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: sectionParsed.error.issues[0]?.message ?? "Check the fields.",
      },
    };
  }
  const candidate = {
    ...(project.brief.data as object),
    [input.section]: sectionParsed.data,
  };

  const updated = await prisma.projectBrief.updateMany({
    where: {
      id: project.brief.id,
      revision: input.revision,
      project: { userId: input.userId },
    },
    data: {
      data: candidate as Prisma.InputJsonValue,
      revision: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    return {
      ok: false,
      error: {
        code: "CONFLICT",
        message: "This brief changed elsewhere. Reload before saving again.",
      },
    };
  }
  if (input.section === "project") {
    const projectSection = ProjectSectionSchema.parse(input.value);
    await prisma.project.update({
      where: { id: input.projectId, userId: input.userId },
      data: {
        name: projectSection.projectName,
        brandName: projectSection.brandName,
        type: projectSection.projectType,
      },
    });
  }
  return { ok: true, value: { revision: input.revision + 1 } };
}

const jobSteps = [
  ["prepare", "Preparing project context"],
  ["generate", "Generating Brand Profile"],
  ["validate", "Validating profile"],
  ["save", "Saving profile"],
] as const;

export async function finalizeProject(input: {
  userId: string;
  projectId: string;
  scenario?: "success" | "provider-failure" | "invalid-output" | "timeout";
}): Promise<Result<{ projectId: string; jobId: string }, SetupError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  if (!project?.brief) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This draft is not available." },
    };
  }
  const parsed = ProjectBriefSchema.safeParse(project.brief.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message:
          "Complete the required brief fields before creating the project.",
      },
    };
  }
  const idempotencyKey = `brand-profile:${project.brief.revision}`;
  const existing = await prisma.generationJob.findUnique({
    where: {
      projectId_idempotencyKey: { projectId: project.id, idempotencyKey },
    },
  });
  if (existing) {
    return {
      ok: true,
      value: { projectId: project.id, jobId: existing.id },
    };
  }

  try {
    const job = await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: {
          name: parsed.data.project.projectName,
          brandName: parsed.data.project.brandName,
          type: parsed.data.project.projectType,
          outputLanguage: parsed.data.languageModules.outputLanguage,
          status: "ACTIVE",
          brandProfile: {
            upsert: { create: {}, update: {} },
          },
        },
      });
      await tx.user.update({
        where: { id: input.userId },
        data: { onboardingStep: 8, onboardingCompletedAt: new Date() },
      });
      return tx.generationJob.create({
        data: {
          projectId: project.id,
          scopeType: "BRAND_PROFILE",
          scopeId: project.id,
          module: "BRAND_PROFILE",
          status: "QUEUED",
          ...getNewJobGenerationConfiguration({
            promptKey: "brand_profile.brand_profile.generation",
            briefRevision: project.brief!.revision,
            purpose: "ITEM_GENERATION",
          }),
          idempotencyKey,
          request: {
            briefRevision: project.brief!.revision,
            briefSnapshot: parsed.data,
            scenario: input.scenario ?? "success",
          } as Prisma.InputJsonValue,
          steps: {
            create: jobSteps.map(([key, label], ordinal) => ({
              key,
              label,
              ordinal,
            })),
          },
        },
      });
    });
    return { ok: true, value: { projectId: project.id, jobId: job.id } };
  } catch {
    const job = await prisma.generationJob.findUnique({
      where: {
        projectId_idempotencyKey: { projectId: project.id, idempotencyKey },
      },
    });
    return job
      ? { ok: true, value: { projectId: project.id, jobId: job.id } }
      : {
          ok: false,
          error: {
            code: "INTERNAL",
            message: "Project creation could not finish.",
          },
        };
  }
}

export async function queueProfileRegeneration(input: {
  userId: string;
  projectId: string;
}): Promise<Result<{ jobId: string }, SetupError>> {
  const prisma = getPrisma();
  const project = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  if (!project?.brief || !project.currentBrandProfileVersion) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "The Brand Profile cannot be regenerated yet.",
      },
    };
  }
  const brief = ProjectBriefSchema.safeParse(project.brief.data);
  if (!brief.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Complete the required brief fields before regenerating.",
      },
    };
  }
  try {
    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "BRAND_PROFILE",
        scopeId: project.id,
        module: "BRAND_PROFILE",
        status: "QUEUED",
        ...getNewJobGenerationConfiguration({
          promptKey: "brand_profile.brand_profile.generation",
          briefRevision: project.brief.revision,
          purpose: "WHOLE_ITEM_REGENERATION",
        }),
        idempotencyKey: `brand-profile-regenerate:${randomUUID()}`,
        request: {
          briefRevision: project.brief.revision,
          briefSnapshot: brief.data,
          scenario: "success",
        } as Prisma.InputJsonValue,
        steps: {
          create: jobSteps.map(([key, label], ordinal) => ({
            key,
            label,
            ordinal,
          })),
        },
      },
    });
    return { ok: true, value: { jobId: job.id } };
  } catch {
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Regeneration could not be queued.",
      },
    };
  }
}

export function parseStoredBrief(value: unknown): ProjectBrief | null {
  const parsed = ProjectBriefDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
