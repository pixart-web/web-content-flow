import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import {
  ShotListSnapshotSchema,
  VideoGenerationRequestSchema,
  VideoSnapshotSchema,
  durationSeconds,
  type PresenterStyle,
  type VideoContentType,
  type VideoFormat,
  type VideoObjective,
  type VideoPlatform,
  type VideoRegenerationTarget,
  type VideoSnapshot,
} from "@/domain/video/video-schemas";
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
    | "VIDEO_ITEM_NEW"
    | "VIDEO_ITEM_REGENERATE"
    | "VIDEO_SCENE_REGENERATE"
    | "VIDEO_SHOT_REGENERATE"
    | "VIDEO_FIELD_REGENERATE";
  itemId?: string;
  itemKey?: string;
  contentType: VideoContentType;
  platform?: VideoPlatform;
  format?: VideoFormat;
  objective?: VideoObjective;
  targetDurationSeconds?: number;
  conceptOrdinal?: number;
  topic?: string;
  campaignName?: string;
  presenterStyle?: PresenterStyle;
  primaryCallToAction?: string;
  includeOnScreenText?: boolean;
  includeVoiceOver?: boolean;
  expectedCurrentVersionId?: string;
  brandProfileVersionId: string;
  target?: VideoRegenerationTarget;
  scenario?: string;
};

const provenance = (jobId: string, brandProfileVersionId: string) =>
  ContentProvenanceSchema.parse({
    provider: "mock",
    model: "mock-video-v1",
    promptVersion: "video-planning-1.0",
    schemaVersion: "1.0",
    requestId: jobId,
    generationJobId: jobId,
    brandProfileVersionId,
    generatedAt: new Date(0).toISOString(),
    mock: true,
  });

