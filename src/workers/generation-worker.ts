import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";

import { handleBrandProfileJob } from "./handlers/brand-profile-handler";
import { handleContentItemJob } from "./handlers/content-item-handler";
import { handleWebsiteJob } from "./handlers/website-handler";
import { handleSocialJob } from "./handlers/social-handler";
import { handleAdsJob } from "./handlers/ads-handler";
import { handleVideoJob } from "./handlers/video-handler";
import { handleCopyJob } from "./handlers/copy-handler";
import { handleCalendarJob } from "./handlers/calendar-handler";
import {
  createLeaseFencedPrisma,
  LeaseLostError,
  leaseDurationMs,
  releaseJobLease,
  startLeaseHeartbeat,
  type JobLease,
} from "./job-lease";

type LeaseRow = {
  id: string;
  projectId: string;
  request: unknown;
  leaseToken: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  module:
    | "BRAND_PROFILE"
    | "COPY"
    | "WEBSITE"
    | "SOCIAL"
    | "ADS"
    | "VIDEO"
    | "CALENDAR";
};

export async function reconcileExpiredLeases(prisma: PrismaClient) {
  return prisma.generationJob.updateMany({
    where: {
      status: { in: ["RUNNING", "VALIDATING", "SAVING"] },
      leaseExpiresAt: { lt: new Date() },
    },
    data: {
      status: "QUEUED",
      leaseToken: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastLeaseHeartbeatAt: null,
      availableAt: new Date(),
    },
  });
}

export async function leaseNextJob(
  prisma: PrismaClient,
  workerId = `worker-${process.pid}`,
): Promise<LeaseRow | null> {
  const env = getServerEnv();
  const maximumActiveProjectJobs = env.AI_MAX_ACTIVE_PROJECT_JOBS;
  const leaseToken = randomUUID();
  const durationMs = leaseDurationMs(env);
  const rows = await prisma.$queryRaw<LeaseRow[]>`
    WITH candidate AS (
      SELECT id
      FROM "GenerationJob"
      WHERE status = 'QUEUED'
        AND "availableAt" <= NOW()
        AND attempt < "maxAttempts"
        AND (
          mode = 'MOCK'
          OR (
            SELECT COUNT(*)
            FROM "GenerationJob" active
            WHERE active."projectId" = "GenerationJob"."projectId"
              AND active.mode = 'REAL'
              AND active.status IN ('RUNNING', 'VALIDATING', 'SAVING')
          ) < ${maximumActiveProjectJobs}
        )
      ORDER BY "availableAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "GenerationJob" AS job
    SET status = 'RUNNING',
        "leaseToken" = ${leaseToken},
        "leaseOwner" = ${workerId},
        "leaseExpiresAt" = NOW() + (${durationMs} * INTERVAL '1 millisecond'),
        "lastLeaseHeartbeatAt" = NOW(),
        attempt = attempt + 1,
        "startedAt" = COALESCE("startedAt", NOW()),
        "updatedAt" = NOW()
    FROM candidate
    WHERE job.id = candidate.id
    RETURNING job.id, job."projectId", job.request, job."leaseToken",
      job."leaseOwner", job."leaseExpiresAt", job.module
  `;
  return rows[0] ?? null;
}

export async function processNextJob(
  prisma: PrismaClient,
  workerId = `worker-${process.pid}`,
): Promise<boolean> {
  await reconcileExpiredLeases(prisma);
  const job = await leaseNextJob(prisma, workerId);
  if (!job) return false;
  if (!job.leaseToken || !job.leaseOwner || !job.leaseExpiresAt)
    throw new Error("Acquired job is missing its lease identity.");
  const lease: JobLease = {
    jobId: job.id,
    leaseToken: job.leaseToken,
    workerId: job.leaseOwner,
    leaseExpiresAt: job.leaseExpiresAt,
  };
  const durationMs = leaseDurationMs(getServerEnv());
  let leaseLost = false;
  const stopHeartbeat = startLeaseHeartbeat({
    prisma,
    lease,
    durationMs,
    onLeaseLost: () => {
      leaseLost = true;
    },
  });
  const fencedPrisma = createLeaseFencedPrisma(prisma, lease);
  try {
    if (job.module === "COPY") {
      const request = job.request as { kind?: string };
      if (request.kind?.startsWith("COPY_"))
        await handleCopyJob(fencedPrisma, job);
      else await handleContentItemJob(fencedPrisma, job);
    } else if (job.module === "WEBSITE") {
      await handleWebsiteJob(fencedPrisma, job);
    } else if (job.module === "SOCIAL") {
      await handleSocialJob(fencedPrisma, job);
    } else if (job.module === "ADS") {
      await handleAdsJob(fencedPrisma, job);
    } else if (job.module === "VIDEO") {
      await handleVideoJob(fencedPrisma, job);
    } else if (job.module === "CALENDAR") {
      await handleCalendarJob(fencedPrisma, job);
    } else {
      await handleBrandProfileJob(fencedPrisma, job);
    }
  } catch (error: unknown) {
    if (!(error instanceof LeaseLostError) && !leaseLost) throw error;
  } finally {
    stopHeartbeat();
    await releaseJobLease(prisma, lease);
  }
  return true;
}
