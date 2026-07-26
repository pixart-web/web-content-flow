import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  BrandProfileSchema,
  type BrandProfile,
} from "@/domain/brand-profile/brand-profile-schema";
import type { Result } from "@/lib/result/result";
import { getPrisma } from "@/server/db/prisma";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";

type ProfileError = {
  code: "NOT_FOUND" | "VALIDATION" | "INTERNAL";
  message: string;
};

export async function createProfileVersion(
  prisma: PrismaClient,
  input: {
    projectId: string;
    snapshot: BrandProfile;
    source: "GENERATED" | "MANUAL_EDIT" | "RESTORED";
    actorUserId?: string;
    jobId?: string;
    mock: boolean;
  },
) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.brandProfile.upsert({
      where: { projectId: input.projectId },
      create: { projectId: input.projectId },
      update: {},
    });
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${profile.id}))`;
    const latest = await tx.brandProfileVersion.aggregate({
      where: { brandProfileId: profile.id },
      _max: { versionNumber: true },
    });
    const version = await tx.brandProfileVersion.create({
      data: {
        brandProfileId: profile.id,
        versionNumber: (latest._max.versionNumber ?? 0) + 1,
        schemaVersion: input.snapshot.schemaVersion,
        snapshot: input.snapshot as unknown as Prisma.InputJsonValue,
        provenance: input.snapshot
          .provenance as unknown as Prisma.InputJsonValue,
        source: input.source,
        ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
        mock: input.mock,
      },
    });
    await tx.project.update({
      where: { id: input.projectId },
      data: { currentBrandProfileVersionId: version.id },
    });
    if (input.jobId) {
      await tx.generationJob.update({
        where: { id: input.jobId },
        data: { brandProfileVersionId: version.id },
      });
    }
    return version;
  });
}

export async function saveManualProfile(input: {
  userId: string;
  projectId: string;
  snapshot: unknown;
}): Promise<
  Result<{ versionId: string; versionNumber: number }, ProfileError>
> {
  const prisma = getPrisma();
  const owned = await createPhase2Repository(prisma).findOwnedProject(
    input.userId,
    input.projectId,
  );
  if (!owned?.currentBrandProfileVersion) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "This Brand Profile is not available.",
      },
    };
  }
  const current = BrandProfileSchema.safeParse(
    owned.currentBrandProfileVersion.snapshot,
  );
  const candidate = BrandProfileSchema.safeParse({
    ...(input.snapshot as object),
    schemaVersion: "1.0",
    provenance: current.success
      ? {
          ...current.data.provenance,
          generatedAt: new Date().toISOString(),
        }
      : undefined,
  });
  if (!candidate.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Check the profile fields and try again.",
      },
    };
  }
  try {
    const version = await createProfileVersion(prisma, {
      projectId: input.projectId,
      snapshot: candidate.data,
      source: "MANUAL_EDIT",
      actorUserId: input.userId,
      mock: owned.currentBrandProfileVersion.mock,
    });
    return {
      ok: true,
      value: { versionId: version.id, versionNumber: version.versionNumber },
    };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "The profile could not be saved." },
    };
  }
}

export async function restoreProfileVersion(input: {
  userId: string;
  projectId: string;
  versionId: string;
}): Promise<Result<{ versionNumber: number }, ProfileError>> {
  const prisma = getPrisma();
  const version = await createPhase2Repository(prisma).findVersionOwned(
    input.userId,
    input.projectId,
    input.versionId,
  );
  if (!version) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "This version is not available." },
    };
  }
  const parsed = BrandProfileSchema.safeParse(version.snapshot);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "This version cannot be restored.",
      },
    };
  }
  const restored = await createProfileVersion(prisma, {
    projectId: input.projectId,
    snapshot: {
      ...parsed.data,
      provenance: {
        ...parsed.data.provenance,
        generatedAt: new Date().toISOString(),
      },
    },
    source: "RESTORED",
    actorUserId: input.userId,
    mock: version.mock,
  });
  return { ok: true, value: { versionNumber: restored.versionNumber } };
}