function generateSnapshot(
  request: ItemRequest,
  brand: ReturnType<typeof BrandProfileSchema.parse>,
  jobId: string,
): VideoSnapshot {
  const platform = request.platform ?? "INSTAGRAM_REELS";
  const format = request.format ?? "REEL";
  const objective = request.objective ?? "AWARENESS";
  const target = request.targetDurationSeconds ?? 30;
  const topic = request.topic ?? brand.valueProposition;
  const cta =
    request.primaryCallToAction ??
    brand.primaryCallsToAction[0] ??
    "Learn more";
  const common = {
    schemaVersion: "1.0" as const,
    platform,
    format,
    objective,
    title: `${topic} · ${request.contentType.replaceAll("_", " ").toLowerCase()}`,
    ...(request.campaignName ? { campaignName: request.campaignName } : {}),
    provenance: provenance(jobId, request.brandProfileVersionId),
  };
  let candidate: unknown;
  if (request.contentType === "VIDEO_SCRIPT") {
    const durations = [
      Math.floor(target / 3),
      Math.floor(target / 3),
      target - 2 * Math.floor(target / 3),
    ];
    candidate = {
      ...common,
      contentType: "VIDEO_SCRIPT",
      conceptSummary: `${brand.brandPromise} presented as a practical short-form story.`,
      targetDurationSeconds: target,
      hook: {
        spokenText: brand.slogan,
        ...(request.includeOnScreenText === false
          ? {}
          : { onScreenText: brand.slogan }),
        visualDirection: brand.imageDirection,
      },
      scenes: durations.map((duration, index) => ({
        id: `scene-${index + 1}`,
        ordinal: index + 1,
        estimatedDurationSeconds: duration,
        purpose:
          index === 0
            ? "Establish the audience problem"
            : index === 1
              ? "Show the product value"
              : "Close with a clear action",
        visualDirection: brand.visualDirection,
        shotDescription:
          index === 1
            ? "Medium product demonstration with detail cutaways"
            : "Confident vertical composition",
        presenterAction:
          request.presenterStyle === "NO_PRESENTER" ||
          request.presenterStyle === "PRODUCT_ONLY"
            ? "No presenter"
            : "Speak directly and naturally to camera",
        spokenText:
          index === 0
            ? brand.slogan
            : (brand.keyMarketingMessages[index - 1] ?? brand.valueProposition),
        ...(request.includeVoiceOver === false
          ? {}
          : {
              voiceOver:
                brand.keyMarketingMessages[index] ?? brand.brandPromise,
            }),
        ...(request.includeOnScreenText === false
          ? {}
          : {
              onScreenText:
                index === 2
                  ? cta
                  : (brand.keyMarketingMessages[index] ?? brand.slogan),
            }),
        transition: index < 2 ? "Clean cut" : "Hold on final frame",
        audioDirection: "Restrained, upbeat licensed music direction only",
        editingNotes: "Keep pacing clear and leave copy readable.",
      })),
      closingCallToAction: {
        spokenText: cta,
        onScreenText: cta,
        visualDirection: "End card with clear product focus",
      },
      captionSuggestion: `${brand.slogan}. ${cta}.`,
      hashtags: ["UrbanStride", "CityMovement"],
      productionNotes: "Planning only — no media was generated.",
    };
  } else if (request.contentType === "SHOT_LIST") {
    candidate = {
      ...common,
      contentType: "SHOT_LIST",
      targetDurationSeconds: target,
      shots: [1, 2, 3].map((ordinal) => ({
        id: `shot-${ordinal}`,
        ordinal,
        sceneReferenceId: `scene-${ordinal}`,
        shotType:
          ordinal === 2
            ? "PRODUCT_DETAIL"
            : ordinal === 1
              ? "WIDE"
              : "CLOSE_UP",
        framing:
          ordinal === 1
            ? "Full vertical establishing frame"
            : "Centered product-led frame",
        subject: "Fictional UrbanStride product and city movement",
        action:
          ordinal === 1
            ? "Enter the city environment"
            : ordinal === 2
              ? "Show material and movement details"
              : "Hold the product with final call to action",
        location: "Realistic modern city setting",
        cameraMovement:
          ordinal === 2
            ? "Slow controlled push-in"
            : "Stable handheld movement",
        estimatedDurationSeconds: Math.max(1, Math.floor(target / 3)),
        lightingDirection: "Natural directional daylight",
        audioRequirement: "Record clean ambient sound only where useful",
        notes: "No stock-media search or upload is implied.",
      })),
      equipmentNotes: [
        "Vertical-capable camera or phone",
        "Stable support where available",
      ],
      productionNotes:
        "Shot plan only — verify available equipment and locations.",
    };
  } else if (request.contentType === "VOICE_OVER_SCRIPT") {
    candidate = {
      ...common,
      contentType: "VOICE_OVER_SCRIPT",
      targetDurationSeconds: target,
      tone: brand.toneOfVoice.join(", "),
      sections: [1, 2, 3].map((ordinal) => ({
        id: `section-${ordinal}`,
        ordinal,
        sceneReferenceId: `scene-${ordinal}`,
        text:
          ordinal === 1
            ? brand.slogan
            : (brand.keyMarketingMessages[ordinal - 2] ?? brand.brandPromise),
        deliveryDirection:
          ordinal === 3
            ? "Finish with calm confidence"
            : "Natural, clear and unhurried",
        pauseAfter: ordinal < 3,
      })),
      pronunciationNotes: [],
      pacingNotes: "Editorial text only; no voice, SSML or audio is generated.",
    };
  } else if (request.contentType === "VIDEO_CAPTION") {
    candidate = {
      ...common,
      contentType: "VIDEO_CAPTION",
      caption: `${brand.slogan}\n\n${topic}\n\n${brand.brandPromise}`,
      callToAction: cta,
      hashtags: ["UrbanStride", "CityMovement"],
      accessibilityDescription:
        "A fictional product moves through a bright urban environment.",
      notes:
        "Caption text only; publishing and subtitle files are not included.",
    };
  } else {
    candidate = {
      ...common,
      contentType: "VIDEO_PRODUCTION_BRIEF",
      concept: `${topic} expressed through an organized vertical video plan.`,
      targetAudience: brand.targetAudienceSummary,
      coreMessage: brand.keyMarketingMessages[0],
      desiredResponse: cta,
      targetDurationSeconds: target,
      visualDirection: {
        style: brand.visualDirection,
        composition: "Clear vertical hierarchy with one focal action",
        environment: "Realistic urban setting",
        colorDirection: brand.colorPalette.map((value) => value.hex).join(", "),
        lightingDirection: "Natural, premium daylight",
        avoid: [
          "Fabricated endorsements",
          "Third-party logos",
          "Unreadable text",
        ],
      },
      presenterDirection: {
        style: request.presenterStyle ?? "MIXED",
        delivery: "Clear, direct and natural",
        positioning: "Centered with safe text space",
      },
      audioDirection: {
        musicMood: "Restrained optimistic direction; licensing not included",
        soundEffects: [],
        voiceOverDirection: "Plain spoken direction only; no audio synthesis",
      },
      editingDirection: {
        pace: "Responsive but readable",
        transitions: ["Clean cuts"],
        textTreatment: "High-contrast concise overlays",
        captionTreatment: "Readable text with sufficient screen time",
      },
      deliverables: [
        "Structured script direction",
        "Production notes",
        "Editorial review",
      ],
      productionConstraints: ["No media generation", "No platform publishing"],
      notes: "Planning only — no video, image or audio was generated.",
    };
  }
  if (
    request.scenario === "invalid-scene-duration" &&
    request.contentType === "VIDEO_SCRIPT"
  )
    (
      candidate as { scenes: Array<{ estimatedDurationSeconds: number }> }
    ).scenes.forEach((scene) => {
      scene.estimatedDurationSeconds = 1;
    });
  if (
    request.scenario === "duplicate-scene-id" &&
    request.contentType === "VIDEO_SCRIPT"
  ) {
    const scenes = (candidate as { scenes: Array<{ id: string }> }).scenes;
    scenes[1]!.id = scenes[0]!.id;
  }
  if (
    request.scenario === "invalid-shot-list" &&
    request.contentType === "SHOT_LIST"
  )
    (candidate as { shots: unknown[] }).shots = [];
  if (
    request.scenario === "invalid-video-caption" &&
    request.contentType === "VIDEO_CAPTION"
  )
    (candidate as { caption: string }).caption = "";
  return VideoSnapshotSchema.parse(candidate);
}

