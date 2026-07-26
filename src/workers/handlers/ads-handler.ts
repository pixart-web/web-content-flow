import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import {
  ADS_CHANNEL_TYPE_COMPATIBILITY,
  AdsGenerationRequestSchema,
  ImagePromptPackSnapshotSchema,
  AdsSnapshotSchema,
  type AdsCampaignObjective,
  type AdsChannel,
  type AdsContentType,
  type AdsGenerationRequest,
  type AdsRegenerationTarget,
  type AdsSnapshot,
} from "@/domain/ads/ads-schemas";
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
    | "ADS_ITEM_NEW"
    | "ADS_ITEM_REGENERATE"
    | "ADS_VARIANT_REGENERATE"
    | "ADS_PROMPT_REGENERATE"
    | "ADS_FIELD_REGENERATE";
  itemId?: string;
  itemKey?: string;
  contentType: AdsContentType;
  channel?: AdsChannel;
  campaignObjective?: AdsCampaignObjective;
  variantsPerAsset?: number;
  campaignName?: string;
  offerName?: string;
  offerDescription?: string;
  conversionAction?: string;
  keywordThemes?: string[];
  expectedCurrentVersionId?: string;
  brandProfileVersionId: string;
  target?: AdsRegenerationTarget;
  scenario?: string;
};

function provenance(jobId: string, brandProfileVersionId: string) {
  return ContentProvenanceSchema.parse({
    provider: "mock",
    model: "mock-ads-v1",
    promptVersion: "ads-creative-1.0",
    schemaVersion: "1.0",
    requestId: jobId,
    generationJobId: jobId,
    brandProfileVersionId,
    generatedAt: new Date(0).toISOString(),
    mock: true,
  });
}

function variants(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `variant-${index + 1}`,
    label: `Variant ${String.fromCharCode(65 + index)}`,
  }));
}

