import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import { parseRegisteredContentSnapshot } from "@/domain/content/content-registry";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";

type ContentError = {
  code: "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INTERNAL";
  message: string;
};

export async function createContentVersion(
  prisma: PrismaClient,
  input: {
    itemId: string;
    expectedCurrentVersionId: string;
    snapshot: unknown;
    source: "MANUAL_EDIT" | "REGENERATED" | "RESTORED";
    brandProfileVersionId: string;
    provenance: unknown;
    actorUserId?: string;
    sourceJobId?: string;
    mock: boolean;
  },
): Promise<Result<{ id: string; versionNumber: number }, ContentError>> {
  const itemDefinition = await prisma.contentItem.findUnique({
    where: { id: input.itemId },
    select: { module: true, type: true },
  });
  const snapshot = itemDefinition
    ? parseRegisteredContentSnapshot(
        itemDefinition.module,
        itemDefinition.type,
        input.snapshot,
      )
    : { success: false as const };
  const provenance = ContentProvenanceSchema.safeParse(input.provenance);
  if (!snapshot.success || !provenance.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Check the content fields." },
    };
  }
  try {
    const version = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.itemId}))`;
      const item = await tx.contentItem.findUnique({
        where: { id: input.itemId },
        select: { currentVersionId: true },
      });
      if (!item || item.currentVersionId !== input.expectedCurrentVersionId) {
        throw new Error("VERSION_CONFLICT");
      }
      const latest = await tx.contentItemVersion.aggregate({
        where: { contentItemId: input.itemId },
        _max: { versionNumber: true },
      });
      const created = await tx.contentItemVersion.create({
        data: {
          contentItemId: input.itemId,
          versionNumber: (latest._max.versionNumber ?? 0) + 1,
          schemaVersion: snapshot.data.schemaVersion,
          snapshot: snapshot.data as unknown as Prisma.InputJsonValue,
          source: input.source,
          brandProfileVersionId: input.brandProfileVersionId,
          provenance: provenance.data as unknown as Prisma.InputJsonValue,
          mock: input.mock,
          ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
          ...(input.sourceJobId ? { sourceJobId: input.sourceJobId } : {}),
        },
      });
      await tx.contentItem.update({
        where: { id: input.itemId },
        data: {
          currentVersionId: created.id,
          title: snapshot.title,
          sourceBrandProfileVersionId: input.brandProfileVersionId,
        },
      });
      return created;
    });
    return {
      ok: true,
      value: { id: version.id, versionNumber: version.versionNumber },
    };
  } catch (error: unknown) {
    return error instanceof Error && error.message === "VERSION_CONFLICT"
      ? {
          ok: false,
          error: {
            code: "CONFLICT",
            message:
              "This item has a newer version. Reload it before saving again.",
          },
        }
      : {
          ok: false,
          error: {
            code: "INTERNAL",
            message:
              "This version wasn’t created. Current content is unchanged.",
          },
        };
  }
}

export async function saveManualContentVersion(input: {
  userId: string;
  itemId: string;
  expectedCurrentVersionId: string;
  snapshot: unknown;
}): Promise<Result<{ id: string; versionNumber: number }, ContentError>> {
  const prisma = getPrisma();
  const item = await createContentRepository(prisma).findOwnedItem(
    input.userId,
    input.itemId,
  );
  if (!item?.currentVersion) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This content is not available." },
    };
  }
  const parsed = parseRegisteredContentSnapshot(
    item.module,
    item.type,
    input.snapshot,
  );
  const currentProvenance = ContentProvenanceSchema.safeParse(
    item.currentVersion.provenance,
  );
  if (!parsed.success || !currentProvenance.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Check the content fields." },
    };
  }
  return createContentVersion(prisma, {
    itemId: item.id,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    snapshot: parsed.data,
    source: "MANUAL_EDIT",
    brandProfileVersionId: item.currentVersion.brandProfileVersionId,
    provenance: {
      ...currentProvenance.data,
      generatedAt: new Date().toISOString(),
    },
    actorUserId: input.userId,
    mock: item.currentVersion.mock,
  });
}

export async function restoreContentVersion(input: {
  userId: string;
  itemId: string;
  versionId: string;
  expectedCurrentVersionId: string;
}): Promise<Result<{ id: string; versionNumber: number }, ContentError>> {
  const prisma = getPrisma();
  const [item, version] = await Promise.all([
    createContentRepository(prisma).findOwnedItem(input.userId, input.itemId),
    createContentRepository(prisma).findOwnedVersion(
      input.userId,
      input.versionId,
    ),
  ]);
  if (!item?.currentVersion || !version || version.contentItemId !== item.id) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This version is not available." },
    };
  }
  const snapshot = parseRegisteredContentSnapshot(
    item.module,
    item.type,
    version.snapshot,
  );
  const provenance = ContentProvenanceSchema.safeParse(version.provenance);
  if (!snapshot.success || !provenance.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "This version cannot be restored.",
      },
    };
  }
  return createContentVersion(prisma, {
    itemId: item.id,
    expectedCurrentVersionId: input.expectedCurrentVersionId,
    snapshot: snapshot.data,
    source: "RESTORED",
    brandProfileVersionId: version.brandProfileVersionId,
    provenance: { ...provenance.data, generatedAt: new Date().toISOString() },
    actorUserId: input.userId,
    mock: version.mock,
  });
}
