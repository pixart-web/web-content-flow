import "server-only";

import type { PrismaClient, Project } from "@/generated/prisma/client";

const dashboardProjectSelection = {
  id: true,
  name: true,
  brandName: true,
  type: true,
  status: true,
  updatedAt: true,
} as const;

export type ProjectSummary = Pick<
  Project,
  "id" | "name" | "brandName" | "type" | "status" | "updatedAt"
>;

export function createProjectRepository(prisma: PrismaClient) {
  return {
    listOwned(userId: string, limit = 50): Promise<ProjectSummary[]> {
      return prisma.project.findMany({
        where: { userId },
        select: dashboardProjectSelection,
        orderBy: { updatedAt: "desc" },
        take: Math.min(Math.max(limit, 1), 100),
      });
    },

    findOwnedById(userId: string, projectId: string): Promise<Project | null> {
      return prisma.project.findFirst({
        where: { id: projectId, userId },
      });
    },

    owns(userId: string, projectId: string): Promise<boolean> {
      return prisma.project
        .count({ where: { id: projectId, userId } })
        .then((count) => count === 1);
    },
  };
}
