import "server-only";

import type {
  ContentModule,
  ContentStatus,
  PrismaClient,
} from "@/generated/prisma/client";

export function createContentRepository(prisma: PrismaClient) {
  return {
    findOwnedItem(userId: string, itemId: string) {
      return prisma.contentItem.findFirst({
        where: { id: itemId, project: { userId } },
        include: {
          currentVersion: true,
          sourceBrandProfileVersion: { select: { versionNumber: true } },
          project: { select: { id: true, name: true, userId: true } },
        },
      });
    },

    findOwnedItemInRoute(
      userId: string,
      projectId: string,
      module: ContentModule,
      itemId: string,
    ) {
      return prisma.contentItem.findFirst({
        where: { id: itemId, projectId, module, project: { userId } },
        include: {
          currentVersion: true,
          sourceBrandProfileVersion: { select: { versionNumber: true } },
          project: { select: { id: true, name: true, userId: true } },
        },
      });
    },

    findOwnedVersion(userId: string, versionId: string) {
      return prisma.contentItemVersion.findFirst({
        where: { id: versionId, contentItem: { project: { userId } } },
        include: {
          contentItem: { select: { id: true, projectId: true } },
          brandProfileVersion: { select: { versionNumber: true } },
        },
      });
    },

    listOwnedVersions(userId: string, itemId: string) {
      return prisma.contentItemVersion.findMany({
        where: { contentItemId: itemId, contentItem: { project: { userId } } },
        orderBy: { versionNumber: "desc" },
        include: {
          brandProfileVersion: { select: { versionNumber: true } },
          actorUser: { select: { name: true } },
        },
      });
    },

    listProjectItems(
      userId: string,
      projectId: string,
      filters: {
        module?: ContentModule;
        status?: ContentStatus;
        mock?: boolean;
        query?: string;
      },
    ) {
      return prisma.contentItem.findMany({
        where: {
          projectId,
          project: { userId },
          ...(filters.module ? { module: filters.module } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.query
            ? { title: { contains: filters.query, mode: "insensitive" } }
            : {}),
          ...(filters.mock !== undefined
            ? { currentVersion: { mock: filters.mock } }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          currentVersion: {
            select: {
              id: true,
              versionNumber: true,
              mock: true,
              snapshot: true,
            },
          },
          sourceBrandProfileVersion: { select: { versionNumber: true } },
          project: { select: { currentBrandProfileVersionId: true } },
          sourceJob: { select: { id: true, status: true } },
        },
      });
    },
  };
}
