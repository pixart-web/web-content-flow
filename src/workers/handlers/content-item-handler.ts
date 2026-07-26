import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import {
  ContentProvenanceSchema,
  FoundationCopySnapshotSchema,
} from "@/domain/content/content-schemas";
import { ProviderError } from "@/server/ai/ai-provider";
import { createContentVersion } from "@/server/services/content-version-service";

type Request = {
  kind: "NEW_ITEM" | "REGENERATE";
  projectId: string;
  itemId?: string;
  expectedCurrentVersionId?: string;
  contentType: "FOUNDATION_COPY";
  brandProfileVersionId: string;
  promptVersion: string;
  schemaVersion: "1.0";
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

function generateSnapshot(
  brand: ReturnType<typeof BrandProfileSchema.parse>,
  scenario: Request["scenario"],
) {
  if (scenario === "provider-failure" || scenario === "timeout") {
    throw new ProviderError(
      scenario === "timeout" ? "TIMEOUT" : "PROVIDER_UNAVAILABLE",
      true,
      "Configured mock failure.",
    );
  }
  if (scenario === "invalid-output") return { schemaVersion: "invalid" };
  return {
    schemaVersion: "1.0",
    title: `${brand.slogan} foundation copy`,
    objective: brand.positioning,
    headline: brand.slogan,
    body: `${brand.brandSummary}\n\n${brand.valueProposition}`,
    callToAction: brand.primaryCallsToAction[0]!,
    notes: `Internal Phase 3 proof content using ${brand.toneOfVoice.join(", ")}.`,
  };
}

export async function handleContentItemJob(
  prisma: PrismaClient,
  job: {
    id: string;
    projectId: string;
    request: unknown;
    leaseToken: string | null;
  },
) {
  const request = job.request as Request;
  try {
    await setStep(prisma, job.id, "prepare", "RUNNING");
    const profileVersion = await prisma.brandProfileVersion.findFirst({
      where: {
        id: request.brandProfileVersionId,
        brandProfile: { projectId: job.projectId },
      },
    });
    if (!profileVersion) throw new Error("PROFILE_NOT_FOUND");
    const profile = BrandProfileSchema.parse(profileVersion.snapshot);
    await setStep(prisma, job.id, "prepare", "COMPLETED");

    await setStep(prisma, job.id, "generate", "RUNNING");
    const candidate = generateSnapshot(profile, request.scenario);
    await setStep(prisma, job.id, "generate", "COMPLETED");

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "VALIDATING" },
    });
    await setStep(prisma, job.id, "validate", "RUNNING");
    const snapshot = FoundationCopySnapshotSchema.parse(candidate);
    const provenance = ContentProvenanceSchema.parse({
      provider: "mock",
      model: "mock-foundation-copy-v1",
      promptVersion: request.promptVersion,
      schemaVersion: request.schemaVersion,
      requestId: job.id,
      generationJobId: job.id,
      brandProfileVersionId: request.brandProfileVersionId,
      generatedAt: new Date(0).toISOString(),
      mock: true,
    });
    await setStep(prisma, job.id, "validate", "COMPLETED");

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "SAVING" },
    });
    await setStep(prisma, job.id, "save", "RUNNING");
    if (request.kind === "NEW_ITEM") {
      const persisted = await prisma.contentItem.findUnique({
        where: { sourceJobId: job.id },
      });
      if (!persisted) {
        await prisma.$transaction(async (tx) => {
          const item = await tx.contentItem.create({
            data: {
              projectId: job.projectId,
              module: "COPY",
              type: request.contentType,
              title: snapshot.title,
              status: "DRAFT",
              sourceJobId: job.id,
              sourceBrandProfileVersionId: request.brandProfileVersionId,
            },
          });
          const version = await tx.contentItemVersion.create({
            data: {
              contentItemId: item.id,
              versionNumber: 1,
              schemaVersion: snapshot.schemaVersion,
              snapshot: snapshot as unknown as Prisma.InputJsonValue,
              source: "GENERATED",
              sourceJobId: job.id,
              brandProfileVersionId: request.brandProfileVersionId,
              mock: true,
              provenance: provenance as unknown as Prisma.InputJsonValue,
            },
          });
          await tx.contentItem.update({
            where: { id: item.id },
            data: { currentVersionId: version.id },
          });
        });
      }
    } else {
      if (!request.itemId || !request.expectedCurrentVersionId) {
        throw new Error("INVALID_REQUEST");
      }
      const persisted = await prisma.contentItemVersion.findUnique({
        where: { sourceJobId: job.id },
      });
      if (!persisted) {
        const result = await createContentVersion(prisma, {
          itemId: request.itemId,
          expectedCurrentVersionId: request.expectedCurrentVersionId,
          snapshot,
          source: "REGENERATED",
          brandProfileVersionId: request.brandProfileVersionId,
          provenance,
          sourceJobId: job.id,
          mock: true,
        });
        if (!result.ok) throw new Error(result.error.code);
      }
    }
    await setStep(prisma, job.id, "save", "COMPLETED");
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
        safeErrorCode: null,
        safeErrorDetails: {},
      },
    });
  } catch (error: unknown) {
    const code =
      error instanceof ProviderError
        ? error.code
        : error instanceof Error && error.message === "CONFLICT"
          ? "CONFLICT"
          : "INVALID_OUTPUT";
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
        safeErrorDetails: { currentContentUnchanged: true },
      },
    });
  }
}