async function aggregate(prisma: PrismaClient, parentJobId: string) {
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
      : completed
        ? "PARTIAL"
        : "FAILED";
  const parent = await prisma.generationJob.update({
    where: { id: parentJobId },
    data: {
      status,
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "VIDEO_ASSET_FAILED",
    },
  });
  await prisma.generationJobStep.update({
    where: { jobId_key: { jobId: parentJobId, key: "assets" } },
    data: {
      status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "VIDEO_ASSET_FAILED",
    },
  });
  await prisma.projectModule.updateMany({
    where: { projectId: parent.projectId, module: "VIDEO" },
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
async function fail(
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
  if (parentJobId) await aggregate(prisma, parentJobId);
}
function scenarioFor(
  scenario: string,
  type: VideoContentType,
  index: number,
  count: number,
) {
  if (scenario === "one-asset-failure" && index === count - 1) return "failure";
  if (scenario === "invalid-scene-duration" && type === "VIDEO_SCRIPT")
    return scenario;
  if (scenario === "duplicate-scene-id" && type === "VIDEO_SCRIPT")
    return scenario;
  if (scenario === "invalid-shot-list" && type === "SHOT_LIST") return scenario;
  if (scenario === "timeout-voice-over" && type === "VOICE_OVER_SCRIPT")
    return "timeout";
  if (scenario === "invalid-video-caption" && type === "VIDEO_CAPTION")
    return scenario;
  return "success";
}

function replaceTarget(
  current: VideoSnapshot,
  generated: VideoSnapshot,
  target: VideoRegenerationTarget,
): VideoSnapshot {
  if (target.kind === "SCENE") {
    if (
      current.contentType !== "VIDEO_SCRIPT" ||
      generated.contentType !== "VIDEO_SCRIPT"
    )
      throw new Error("INVALID_TARGET");
    const replacement = generated.scenes[0];
    if (
      !replacement ||
      !current.scenes.some((scene) => scene.id === target.sceneId)
    )
      throw new Error("INVALID_TARGET");
    return VideoSnapshotSchema.parse({
      ...current,
      scenes: current.scenes.map((scene) =>
        scene.id === target.sceneId
          ? {
              ...replacement,
              id: scene.id,
              ordinal: scene.ordinal,
              estimatedDurationSeconds: scene.estimatedDurationSeconds,
            }
          : scene,
      ),
      provenance: generated.provenance,
    });
  }
  if (target.kind === "SHOT") {
    if (
      current.contentType !== "SHOT_LIST" ||
      generated.contentType !== "SHOT_LIST"
    )
      throw new Error("INVALID_TARGET");
    const replacement = generated.shots[0];
    if (
      !replacement ||
      !current.shots.some((shot) => shot.id === target.shotId)
    )
      throw new Error("INVALID_TARGET");
    return ShotListSnapshotSchema.parse({
      ...current,
      shots: current.shots.map((shot) =>
        shot.id === target.shotId
          ? {
              ...replacement,
              id: shot.id,
              ordinal: shot.ordinal,
              estimatedDurationSeconds: shot.estimatedDurationSeconds,
            }
          : shot,
      ),
      provenance: generated.provenance,
    });
  }
  const field = target.field;
  if (
    current.contentType === "VIDEO_SCRIPT" &&
    generated.contentType === "VIDEO_SCRIPT"
  ) {
    if (field === "HOOK")
      return VideoSnapshotSchema.parse({
        ...current,
        hook: generated.hook,
        provenance: generated.provenance,
      });
    if (field === "VOICE_OVER")
      return VideoSnapshotSchema.parse({
        ...current,
        scenes: current.scenes.map((scene, index) => ({
          ...scene,
          voiceOver: generated.scenes[index]?.voiceOver,
        })),
        provenance: generated.provenance,
      });
    if (field === "ON_SCREEN_TEXT")
      return VideoSnapshotSchema.parse({
        ...current,
        hook: { ...current.hook, onScreenText: generated.hook.onScreenText },
        scenes: current.scenes.map((scene, index) => ({
          ...scene,
          onScreenText: generated.scenes[index]?.onScreenText,
        })),
        provenance: generated.provenance,
      });
    if (field === "CALL_TO_ACTION")
      return VideoSnapshotSchema.parse({
        ...current,
        closingCallToAction: generated.closingCallToAction,
        provenance: generated.provenance,
      });
  }
  if (
    current.contentType === "VOICE_OVER_SCRIPT" &&
    generated.contentType === "VOICE_OVER_SCRIPT" &&
    field === "VOICE_OVER"
  )
    return VideoSnapshotSchema.parse({
      ...current,
      sections: generated.sections,
      provenance: generated.provenance,
    });
  if (
    current.contentType === "VIDEO_CAPTION" &&
    generated.contentType === "VIDEO_CAPTION"
  ) {
    if (field === "VIDEO_CAPTION")
      return VideoSnapshotSchema.parse({
        ...current,
        caption: generated.caption,
        provenance: generated.provenance,
      });
    if (field === "HASHTAGS")
      return VideoSnapshotSchema.parse({
        ...current,
        hashtags: generated.hashtags,
        provenance: generated.provenance,
      });
    if (field === "CALL_TO_ACTION")
      return VideoSnapshotSchema.parse({
        ...current,
        callToAction: generated.callToAction,
        provenance: generated.provenance,
      });
  }
  if (
    current.contentType === "VIDEO_PRODUCTION_BRIEF" &&
    generated.contentType === "VIDEO_PRODUCTION_BRIEF"
  ) {
    if (field === "VISUAL_DIRECTION")
      return VideoSnapshotSchema.parse({
        ...current,
        visualDirection: generated.visualDirection,
        provenance: generated.provenance,
      });
    if (field === "EDITING_DIRECTION")
      return VideoSnapshotSchema.parse({
        ...current,
        editingDirection: generated.editingDirection,
        provenance: generated.provenance,
      });
  }
  throw new Error("INVALID_TARGET");
}

export async function handleVideoJob(prisma: PrismaClient, job: Job) {
  const stored = await prisma.generationJob.findUnique({
    where: { id: job.id },
    select: { parentJobId: true, mode: true, briefRevision: true },
  });
  const raw = job.request as { kind?: string };
  if (raw.kind === "VIDEO_MODULE") {
    try {
      const request = job.request as {
        kind: "VIDEO_MODULE";
        batchKey: string;
        brandProfileVersionId: string;
        settings: unknown;
      };
      const settings = VideoGenerationRequestSchema.parse(request.settings);
      const count = settings.conceptCount * settings.assetTypes.length;
      await prisma.$transaction(async (tx) => {
        let index = 0;
        for (let concept = 0; concept < settings.conceptCount; concept += 1)
          for (const contentType of settings.assetTypes) {
            const platform =
              settings.platforms[concept % settings.platforms.length]!;
            const format = settings.formats[concept % settings.formats.length]!;
            const objective =
              settings.objectives[concept % settings.objectives.length]!;
            const itemKey = `${request.batchKey}-${platform.toLowerCase()}-${contentType.toLowerCase()}-${String(concept + 1).padStart(2, "0")}`;
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
                module: "VIDEO",
                status: "QUEUED",
                mode: stored?.mode ?? "MOCK",
                provider: stored?.mode === "REAL" ? "OPENAI" : "MOCK",
                briefRevision: stored?.briefRevision ?? null,
                promptKey: `video.${contentType.toLocaleLowerCase()}.generation`,
                promptVersion: "1.0.0",
                generationPurpose: "ITEM_GENERATION",
                idempotencyKey,
                request: {
                  kind: "VIDEO_ITEM_NEW",
                  itemKey,
                  contentType,
                  platform,
                  format,
                  objective,
                  conceptOrdinal: concept + 1,
                  targetDurationSeconds: durationSeconds(settings.duration),
                  topic: settings.topic,
                  campaignName: settings.campaignName,
                  presenterStyle: settings.presenterStyle,
                  primaryCallToAction: settings.primaryCallToAction,
                  includeOnScreenText: settings.includeOnScreenText,
                  includeVoiceOver: settings.includeVoiceOver,
                  brandProfileVersionId: request.brandProfileVersionId,
                  scenario: scenarioFor(
                    settings.mockScenario,
                    contentType,
                    index,
                    count,
                  ),
                } as Prisma.InputJsonValue,
                steps: {
                  create: [
                    ["prepare", "Preparing project context"],
                    ["generate", "Writing video content"],
                    ["validate", "Validating video plan"],
                    ["save", "Saving video content"],
                  ].map(([key, label], ordinal) => ({
                    key: key!,
                    label: label!,
                    ordinal,
                  })),
                },
              },
            });
            index += 1;
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
      await fail(prisma, job, "INVALID_REQUEST");
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
    const profile = await prisma.brandProfileVersion.findFirst({
      where: {
        id: request.brandProfileVersionId,
        brandProfile: { projectId: job.projectId },
      },
    });
    if (!profile) throw new Error("PROFILE_NOT_FOUND");
    const brand = BrandProfileSchema.parse(profile.snapshot);
    if (request.kind === "VIDEO_ITEM_NEW") {
      if (
        !request.itemKey ||
        !request.platform ||
        !request.format ||
        !request.objective
      )
        throw new Error("INVALID_REQUEST");
      const snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: generateSnapshot(request, brand, job.id),
          schema: VideoSnapshotSchema,
          context: { request, brandProfile: brand },
          promptKey: `video.${request.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose: "ITEM_GENERATION",
        })
      ).snapshot;
      const existing = await prisma.contentItem.findFirst({
        where: {
          projectId: job.projectId,
          module: "VIDEO",
          identityKey: request.itemKey,
        },
      });
      if (!existing)
        await prisma.$transaction(async (tx) => {
          const item = await tx.contentItem.create({
            data: {
              projectId: job.projectId,
              module: "VIDEO",
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
        where: {
          id: request.itemId,
          projectId: job.projectId,
          module: "VIDEO",
        },
        include: { currentVersion: true },
      });
      if (!item?.currentVersion) throw new Error("ITEM_NOT_FOUND");
      const current = VideoSnapshotSchema.parse(item.currentVersion.snapshot);
      let snapshot = generateSnapshot(
        {
          ...request,
          platform: current.platform,
          format: current.format,
          objective: current.objective,
          targetDurationSeconds:
            "targetDurationSeconds" in current
              ? current.targetDurationSeconds
              : 30,
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
          schema: VideoSnapshotSchema,
          context: { request, brandProfile: brand, currentSnapshot: current },
          promptKey: `video.${current.contentType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose:
            request.target?.kind === "SCENE"
              ? "SECTION_REGENERATION"
              : request.target?.kind === "FIELD"
                ? "FIELD_REGENERATION"
                : "WHOLE_ITEM_REGENERATION",
        })
      ).snapshot;
      const valid = VideoSnapshotSchema.parse(snapshot);
      const result = await createContentVersion(prisma, {
        itemId: item.id,
        expectedCurrentVersionId: request.expectedCurrentVersionId,
        snapshot: valid,
        source: "REGENERATED",
        brandProfileVersionId: request.brandProfileVersionId,
        provenance: valid.provenance,
        sourceJobId: job.id,
        mock: valid.provenance.mock,
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
    if (stored?.parentJobId) await aggregate(prisma, stored.parentJobId);
  } catch (error: unknown) {
    await fail(
      prisma,
      job,
      error instanceof Error ? error.message : "INVALID_OUTPUT",
      stored?.parentJobId,
    );
  }
}
