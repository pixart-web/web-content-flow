import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

export async function runMaintenanceBatch(
  prisma: PrismaClient,
  now = new Date(),
) {
  const staleHeartbeatCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const [
    exports,
    resetTokens,
    reservations,
    buckets,
    recoveredJobs,
    heartbeats,
  ] = await prisma.$transaction([
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
    prisma.generationJob.updateMany({
      where: {
        status: { in: ["RUNNING", "VALIDATING", "SAVING"] },
        leaseExpiresAt: { lt: now },
      },
      data: {
        status: "QUEUED",
        leaseToken: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastLeaseHeartbeatAt: null,
        availableAt: now,
      },
    }),
    prisma.workerHeartbeat.deleteMany({
      where: { heartbeatAt: { lt: staleHeartbeatCutoff } },
    }),
  ]);
  return {
    expiredExports: exports.count,
    deletedResetTokens: resetTokens.count,
    expiredReservations: reservations.count,
    deletedRateLimitBuckets: buckets.count,
    recoveredExpiredJobs: recoveredJobs.count,
    deletedStaleWorkerHeartbeats: heartbeats.count,
    // Draft deletion is intentionally disabled until retention is approved.
    deletedStaleDrafts: 0,
  };
}
