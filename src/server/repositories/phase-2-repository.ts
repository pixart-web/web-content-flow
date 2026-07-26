import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export function createPhase2Repository(prisma: PrismaClient) {
  return {
    findOwnedProject(userId: string, projectId: string) {
      return prisma.project.findFirst({
        where: { id: projectId, userId },
        include: {
          brief: true,
          brandProfile: true,
          currentBrandProfileVersion: true,
          generationJobs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { steps: { orderBy: { ordinal: "asc" } } },
          },
        },
      });
    },

    createDraft(
      userId: string,
      data: Prisma.InputJsonValue,
      schemaVersion: string,
    ) {
      return prisma.project.create({
        data: {
          userId,
          name: "Untitled project",
          brandName: "Untitled brand",
          type: "Other",
          status: "DRAFT",
          outputLanguage: "English",
          brief: {
            create: { data, schemaVersion, revision: 1 },
          },
        },
        include: { brief: true },
      });
    },

    listVersionsOwned(userId: string, projectId: string) {
      return prisma.brandProfileVersion.findMany({
        where: { brandProfile: { project: { id: projectId, userId } } },
        orderBy: { versionNumber: "desc" },
      });
    },

    findVersionOwned(userId: string, projectId: string, versionId: string) {
      return prisma.brandProfileVersion.findFirst({
        where: {
          id: versionId,
          brandProfile: { project: { id: projectId, userId } },
        },
      });
    },

    findJobOwned(userId: string, projectId: string, jobId: string) {
      return prisma.generationJob.findFirst({
        where: { id: jobId, project: { id: projectId, userId } },
        include: { steps: { orderBy: { ordinal: "asc" } } },
      });
    },
  };
}
