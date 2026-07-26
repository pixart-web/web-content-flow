import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import {
  SocialGenerationRequestSchema,
  SocialSnapshotSchema,
  type SocialContentType,
  type SocialObjective,
  type SocialPlatform,
  type SocialRegenerationTarget,
  type SocialSnapshot,
} from "@/domain/social/social-schemas";
import { createContentVersion } from "@/server/services/content-version-service";
import { generateProductionSnapshot } from "@/server/ai/generation-executor";

type Job = {
  id: string;
  projectId: string;
  request: unknown;
  leaseToken: string | null;
};

type ItemRequest = {
  kind:
    "SOCIAL_ITEM_NEW" | "SOCIAL_ITEM_REGENERATE" | "SOCIAL_FIELD_REGENERATE";
  itemId?: string;
  itemKey?: string;
  contentType: SocialContentType;
  platform?: SocialPlatform;
  objective?: SocialObjective;
  ordinal?: number;
  campaignName?: string;
  topic?: string;
  includeHashtags?: boolean;
  primaryCallToAction?: string;
  expectedCurrentVersionId?: string;
  brandProfileVersionId: string;
  target?: SocialRegenerationTarget;
  scenario?: string;
};

function makeProvenance(jobId: string, brandProfileVersionId: string) {
  return ContentProvenanceSchema.parse({
    provider: "mock",
    model: "mock-social-v1",
    promptVersion: "social-content-1.0",
    schemaVersion: "1.0",
    requestId: jobId,
    generationJobId: jobId,
    brandProfileVersionId,
    generatedAt: new Date(0).toISOString(),
    mock: true,
  });
}

function baseSnapshot(
  request: ItemRequest,
  brand: ReturnType<typeof BrandProfileSchema.parse>,
  jobId: string,
) {
  const ordinal = request.ordinal ?? 1;
  return {
    schemaVersion: "1.0" as const,
    platform: request.platform ?? "INSTAGRAM",
    objective: request.objective ?? "AWARENESS",
    title: `${request.platform ?? "Social"} ${request.contentType
      .replace("SOCIAL_", "")
      .toLowerCase()} ${ordinal}`,
    ...(request.campaignName ? { campaignName: request.campaignName } : {}),
    notes: `Mock-generated Social content for ${brand.brandSummary}`,
    provenance: makeProvenance(jobId, request.brandProfileVersionId),
  };
}

function generateSocialSnapshot(
  request: ItemRequest,
  brand: ReturnType<typeof BrandProfileSchema.parse>,
  jobId: string,
): SocialSnapshot {
  const base = baseSnapshot(request, brand, jobId);
  const tags =
    request.includeHashtags === false
      ? []
      : ["UrbanStride", "CityMovement", "EverydayComfort"];
  const cta = request.primaryCallToAction ?? brand.primaryCallsToAction[0];
  const topic = request.topic ?? brand.valueProposition;
  const candidate =
    request.contentType === "SOCIAL_POST"
      ? {
          ...base,
          contentType: "SOCIAL_POST" as const,
          hook: brand.slogan,
          body: `${topic}\n\n${brand.keyMarketingMessages[0]}`,
          callToAction: cta,
          hashtags: tags,
        }
      : request.contentType === "SOCIAL_CAROUSEL"
        ? {
            ...base,
            contentType: "SOCIAL_CAROUSEL" as const,
            slides: [1, 2, 3].map((ordinal) => ({
              id: `slide-${ordinal}`,
              ordinal,
              headline:
                ordinal === 1
                  ? brand.slogan
                  : `City movement benefit ${ordinal}`,
              body:
                brand.keyMarketingMessages[
                  (ordinal - 1) % brand.keyMarketingMessages.length
                ] ?? brand.valueProposition,
            })),
            closingCallToAction: cta,
            caption: `${topic} ${brand.brandPromise}`,
            hashtags: tags,
          }
        : request.contentType === "SOCIAL_STORY"
          ? {
              ...base,
              contentType: "SOCIAL_STORY" as const,
              frames: [1, 2, 3].map((ordinal) => ({
                id: `frame-${ordinal}`,
                ordinal,
                headline: ordinal === 1 ? brand.slogan : `Step ${ordinal}`,
                body:
                  brand.keyMarketingMessages[
                    (ordinal - 1) % brand.keyMarketingMessages.length
                  ] ?? brand.valueProposition,
                ...(ordinal === 3 ? { callToAction: cta } : {}),
              })),
              finalCallToAction: cta,
            }
          : {
              ...base,
              contentType: "SOCIAL_CAPTION" as const,
              caption: `${brand.slogan}\n\n${topic}\n\n${brand.brandPromise}`,
              callToAction: cta,
              hashtags: tags,
            };
  if (request.scenario === "invalid-hashtags" && "hashtags" in candidate)
    candidate.hashtags = ["duplicate", "Duplicate"];
  if (request.scenario === "invalid-carousel" && "slides" in candidate)
    candidate.slides = candidate.slides.slice(0, 1);
  return SocialSnapshotSchema.parse(candidate);
}

