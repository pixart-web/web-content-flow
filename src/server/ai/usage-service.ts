import "server-only";

import { createHash } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";
import { calculateUsageCost } from "@/server/ai/pricing";
import type {
  GenerationModelTier,
  GenerationProvider,
  GenerationPurpose,
  NormalizedUsage,
} from "@/server/ai/ai-provider";

const dayStart = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
const monthStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export async function reserveUsage(
  prisma: PrismaClient,
  input: {
    jobId: string;
    expectedTokens: number;
    now?: Date;
  },
) {
  const env = getServerEnv();
  const now = input.now ?? new Date();
  return prisma.$transaction(
    async (tx) => {
      const job = await tx.generationJob.findUniqueOrThrow({
        where: { id: input.jobId },
        include: { project: true, usageReservation: true },
      });
      if (job.mode === "MOCK") return null;
      if (job.usageReservation) return job.usageReservation;
      await tx.usageReservation.updateMany({
        where: { status: "RESERVED", expiresAt: { lt: now } },
        data: { status: "EXPIRED" },
      });
      const [projectDay, projectMonth, accountDay, reservations] =
        await Promise.all([
          tx.generationUsage.aggregate({
            where: {
              projectId: job.projectId,
              createdAt: { gte: dayStart(now) },
            },
            _sum: { totalTokens: true },
          }),
          tx.generationUsage.aggregate({
            where: {
              projectId: job.projectId,
              createdAt: { gte: monthStart(now) },
            },
            _sum: { totalTokens: true },
          }),
          tx.generationUsage.aggregate({
            where: {
              userId: job.project.userId,
              createdAt: { gte: dayStart(now) },
            },
            _sum: { totalTokens: true },
          }),
          tx.usageReservation.aggregate({
            where: {
              status: "RESERVED",
              expiresAt: { gt: now },
              OR: [
                { projectId: job.projectId },
                { userId: job.project.userId },
              ],
            },
            _sum: { reservedTokens: true },
          }),
        ]);
      const reserved = reservations._sum.reservedTokens ?? 0;
      if (
        (projectDay._sum.totalTokens ?? 0) + reserved + input.expectedTokens >
        env.AI_DAILY_PROJECT_TOKEN_LIMIT
      )
        throw new Error("PROJECT_DAILY_QUOTA");
      if (
        (projectMonth._sum.totalTokens ?? 0) + reserved + input.expectedTokens >
        env.AI_MONTHLY_PROJECT_TOKEN_LIMIT
      )
        throw new Error("PROJECT_MONTHLY_QUOTA");
      if (
        (accountDay._sum.totalTokens ?? 0) + reserved + input.expectedTokens >
        env.AI_DAILY_ACCOUNT_TOKEN_LIMIT
      )
        throw new Error("ACCOUNT_DAILY_QUOTA");
      return tx.usageReservation.create({
        data: {
          projectId: job.projectId,
          userId: job.project.userId,
          generationJobId: job.id,
          reservedTokens: input.expectedTokens,
          expiresAt: new Date(now.getTime() + 10 * 60_000),
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

export async function recordGenerationUsage(
  prisma: PrismaClient,
  input: {
    jobId: string;
    provider: GenerationProvider;
    modelId: string;
    modelTier: GenerationModelTier;
    promptKey: string;
    promptVersion: string;
    purpose: GenerationPurpose;
    attemptNumber: number;
    repair: boolean;
    usage: NormalizedUsage;
    providerRequestId?: string;
  },
) {
  const job = await prisma.generationJob.findUniqueOrThrow({
    where: { id: input.jobId },
    include: { project: true },
  });
  const cost = calculateUsageCost({
    provider: input.provider,
    modelId: input.modelId,
    generatedAt: new Date(),
    usage: input.usage,
  });
  return prisma.generationUsage.upsert({
    where: {
      generationJobId_attemptNumber_repair: {
        generationJobId: job.id,
        attemptNumber: input.attemptNumber,
        repair: input.repair,
      },
    },
    update: {},
    create: {
      projectId: job.projectId,
      userId: job.project.userId,
      generationJobId: job.id,
      provider: input.provider,
      modelId: input.modelId,
      modelTier: input.modelTier,
      promptKey: input.promptKey,
      promptVersion: input.promptVersion,
      generationPurpose: input.purpose,
      attemptNumber: input.attemptNumber,
      repair: input.repair,
      inputTokens: input.usage.inputTokens ?? null,
      outputTokens: input.usage.outputTokens ?? null,
      cachedInputTokens: input.usage.cachedInputTokens ?? null,
      reasoningTokens: input.usage.reasoningTokens ?? null,
      totalTokens: input.usage.totalTokens ?? null,
      estimatedCostMinorUnits: cost?.amountMinorUnits ?? null,
      currency: cost?.currency ?? null,
      usageSource: input.usage.usageSource,
      providerRequestIdHash: input.providerRequestId
        ? createHash("sha256")
            .update(input.providerRequestId)
            .digest("hex")
            .slice(0, 32)
        : null,
    },
  });
}

export async function reconcileUsageReservation(
  prisma: PrismaClient,
  jobId: string,
  consumedTokens: number | null,
) {
  return prisma.usageReservation.updateMany({
    where: { generationJobId: jobId, status: "RESERVED" },
    data:
      consumedTokens === null
        ? { status: "RELEASED" }
        : { status: "CONSUMED", consumedTokens },
  });
}

export async function listOwnedUsage(
  prisma: PrismaClient,
  userId: string,
  projectId?: string,
) {
  return prisma.generationUsage.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      project: { userId },
    },
    select: {
      id: true,
      projectId: true,
      provider: true,
      modelTier: true,
      generationPurpose: true,
      totalTokens: true,
      estimatedCostMinorUnits: true,
      currency: true,
      usageSource: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
