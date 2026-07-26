import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

export async function runMaintenanceBatch(
  prisma: PrismaClient,
  now = new Date(),
) {
  const [exports, resetTokens, reservations, buckets] =
    await prisma.$transaction([
      prisma.contentExport.updateMany({
        where: { status: "COMPLETE", expiresAt: { lte: now } },
        data: { status: "EXPIRED", payload: null },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }],
        },
        limit: 500,
      }),
      prisma.usageReservation.updateMany({
        where: { status: "RESERVED", expiresAt: { lte: now } },
        data: { status: "EXPIRED" },
        limit: 500,
      }),
      prisma.rateLimitBucket.deleteMany({
        where: { expiresAt: { lte: now } },
        limit: 1_000,
      }),
    ]);
  return {
    expiredExports: exports.count,
    deletedResetTokens: resetTokens.count,
    expiredReservations: reservations.count,
    deletedRateLimitBuckets: buckets.count,
    // Draft deletion is intentionally disabled until retention is approved.
    deletedStaleDrafts: 0,
  };
}