async function aggregateParent(prisma: PrismaClient, parentJobId: string) {
  const children = await prisma.generationJob.findMany({
    where: { parentJobId },
    select: { status: true },
  });
  if (
    !children.length ||
    !children.every((child) =>
      ["COMPLETED", "FAILED", "CANCELLED"].includes(child.status),
    )
  )
    return;
  const completed = children.filter(
    (child) => child.status === "COMPLETED",
  ).length;
  const status =
    completed === children.length
      ? "COMPLETED"
      : completed > 0
        ? "PARTIAL"
        : "FAILED";
  const parent = await prisma.generationJob.update({
    where: { id: parentJobId },
    data: {
      status,
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "ITEM_GENERATION_FAILED",
    },
  });
  await prisma.generationJobStep.update({
    where: { jobId_key: { jobId: parentJobId, key: "items" } },
    data: {
      status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "ITEM_GENERATION_FAILED",
    },
  });
  await prisma.projectModule.updateMany({
    where: { projectId: parent.projectId, module: "SOCIAL" },
    data: {
      status:
        status === "COMPLETED"
          ? "COMPLETE"
          : status === "PARTIAL"
            ? "PARTIAL"
            : "FAILED",
    },
  });
}

async function failJob(
  prisma: PrismaClient,
  job: Job,
  code: string,
  parentJobId?: string | null,
) {
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
  if (parentJobId) await aggregateParent(prisma, parentJobId);
}

function scenarioFor(
  scenario: string,
  platform: SocialPlatform,
  contentType: SocialContentType,
  ordinal: number,
  quantity: number,
) {
  if (scenario === "one-item-failure" && ordinal === quantity) return "failure";
  if (scenario === "invalid-carousel" && contentType === "SOCIAL_CAROUSEL")
    return "invalid-carousel";
  if (
    scenario === "timeout-linkedin-post" &&
    platform === "LINKEDIN" &&
    contentType === "SOCIAL_POST"
  )
    return "timeout";
  if (scenario === "invalid-hashtags" && ordinal === quantity)
    return "invalid-hashtags";
  return "success";
}