function generateSnapshot(
  request: ItemRequest,
  brand: ReturnType<typeof BrandProfileSchema.parse>,
  jobId: string,
): AdsSnapshot {
  const channel = request.channel ?? "META_INSTAGRAM";
  const objective = request.campaignObjective ?? "CONVERSIONS";
  const offer = request.offerName ?? brand.slogan;
  const cta =
    request.conversionAction ?? brand.primaryCallsToAction[0] ?? "Learn more";
  const common = {
    schemaVersion: "1.0" as const,
    channel,
    campaignObjective: objective,
    title: `${offer} · ${request.contentType.replaceAll("_", " ").toLowerCase()}`,
    ...(request.campaignName ? { campaignName: request.campaignName } : {}),
    campaignNotes: `Mock advertising draft for ${brand.brandSummary}`,
    complianceNotes: [
      "Review claims, disclosures and platform requirements before publishing.",
    ],
    provenance: provenance(jobId, request.brandProfileVersionId),
  };
  const count = request.variantsPerAsset ?? 2;
  let candidate: unknown;
  if (request.contentType === "GOOGLE_SEARCH_AD") {
    candidate = {
      ...common,
      channel: "GOOGLE_SEARCH",
      contentType: "GOOGLE_SEARCH_AD",
      variants: variants(count).map((variant, index) => ({
        ...variant,
        headlines: [
          `${offer} for everyday movement`,
          brand.slogan,
          `${index + 1}. ${brand.keyMarketingMessages[0]}`,
        ],
        descriptions: [
          `${request.offerDescription ?? brand.valueProposition} ${cta}.`,
          `${brand.brandPromise} ${cta}.`,
        ],
        pathOne: "everyday",
        pathTwo: "movement",
        callToAction: cta,
        keywordThemes: request.keywordThemes?.length
          ? request.keywordThemes
          : ["urban footwear", "comfortable city shoes"],
        rationale: `Editorial alternative ${index + 1}; performance is not predicted.`,
      })),
    };
  } else if (request.contentType === "META_AD") {
    candidate = {
      ...common,
      channel: channel === "META_FACEBOOK" ? "META_FACEBOOK" : "META_INSTAGRAM",
      contentType: "META_AD",
      variants: variants(count).map((variant, index) => ({
        ...variant,
        primaryText: `${brand.slogan}\n\n${request.offerDescription ?? brand.valueProposition}`,
        headline: `${offer}, built for city movement`,
        description: brand.brandPromise,
        callToAction: cta,
        creativeAngle:
          index % 2
            ? "Confidence in daily movement"
            : "Everyday comfort without compromise",
        visualDirection: brand.imageDirection,
        rationale: `Editorial alternative ${index + 1}; performance is not predicted.`,
      })),
    };
  } else if (request.contentType === "LINKEDIN_AD") {
    candidate = {
      ...common,
      channel: "LINKEDIN",
      contentType: "LINKEDIN_AD",
      variants: variants(count).map((variant, index) => ({
        ...variant,
        introductoryText: `${request.offerDescription ?? brand.valueProposition} ${brand.keyMarketingMessages[0]}`,
        headline: `${offer} for modern professionals`,
        description: brand.brandPromise,
        callToAction: cta,
        professionalAngle:
          index % 2
            ? "Reliable value for active teams"
            : "A clear offer for urban professionals",
        rationale: `Editorial alternative ${index + 1}; performance is not predicted.`,
      })),
    };
  } else if (request.contentType === "CREATIVE_BRIEF") {
    candidate = {
      ...common,
      contentType: "CREATIVE_BRIEF",
      audienceInsight: brand.targetAudienceSummary,
      campaignPromise: brand.brandPromise,
      keyMessage: brand.keyMarketingMessages[0],
      supportPoints: brand.keyMarketingMessages.slice(0, 3),
      emotionalAngle: "Confident movement through the working day",
      visualDirection: {
        concept: brand.visualDirection,
        composition:
          "One central product moment with restrained supporting context",
        subject: "People moving naturally through a modern city",
        environment: "Bright, realistic urban setting",
        colorDirection: brand.colorPalette.map((color) => color.hex).join(", "),
        typographyDirection: brand.typographyRecommendations.join(", "),
        exclusions: [
          "Unverifiable badges",
          "Platform logos",
          "Artificial performance metrics",
        ],
      },
      copyDirection: {
        tone: brand.toneOfVoice.join(", "),
        mandatoryMessages: [brand.valueProposition],
        avoidMessages: brand.wordsToAvoid,
      },
      deliverables: [
        "Channel-ready copy direction",
        "Visual concept",
        "Review checklist",
      ],
      notes: "Content direction only; no rendered creative is produced.",
    };
  } else {
    candidate = {
      ...common,
      contentType: "IMAGE_PROMPT_PACK",
      prompts: variants(Math.min(count, 5)).map((variant, index) => ({
        id: `prompt-${index + 1}`,
        label: variant.label,
        purpose: `Advertising concept for ${offer}`,
        prompt: `${brand.reusableImagePrompt}. Show ${offer} in a realistic ${channel.toLowerCase().replaceAll("_", " ")} advertising composition. ${brand.imageDirection}`,
        aspectRatio: channel === "META_INSTAGRAM" ? "4:5" : "1.91:1",
        composition:
          "Clear focal point with reserved space for optional overlay copy",
        lighting: "Natural directional daylight",
        styleDirection: brand.visualDirection,
        negativeInstructions: [
          "No logos from other brands",
          "No fabricated awards",
          "No embedded performance metrics",
        ],
        overlayCopyGuidance: `${brand.slogan} — keep overlay copy concise and separately editable`,
      })),
      notes: "Prompt pack only — no image is generated.",
    };
  }
  if (
    request.scenario === "duplicate-variant-id" &&
    typeof candidate === "object" &&
    candidate &&
    "variants" in candidate
  ) {
    const list = (candidate as { variants: Array<{ id: string }> }).variants;
    if (list[1]) list[1].id = list[0]!.id;
  }
  if (
    request.scenario === "invalid-google-ad" &&
    request.contentType === "GOOGLE_SEARCH_AD"
  )
    (
      candidate as { variants: Array<{ headlines: string[] }> }
    ).variants[0]!.headlines = [];
  if (
    request.scenario === "invalid-meta-variant" &&
    request.contentType === "META_AD"
  )
    (
      candidate as { variants: Array<{ primaryText: string }> }
    ).variants[0]!.primaryText = "";
  if (
    request.scenario === "invalid-image-prompt-pack" &&
    request.contentType === "IMAGE_PROMPT_PACK"
  )
    (candidate as { prompts: unknown[] }).prompts = [];
  return AdsSnapshotSchema.parse(candidate);
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
      safeErrorCode: status === "COMPLETED" ? null : "ASSET_GENERATION_FAILED",
    },
  });
  await prisma.generationJobStep.update({
    where: { jobId_key: { jobId: parentJobId, key: "assets" } },
    data: {
      status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "ASSET_GENERATION_FAILED",
    },
  });
  await prisma.projectModule.updateMany({
    where: { projectId: parent.projectId, module: "ADS" },
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

function plannedAssets(settings: AdsGenerationRequest) {
  return settings.channels.flatMap((channel) =>
    settings.assetTypes
      .filter((type) => ADS_CHANNEL_TYPE_COMPATIBILITY[channel].includes(type))
      .map((contentType) => ({ channel, contentType })),
  );
}

function scenarioFor(
  scenario: string,
  contentType: AdsContentType,
  channel: AdsChannel,
  index: number,
  count: number,
) {
  if (scenario === "one-asset-failure" && index === count - 1) return "failure";
  if (scenario === "invalid-google-ad" && contentType === "GOOGLE_SEARCH_AD")
    return scenario;
  if (scenario === "invalid-meta-variant" && contentType === "META_AD")
    return scenario;
  if (
    scenario === "invalid-image-prompt-pack" &&
    contentType === "IMAGE_PROMPT_PACK"
  )
    return scenario;
  if (
    scenario === "timeout-linkedin-ad" &&
    channel === "LINKEDIN" &&
    contentType === "LINKEDIN_AD"
  )
    return "timeout";
  if (
    scenario === "duplicate-variant-id" &&
    ["GOOGLE_SEARCH_AD", "META_AD", "LINKEDIN_AD"].includes(contentType)
  )
    return scenario;
  return "success";
}

function replaceTarget(
  current: AdsSnapshot,
  generated: AdsSnapshot,
  target: AdsRegenerationTarget,
): AdsSnapshot {
  if (target.kind === "VARIANT") {
    if (!("variants" in current) || !("variants" in generated))
      throw new Error("INVALID_TARGET");
    const replacement =
      generated.variants.find((variant) => variant.id === target.variantId) ??
      generated.variants[0];
    if (
      !replacement ||
      !current.variants.some((variant) => variant.id === target.variantId)
    )
      throw new Error("INVALID_TARGET");
    return AdsSnapshotSchema.parse({
      ...current,
      variants: current.variants.map((variant) =>
        variant.id === target.variantId
          ? { ...replacement, id: variant.id, label: variant.label }
          : variant,
      ),
      provenance: generated.provenance,
    });
  }
  if (target.kind === "PROMPT") {
    if (
      current.contentType !== "IMAGE_PROMPT_PACK" ||
      generated.contentType !== "IMAGE_PROMPT_PACK"
    )
      throw new Error("INVALID_TARGET");
    const replacement =
      generated.prompts.find((prompt) => prompt.id === target.promptId) ??
      generated.prompts[0];
    if (
      !replacement ||
      !current.prompts.some((prompt) => prompt.id === target.promptId)
    )
      throw new Error("INVALID_TARGET");
    return ImagePromptPackSnapshotSchema.parse({
      ...current,
      prompts: current.prompts.map((prompt) =>
        prompt.id === target.promptId
          ? { ...replacement, id: prompt.id, label: prompt.label }
          : prompt,
      ),
      provenance: generated.provenance,
    });
  }
  const field = target.field;
  if (
    current.contentType === "GOOGLE_SEARCH_AD" &&
    generated.contentType === "GOOGLE_SEARCH_AD"
  ) {
    const variants = current.variants.map((variant, index) => {
      const replacement = generated.variants[index] ?? generated.variants[0]!;
      if (field === "HEADLINES")
        return { ...variant, headlines: replacement.headlines };
      if (field === "DESCRIPTIONS")
        return { ...variant, descriptions: replacement.descriptions };
      if (field === "CALL_TO_ACTION")
        return { ...variant, callToAction: replacement.callToAction };
      if (field === "KEYWORD_THEMES")
        return { ...variant, keywordThemes: replacement.keywordThemes };
      throw new Error("INVALID_TARGET");
    });
    return AdsSnapshotSchema.parse({
      ...current,
      variants,
      provenance: generated.provenance,
    });
  }
  if (
    current.contentType === "META_AD" &&
    generated.contentType === "META_AD"
  ) {
    const variants = current.variants.map((variant, index) => {
      const replacement = generated.variants[index] ?? generated.variants[0]!;
      if (field === "PRIMARY_TEXT")
        return { ...variant, primaryText: replacement.primaryText };
      if (field === "CALL_TO_ACTION")
        return { ...variant, callToAction: replacement.callToAction };
      if (field === "CREATIVE_DIRECTION")
        return {
          ...variant,
          creativeAngle: replacement.creativeAngle,
          visualDirection: replacement.visualDirection,
        };
      throw new Error("INVALID_TARGET");
    });
    return AdsSnapshotSchema.parse({
      ...current,
      variants,
      provenance: generated.provenance,
    });
  }
  if (
    current.contentType === "LINKEDIN_AD" &&
    generated.contentType === "LINKEDIN_AD"
  ) {
    const variants = current.variants.map((variant, index) => {
      const replacement = generated.variants[index] ?? generated.variants[0]!;
      if (field === "PRIMARY_TEXT")
        return { ...variant, introductoryText: replacement.introductoryText };
      if (field === "CALL_TO_ACTION")
        return { ...variant, callToAction: replacement.callToAction };
      throw new Error("INVALID_TARGET");
    });
    return AdsSnapshotSchema.parse({
      ...current,
      variants,
      provenance: generated.provenance,
    });
  }
  if (
    current.contentType === "CREATIVE_BRIEF" &&
    generated.contentType === "CREATIVE_BRIEF"
  ) {
    if (field === "KEY_MESSAGE")
      return AdsSnapshotSchema.parse({
        ...current,
        keyMessage: generated.keyMessage,
        provenance: generated.provenance,
      });
    if (field === "VISUAL_DIRECTION")
      return AdsSnapshotSchema.parse({
        ...current,
        visualDirection: generated.visualDirection,
        provenance: generated.provenance,
      });
    if (field === "COPY_DIRECTION")
      return AdsSnapshotSchema.parse({
        ...current,
        copyDirection: generated.copyDirection,
        provenance: generated.provenance,
      });
  }
  if (
    current.contentType === "IMAGE_PROMPT_PACK" &&
    generated.contentType === "IMAGE_PROMPT_PACK"
  ) {
    if (field === "IMAGE_PROMPTS")
      return AdsSnapshotSchema.parse({
        ...current,
        prompts: generated.prompts,
        provenance: generated.provenance,
      });
    if (field === "NEGATIVE_INSTRUCTIONS" && target.targetId) {
      const replacement =
        generated.prompts.find((prompt) => prompt.id === target.targetId) ??
        generated.prompts[0];
      if (
        !replacement ||
        !current.prompts.some((prompt) => prompt.id === target.targetId)
      )
        throw new Error("INVALID_TARGET");
      return AdsSnapshotSchema.parse({
        ...current,
        prompts: current.prompts.map((prompt) =>
          prompt.id === target.targetId
            ? {
                ...prompt,
                negativeInstructions: replacement.negativeInstructions,
              }
            : prompt,
        ),
        provenance: generated.provenance,
      });
    }
  }
  throw new Error("INVALID_TARGET");
}

export async function handleAdsJob(prisma: PrismaClient, job: Job) {
  const stored = await prisma.generationJob.findUnique({
    where: { id: job.id },
    select: { parentJobId: true, mode: true, briefRevision: true },
  });
  const raw = job.request as { kind?: string };
  if (raw.kind === "ADS_MODULE") {
    try {
      const request = job.request as {
        kind: "ADS_MODULE";
        batchKey: string;
        brandProfileVersionId: string;
        settings: unknown;
      };
      const settings = AdsGenerationRequestSchema.parse(request.settings);
      const assets = plannedAssets(settings);
      await prisma.$transaction(async (tx) => {
        for (const [index, asset] of assets.entries()) {
          const itemKey = `${request.batchKey}-${asset.channel.toLowerCase()}-${asset.contentType.toLowerCase()}-${String(index + 1).padStart(2, "0")}`;
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
              module: "ADS",
              status: "QUEUED",
              mode: stored?.mode ?? "MOCK",
              provider: stored?.mode === "REAL" ? "OPENAI" : "MOCK",
              briefRevision: stored?.briefRevision ?? null,
              promptKey: `ads.${asset.contentType.toLocaleLowerCase()}.generation`,
              promptVersion: "1.0.0",
              generationPurpose: "ITEM_GENERATION",
              idempotencyKey,
              request: {
                kind: "ADS_ITEM_NEW",
                itemKey,
                contentType: asset.contentType,
                channel: asset.channel,
                campaignObjective: settings.campaignObjective,
                variantsPerAsset: settings.variantsPerAsset,
                campaignName: settings.campaignName,
                offerName: settings.offer.name,
                offerDescription: settings.offer.description,
                conversionAction: settings.primaryConversionAction,
                keywordThemes: settings.keywordThemes,
                brandProfileVersionId: request.brandProfileVersionId,
                scenario: scenarioFor(
                  settings.mockScenario,
                  asset.contentType,
                  asset.channel,
                  index,
                  assets.length,
                ),
              } as Prisma.InputJsonValue,
              steps: {
                create: [
                  ["prepare", "Preparing campaign context"],
                  ["generate", "Creating advertising content"],
                  ["validate", "Validating advertising content"],
                  ["save", "Saving advertising asset"],
                ].map((step, ordinal) => ({
                  key: step[0]!,
                  label: step[1]!,
                  ordinal,
                })),
              },
            },
          });
        }
        for (const key of ["prepare", "plan"])
          await tx.generationJobStep.update({
            where: { jobId_key: { jobId: job.id, key } },
            data: {
              status: "COMPLETED",
              startedAt: new Date(),
              completedAt: new Date(),
            },
          });
        await tx.generationJobStep.update({
          where: { jobId_key: { jobId: job.id, key: "assets" } },
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
    if (request.kind === "ADS_ITEM_NEW") {
      if (!request.itemKey || !request.channel || !request.campaignObjective)
        throw new Error("INVALID_REQUEST");
      const snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: generateSnapshot(request, brand, job.id),
          schema: AdsSnapshotSchema,
          context: { request, brandProfile: brand },
          promptKey: `ads.${request.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose: "ITEM_GENERATION",
        })
      ).snapshot;
      const existing = await prisma.contentItem.findFirst({
        where: {
          projectId: job.projectId,
          module: "ADS",
          identityKey: request.itemKey,
        },
      });
      if (!existing)
        await prisma.$transaction(async (tx) => {
          const item = await tx.contentItem.create({
            data: {
              projectId: job.projectId,
              module: "ADS",
              type: request.contentType,
              identityKey: request.itemKey!,
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
    } else {
      if (!request.itemId || !request.expectedCurrentVersionId)
        throw new Error("INVALID_REQUEST");
      const item = await prisma.contentItem.findFirst({
        where: { id: request.itemId, projectId: job.projectId, module: "ADS" },
        include: { currentVersion: true },
      });
      if (!item?.currentVersion) throw new Error("ITEM_NOT_FOUND");
      const current = AdsSnapshotSchema.parse(item.currentVersion.snapshot);
      let snapshot = generateSnapshot(
        {
          ...request,
          channel: current.channel,
          campaignObjective: current.campaignObjective,
          variantsPerAsset:
            "variants" in current
              ? current.variants.length
              : current.contentType === "IMAGE_PROMPT_PACK"
                ? current.prompts.length
                : 1,
          ...(current.campaignName
            ? { campaignName: current.campaignName }
            : {}),
        },
        brand,
        job.id,
      );
      if (request.target)
        snapshot = replaceTarget(current, snapshot, request.target);
      snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: snapshot,
          schema: AdsSnapshotSchema,
          context: { request, brandProfile: brand, currentSnapshot: current },
          promptKey: `ads.${current.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose:
            request.target?.kind === "VARIANT"
              ? "VARIANT_REGENERATION"
              : request.target?.kind === "FIELD"
                ? "FIELD_REGENERATION"
                : "WHOLE_ITEM_REGENERATION",
        })
      ).snapshot;
      const validated = AdsSnapshotSchema.parse(snapshot);
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
