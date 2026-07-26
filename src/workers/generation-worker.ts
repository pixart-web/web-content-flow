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

type LeaseRow = {
  id: string;
  projectId: string;
  request: unknown;
  leaseToken: string | null;
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
      leaseExpiresAt: null,
      availableAt: new Date(),
    },
  });
}

export async function leaseNextJob(
  prisma: PrismaClient,
): Promise<LeaseRow | null> {
  const maximumActiveProjectJobs = getServerEnv().AI_MAX_ACTIVE_PROJECT_JOBS;
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(Date.now() + 60_000);
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
        "leaseExpiresAt" = ${leaseExpiresAt},
        attempt = attempt + 1,
        "startedAt" = COALESCE("startedAt", NOW()),
        "updatedAt" = NOW()
    FROM candidate
    WHERE job.id = candidate.id
    RETURNING job.id, job."projectId", job.request, job."leaseToken", job.module
  `;
  return rows[0] ?? null;
}

export async function processNextJob(prisma: PrismaClient): Promise<boolean> {
  await reconcileExpiredLeases(prisma);
  const job = await leaseNextJob(prisma);
  if (!job) return false;
  if (job.module === "COPY") {
    const request = job.request as { kind?: string };
    if (request.kind?.startsWith("COPY_")) await handleCopyJob(prisma, job);
    else await handleContentItemJob(prisma, job);
  } else if (job.module === "WEBSITE") {
    await handleWebsiteJob(prisma, job);
  } else if (job.module === "SOCIAL") {
    await handleSocialJob(prisma, job);
  } else if (job.module === "ADS") {
    await handleAdsJob(prisma, job);
  } else if (job.module === "VIDEO") {
    await handleVideoJob(prisma, job);
  } else if (job.module === "CALENDAR") {
    await handleCalendarJob(prisma, job);
  } else {
    await handleBrandProfileJob(prisma, job);
  }
  return true;
}