export async function handleSocialJob(prisma: PrismaClient, job: Job) {
  const stored = await prisma.generationJob.findUnique({
    where: { id: job.id },
    select: { parentJobId: true, mode: true, briefRevision: true },
  });
  const raw = job.request as { kind?: string };
  if (raw.kind === "SOCIAL_MODULE") {
    try {
      const request = job.request as {
        kind: "SOCIAL_MODULE";
        batchKey: string;
        brandProfileVersionId: string;
        settings: unknown;
      };
      const settings = SocialGenerationRequestSchema.parse(request.settings);
      const combinations = settings.platforms.flatMap((platform) =>
        settings.contentTypes.map((contentType) => ({
          platform,
          contentType,
        })),
      );
      await prisma.$transaction(async (tx) => {
        for (let index = 0; index < settings.quantity; index += 1) {
          const combination = combinations[index % combinations.length]!;
          const objective =
            settings.objectives[index % settings.objectives.length]!;
          const ordinal = index + 1;
          const itemKey = `${request.batchKey}-${combination.platform.toLowerCase()}-${combination.contentType.toLowerCase()}-${String(ordinal).padStart(2, "0")}`;
          const idempotencyKey = `${job.id}:${itemKey}`;
          await tx.generationJob.upsert({
            where: {
              projectId_idempotencyKey: {
                projectId: job.projectId,
                idempotencyKey,
              },
            },
            update: {},
            create: {
              projectId: job.projectId,
              parentJobId: job.id,
              scopeType: "CONTENT_ITEM",
              scopeId: itemKey,
              module: "SOCIAL",
              status: "QUEUED",
              mode: stored?.mode ?? "MOCK",
              provider: stored?.mode === "REAL" ? "OPENAI" : "MOCK",
              briefRevision: stored?.briefRevision ?? null,
              promptKey: `social.${combination.contentType.toLocaleLowerCase()}.generation`,
              promptVersion: "1.0.0",
              generationPurpose: "ITEM_GENERATION",
              idempotencyKey,
              request: {
                kind: "SOCIAL_ITEM_NEW",
                itemKey,
                contentType: combination.contentType,
                platform: combination.platform,
                objective,
                ordinal,
                brandProfileVersionId: request.brandProfileVersionId,
                campaignName: settings.campaignName,
                topic: settings.topic,
                includeHashtags: settings.includeHashtags,
                primaryCallToAction: settings.primaryCallToAction,
                scenario: scenarioFor(
                  settings.mockScenario,
                  combination.platform,
                  combination.contentType,
                  ordinal,
                  settings.quantity,
                ),
              } as Prisma.InputJsonValue,
              steps: {
                create: [
                  ["prepare", "Preparing project context"],
                  ["generate", "Creating Social item"],
                  ["validate", "Validating Social content"],
                  ["save", "Saving Social content"],
                ].map((step, ordinalIndex) => ({
                  key: step[0]!,
                  label: step[1]!,
                  ordinal: ordinalIndex,
                })),
              },
            },
          });
        }
        await tx.generationJobStep.update({
          where: { jobId_key: { jobId: job.id, key: "prepare" } },
          data: {
            status: "COMPLETED",
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        await tx.generationJobStep.update({
          where: { jobId_key: { jobId: job.id, key: "plan" } },
          data: {
            status: "COMPLETED",
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        await tx.generationJobStep.update({
          where: { jobId_key: { jobId: job.id, key: "items" } },
          data: { status: "RUNNING", startedAt: new Date() },
        });
        await tx.generationJob.update({
          where: { id: job.id },
          data: { status: "RUNNING", leaseToken: null, leaseExpiresAt: null },
        });
      });
    } catch {
      await failJob(prisma, job, "INVALID_REQUEST");
    }
    return;
  }

  const request = job.request as ItemRequest;
  try {
    if (request.scenario === "failure" || request.scenario === "timeout")
      throw new Error(
        request.scenario === "timeout"
          ? "PROVIDER_TIMEOUT"
          : "PROVIDER_FAILURE",
      );
    const profileRow = await prisma.brandProfileVersion.findFirst({
      where: {
        id: request.brandProfileVersionId,
        brandProfile: { projectId: job.projectId },
      },
    });
    if (!profileRow) throw new Error("PROFILE_NOT_FOUND");
    const brand = BrandProfileSchema.parse(profileRow.snapshot);
    if (request.kind === "SOCIAL_ITEM_NEW") {
      if (!request.itemKey || !request.platform || !request.objective)
        throw new Error("INVALID_REQUEST");
      const itemKey = request.itemKey;
      const snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: generateSocialSnapshot(request, brand, job.id),
          schema: SocialSnapshotSchema,
          context: { request, brandProfile: brand },
          promptKey: `social.${request.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose: "ITEM_GENERATION",
        })
      ).snapshot;
      const existing = await prisma.contentItem.findFirst({
        where: {
          projectId: job.projectId,
          module: "SOCIAL",
          identityKey: request.itemKey,
        },
      });
      if (!existing) {
        await prisma.$transaction(async (tx) => {
          const item = await tx.contentItem.create({
            data: {
              projectId: job.projectId,
              module: "SOCIAL",
              type: request.contentType,
              identityKey: itemKey,
              title: snapshot.title,
              sourceJobId: job.id,
              sourceBrandProfileVersionId: request.brandProfileVersionId,
            },
          });
          const version = await tx.contentItemVersion.create({
            data: {
              contentItemId: item.id,
              versionNumber: 1,
              schemaVersion: "1.0",
              snapshot: snapshot as unknown as Prisma.InputJsonValue,
              source: "GENERATED",
              sourceJobId: job.id,
              brandProfileVersionId: request.brandProfileVersionId,
              mock: snapshot.provenance.mock,
              provenance:
                snapshot.provenance as unknown as Prisma.InputJsonValue,
            },
          });
          await tx.contentItem.update({
            where: { id: item.id },
            data: { currentVersionId: version.id },
          });
        });
      }
    } else {
      if (!request.itemId || !request.expectedCurrentVersionId)
        throw new Error("INVALID_REQUEST");
      const item = await prisma.contentItem.findFirst({
        where: {
          id: request.itemId,
          projectId: job.projectId,
          module: "SOCIAL",
        },
        include: { currentVersion: true },
      });
      if (!item?.currentVersion) throw new Error("ITEM_NOT_FOUND");
      const current = SocialSnapshotSchema.parse(item.currentVersion.snapshot);
      let snapshot = generateSocialSnapshot(
        {
          ...request,
          platform: current.platform,
          objective: current.objective,
          ordinal: 1,
          ...(current.campaignName
            ? { campaignName: current.campaignName }
            : {}),
        } as ItemRequest,
        brand,
        job.id,
      );
      if (request.kind === "SOCIAL_FIELD_REGENERATE") {
        if (!request.target) throw new Error("INVALID_TARGET");
        const generated = snapshot;
        if (request.target === "POST_BODY") {
          if (
            current.contentType !== "SOCIAL_POST" ||
            generated.contentType !== "SOCIAL_POST"
          )
            throw new Error("INVALID_TARGET");
          snapshot = {
            ...current,
            body: generated.body,
            provenance: generated.provenance,
          };
        } else if (request.target === "CAROUSEL_CAPTION") {
          if (
            current.contentType !== "SOCIAL_CAROUSEL" ||
            generated.contentType !== "SOCIAL_CAROUSEL"
          )
            throw new Error("INVALID_TARGET");
          snapshot = {
            ...current,
            caption: generated.caption,
            provenance: generated.provenance,
          };
        } else if (request.target === "STANDALONE_CAPTION") {
          if (
            current.contentType !== "SOCIAL_CAPTION" ||
            generated.contentType !== "SOCIAL_CAPTION"
          )
            throw new Error("INVALID_TARGET");
          snapshot = {
            ...current,
            caption: generated.caption,
            provenance: generated.provenance,
          };
        } else {
          if (!("hashtags" in current) || !("hashtags" in generated))
            throw new Error("INVALID_TARGET");
          snapshot = {
            ...current,
            hashtags: generated.hashtags,
            provenance: generated.provenance,
          };
        }
      }
      snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: snapshot,
          schema: SocialSnapshotSchema,
          context: { request, brandProfile: brand, currentSnapshot: current },
          promptKey: `social.${current.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose:
            request.kind === "SOCIAL_FIELD_REGENERATE"
              ? "FIELD_REGENERATION"
              : "WHOLE_ITEM_REGENERATION",
        })
      ).snapshot;
      const validated = SocialSnapshotSchema.parse(snapshot);
      const result = await createContentVersion(prisma, {
        itemId: item.id,
        expectedCurrentVersionId: request.expectedCurrentVersionId,
        snapshot: validated,
        source: "REGENERATED",
        brandProfileVersionId: request.brandProfileVersionId,
        provenance: validated.provenance,
        sourceJobId: job.id,
        mock: validated.provenance.mock,
      });
      if (!result.ok) throw new Error(result.error.code);
    }
    await prisma.generationJobStep.updateMany({
      where: { jobId: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    if (stored?.parentJobId) await aggregateParent(prisma, stored.parentJobId);
  } catch (error: unknown) {
    await failJob(
      prisma,
      job,
      error instanceof Error ? error.message : "INVALID_OUTPUT",
      stored?.parentJobId,
    );
  }
}
