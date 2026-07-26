import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const userId = "phase5-quota-owner";
const projectId = "phase5-quota-project";

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: "phase5-quota@test.invalid" },
  });
  await prisma.project.upsert({
    where: { id: projectId },
    update: {},
    create: {
      id: projectId,
      userId,
      name: "Synthetic quota project",
      brandName: "Synthetic",
      type: "Test",
    },
  });
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("usage reservations", () => {
  it("is idempotent per durable job and reconciles actual usage", async () => {
    const job = await prisma.generationJob.create({
      data: {
        projectId,
        scopeType: "CONTENT_ITEM",
        module: "COPY",
        status: "QUEUED",
        mode: "REAL",
        provider: "OPENAI",
        idempotencyKey: `quota-${crypto.randomUUID()}`,
        request: {},
      },
    });
    const { reconcileUsageReservation, reserveUsage } =
      await import("../../src/server/ai/usage-service");

    const first = await reserveUsage(prisma, {
      jobId: job.id,
      expectedTokens: 100,
    });
    const repeated = await reserveUsage(prisma, {
      jobId: job.id,
      expectedTokens: 100,
    });

    expect(repeated?.id).toBe(first?.id);
    await reconcileUsageReservation(prisma, job.id, 62);
    await expect(
      prisma.usageReservation.findUniqueOrThrow({
        where: { generationJobId: job.id },
      }),
    ).resolves.toMatchObject({ status: "CONSUMED", consumedTokens: 62 });
  });
});
