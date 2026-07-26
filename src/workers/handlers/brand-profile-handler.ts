import type { PrismaClient } from "@/generated/prisma/client";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { ProjectBriefSchema } from "@/domain/brief/brief-schema";
import { MockProvider } from "@/server/ai/providers/mock-provider";
import { ProviderError } from "@/server/ai/ai-provider";
import { createProfileVersion } from "@/server/services/brand-profile-service";
import { generateProductionSnapshot } from "@/server/ai/generation-executor";

type JobRequest = {
  briefRevision: number;
  briefSnapshot: unknown;
  scenario?: "success" | "provider-failure" | "invalid-output" | "timeout";
};

async function setStep(
  prisma: PrismaClient,
  jobId: string,
  key: string,
  status: "RUNNING" | "COMPLETED" | "FAILED",
) {
  const now = new Date();
  await prisma.generationJobStep.update({
    where: { jobId_key: { jobId, key } },
    data: {
      status,
      ...(status === "RUNNING" ? { startedAt: now } : { completedAt: now }),
    },
  });
}

export async function handleBrandProfileJob(
  prisma: PrismaClient,
  job: {
    id: string;
    projectId: string;
    request: unknown;
    leaseToken: string | null;
  },
): Promise<void> {
  const request = job.request as JobRequest;
  const brief = ProjectBriefSchema.parse(request.briefSnapshot);
  const provider = new MockProvider();

  try {
    await setStep(prisma, job.id, "prepare", "RUNNING");
    await setStep(prisma, job.id, "prepare", "COMPLETED");
    await setStep(prisma, job.id, "generate", "RUNNING");
    const result = await provider.generateStructured(
      {
        input: brief,
        requestId: job.id,
        model: "mock-brand-profile-v1",
        promptVersion: "brand-profile-1.0",
        schemaVersion: "1.0",
        timeoutMs: 10_000,
        ...(request.scenario ? { scenario: request.scenario } : {}),
      },
      BrandProfileSchema,
    );
    await setStep(prisma, job.id, "generate", "COMPLETED");
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "VALIDATING" },
    });
    await setStep(prisma, job.id, "validate", "RUNNING");
    let profile = BrandProfileSchema.parse({
      ...result.data,
      provenance: {
        ...result.data.provenance,
        generationJobId: job.id,
        requestId: job.id,
        briefRevision: request.briefRevision,
      },
    });
    profile = (
      await generateProductionSnapshot(prisma, {
        jobId: job.id,
        candidate: profile,
        schema: BrandProfileSchema,
        context: { briefRevision: request.briefRevision, brief },
        promptKey: "brand_profile.brand_profile.generation",
        promptVersion: "1.0.0",
        purpose: "ITEM_GENERATION",
      })
    ).snapshot;
    await setStep(prisma, job.id, "validate", "COMPLETED");
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "SAVING" },
    });
    await setStep(prisma, job.id, "save", "RUNNING");
    await createProfileVersion(prisma, {
      projectId: job.projectId,
      snapshot: profile,
      source: "GENERATED",
      jobId: job.id,
      mock: profile.provenance.mock,
    });
    await setStep(prisma, job.id, "save", "COMPLETED");
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
        usage: result.usage,
        safeErrorCode: null,
        safeErrorDetails: {},
      },
    });
  } catch (error: unknown) {
    const code = error instanceof ProviderError ? error.code : "INTERNAL";
    await prisma.generationJobStep.updateMany({
      where: { jobId: job.id, status: "RUNNING" },
      data: { status: "FAILED", completedAt: new Date(), safeErrorCode: code },
    });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
        safeErrorCode: code,
        safeErrorDetails: {
          retryable: error instanceof ProviderError && error.retryable,
        },
      },
    });
  }
}
