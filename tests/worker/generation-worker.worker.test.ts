import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";
import { validBrief } from "../fixtures/phase-2";

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

describe("durable Calendar jobs", () => {
  beforeAll(async () => {
    await createJob("calendar-project");
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await processNextJob(prisma);
  });

  it("fans out weekly work and persists one versioned Calendar", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "calendar-project" },
    });
    const settings = {
      schemaVersion: "1.0",
      calendarType: "EDITORIAL_CALENDAR",
      planningPeriod: {
        startDate: "2026-08-03",
        endDate: "2026-08-16",
        timezone: "Europe/Lisbon",
      },
      modules: ["COPY"],
      channels: ["EMAIL"],
      cadence: { weeklyTarget: 2 },
      objectives: ["AWARENESS"],
      sourceSelection: {
        strategy: "PLAN_NEW_CONTENT",
        includeUnscheduledExistingContent: false,
        allowPlannedPlaceholders: true,
      },
      outputLanguage: "English",
      mockScenario: "success",
    };
    const projectModule = await prisma.projectModule.upsert({
      where: {
        projectId_module: {
          projectId: project.id,
          module: "CALENDAR",
        },
      },
      update: { settings, status: "READY" },
      create: {
        projectId: project.id,
        module: "CALENDAR",
        status: "READY",
        settings,
      },
    });
    const parent = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "MODULE",
        scopeId: projectModule.id,
        module: "CALENDAR",
        status: "QUEUED",
        mode: "MOCK",
        idempotencyKey: "calendar-worker-success",
        request: {
          kind: "CALENDAR_MODULE",
          batchKey: "calendar-worker",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          settings,
          sources: [],
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "source", label: "Reviewing sources", ordinal: 1 },
            { key: "plan", label: "Planning", ordinal: 2 },
            { key: "validate", label: "Validating", ordinal: 3 },
            { key: "save", label: "Saving", ordinal: 4 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    for (let index = 0; index < 3; index += 1)
      await expect(processNextJob(prisma)).resolves.toBe(true);
    const calendar = await prisma.contentItem.findFirstOrThrow({
      where: { projectId: project.id, module: "CALENDAR" },
      include: { versions: true, currentVersion: true },
    });
    expect(
      await prisma.generationJob.findUniqueOrThrow({
        where: { id: parent.id },
      }),
    ).toMatchObject({ status: "COMPLETED" });
    expect(calendar.versions).toHaveLength(1);
    expect(calendar.currentVersion?.mock).toBe(true);
    expect(calendar.currentVersion?.brandProfileVersionId).toBe(
      project.currentBrandProfileVersionId,
    );
  });

  it("keeps valid weeks when one weekly child fails", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "calendar-project" },
    });
    const projectModule = await prisma.projectModule.findFirstOrThrow({
      where: { projectId: project.id, module: "CALENDAR" },
    });
    const settings = {
      ...(projectModule.settings as Record<string, unknown>),
      planningPeriod: {
        startDate: "2026-09-01",
        endDate: "2026-09-14",
        timezone: "Europe/Lisbon",
      },
      mockScenario: "one-week-failure",
    };
    const parent = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "MODULE",
        scopeId: projectModule.id,
        module: "CALENDAR",
        status: "QUEUED",
        mode: "MOCK",
        idempotencyKey: "calendar-worker-partial",
        request: {
          kind: "CALENDAR_MODULE",
          batchKey: "calendar-partial",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          settings,
          sources: [],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    for (let index = 0; index < 3; index += 1)
      await expect(processNextJob(prisma)).resolves.toBe(true);
    expect(
      await prisma.generationJob.findUniqueOrThrow({
        where: { id: parent.id },
      }),
    ).toMatchObject({ status: "PARTIAL", safeErrorCode: "CALENDAR_PARTIAL" });
    expect(
      await prisma.contentItem.count({
        where: { projectId: project.id, module: "CALENDAR" },
      }),
    ).toBe(2);
  });
});

beforeAll(async () => {
  await prisma.session.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.create({
    data: { id: "phase2-owner", email: "phase2@test.invalid" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createJob(id: string, scenario = "success") {
  return prisma.project.create({
    data: {
      id,
      userId: "phase2-owner",
      name: "UrbanStride",
      brandName: "UrbanStride",
      type: "E-commerce",
      status: "ACTIVE",
      brief: {
        create: {
          schemaVersion: "1.0",
          revision: 1,
          data: validBrief,
        },
      },
      generationJobs: {
        create: {
          scopeType: "BRAND_PROFILE",
          scopeId: id,
          module: "BRAND_PROFILE",
          status: "QUEUED",
          mode: "MOCK",
          idempotencyKey: "brand-profile:1",
          request: { briefRevision: 1, briefSnapshot: validBrief, scenario },
          steps: {
            create: [
              {
                key: "prepare",
                label: "Preparing project context",
                ordinal: 0,
              },
              {
                key: "generate",
                label: "Generating Brand Profile",
                ordinal: 1,
              },
              { key: "validate", label: "Validating profile", ordinal: 2 },
              { key: "save", label: "Saving profile", ordinal: 3 },
            ],
          },
        },
      },
    },
  });
}

describe("durable Brand Profile jobs", () => {
  it("leases once, persists a version, and completes", async () => {
    await createJob("phase2-success");
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await expect(processNextJob(prisma)).resolves.toBe(true);

    const project = await prisma.project.findUnique({
      where: { id: "phase2-success" },
      include: { currentBrandProfileVersion: true, generationJobs: true },
    });
    expect(project?.generationJobs[0]?.status).toBe("COMPLETED");
    expect(project?.currentBrandProfileVersion?.mock).toBe(true);
    expect(project?.currentBrandProfileVersion?.versionNumber).toBe(1);
  });

  it("stores a safe failure without creating a version", async () => {
    await createJob("phase2-failure", "invalid-output");
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await expect(processNextJob(prisma)).resolves.toBe(true);

    const project = await prisma.project.findUnique({
      where: { id: "phase2-failure" },
      include: { generationJobs: true },
    });
    expect(project?.generationJobs[0]?.status).toBe("FAILED");
    expect(project?.generationJobs[0]?.safeErrorCode).toBe(
      "SCHEMA_VALIDATION_FAILED",
    );
    expect(project?.currentBrandProfileVersionId).toBeNull();
  });
});

describe("durable content-item jobs", () => {
  it("creates one canonical item and initial immutable version", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "phase2-success" },
    });
    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "CONTENT_ITEM",
        scopeId: project.id,
        module: "COPY",
        status: "QUEUED",
        mode: "MOCK",
        idempotencyKey: "worker-foundation-copy",
        request: {
          kind: "NEW_ITEM",
          projectId: project.id,
          contentType: "FOUNDATION_COPY",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          promptVersion: "foundation-copy-1.0",
          schemaVersion: "1.0",
          scenario: "success",
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "generate", label: "Generating", ordinal: 1 },
            { key: "validate", label: "Validating", ordinal: 2 },
            { key: "save", label: "Saving", ordinal: 3 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await expect(processNextJob(prisma)).resolves.toBe(true);
    const item = await prisma.contentItem.findFirstOrThrow({
      where: { sourceJobId: job.id },
      include: { versions: true, currentVersion: true },
    });
    expect(item.versions).toHaveLength(1);
    expect(item.currentVersion?.source).toBe("GENERATED");
    expect(item.currentVersion?.brandProfileVersionId).toBe(
      project.currentBrandProfileVersionId,
    );
    await expect(processNextJob(prisma)).resolves.toBe(false);
  });

  it("regenerates into a new version and failure preserves current", async () => {
    const item = await prisma.contentItem.findFirstOrThrow({
      where: { projectId: "phase2-success" },
    });
    const originalVersionId = item.currentVersionId!;
    const common = {
      projectId: item.projectId,
      scopeType: "CONTENT_ITEM" as const,
      scopeId: item.id,
      module: "COPY" as const,
      status: "QUEUED" as const,
      mode: "MOCK" as const,
      steps: {
        create: [
          { key: "prepare", label: "Preparing", ordinal: 0 },
          { key: "generate", label: "Generating", ordinal: 1 },
          { key: "validate", label: "Validating", ordinal: 2 },
          { key: "save", label: "Saving", ordinal: 3 },
        ],
      },
    };
    await prisma.generationJob.create({
      data: {
        ...common,
        idempotencyKey: "worker-regenerate-success",
        request: {
          kind: "REGENERATE",
          projectId: item.projectId,
          itemId: item.id,
          expectedCurrentVersionId: originalVersionId,
          contentType: "FOUNDATION_COPY",
          brandProfileVersionId: item.sourceBrandProfileVersionId,
          promptVersion: "foundation-copy-1.0",
          schemaVersion: "1.0",
          scenario: "success",
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await processNextJob(prisma);
    const regenerated = await prisma.contentItem.findUniqueOrThrow({
      where: { id: item.id },
      include: { versions: true },
    });
    expect(regenerated.versions).toHaveLength(2);
    expect(regenerated.currentVersionId).not.toBe(originalVersionId);
    const retainedCurrent = regenerated.currentVersionId!;

    await prisma.generationJob.create({
      data: {
        ...common,
        idempotencyKey: "worker-regenerate-failure",
        request: {
          kind: "REGENERATE",
          projectId: item.projectId,
          itemId: item.id,
          expectedCurrentVersionId: retainedCurrent,
          contentType: "FOUNDATION_COPY",
          brandProfileVersionId: item.sourceBrandProfileVersionId,
          promptVersion: "foundation-copy-1.0",
          schemaVersion: "1.0",
          scenario: "invalid-output",
        },
      },
    });
    await processNextJob(prisma);
    const afterFailure = await prisma.contentItem.findUniqueOrThrow({
      where: { id: item.id },
      include: { versions: true },
    });
    expect(afterFailure.currentVersionId).toBe(retainedCurrent);
    expect(afterFailure.versions).toHaveLength(2);
  });
});

describe("durable Website jobs", () => {
  it("fans out page jobs and aggregates successful pages", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "phase2-success" },
    });
    const settings = {
      schemaVersion: "1.0",
      websiteObjective: "Introduce UrbanStride and its collection.",
      websiteType: "ECOMMERCE",
      selectedPages: ["HOME", "ABOUT"],
      additionalPages: [],
      primaryConversionAction: "Explore the collection",
      mockScenario: "success",
    };
    const projectModule = await prisma.projectModule.create({
      data: {
        projectId: project.id,
        module: "WEBSITE",
        status: "GENERATING",
        settings,
      },
    });
    const parent = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "MODULE",
        scopeId: projectModule.id,
        module: "WEBSITE",
        status: "QUEUED",
        idempotencyKey: "website-worker-success",
        request: {
          kind: "WEBSITE_MODULE",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          briefRevision: 1,
          settings,
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing pages", ordinal: 0 },
            { key: "pages", label: "Generating pages", ordinal: 1 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await expect(processNextJob(prisma)).resolves.toBe(true);
    await expect(processNextJob(prisma)).resolves.toBe(true);
    await expect(processNextJob(prisma)).resolves.toBe(true);

    const [completedParent, pages] = await Promise.all([
      prisma.generationJob.findUniqueOrThrow({ where: { id: parent.id } }),
      prisma.contentItem.findMany({
        where: { projectId: project.id, module: "WEBSITE" },
        include: { versions: true },
      }),
    ]);
    expect(completedParent.status).toBe("COMPLETED");
    expect(pages).toHaveLength(2);
    expect(pages.every((page) => page.versions.length === 1)).toBe(true);
    expect(new Set(pages.map((page) => page.identityKey)).size).toBe(2);
  });
});

describe("durable Social jobs", () => {
  it("fans out independently persisted Social items and regenerates a field", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "phase2-success" },
    });
    const settings = {
      schemaVersion: "1.0",
      campaignName: "Worker Social campaign",
      platforms: ["INSTAGRAM", "LINKEDIN"],
      objectives: ["AWARENESS"],
      contentTypes: ["SOCIAL_POST", "SOCIAL_CAPTION"],
      quantity: 4,
      primaryCallToAction: "Explore the collection",
      toneOverride: "INHERIT",
      outputLanguage: "English",
      includeHashtags: true,
      mockScenario: "success",
    };
    const projectModule = await prisma.projectModule.create({
      data: {
        projectId: project.id,
        module: "SOCIAL",
        status: "GENERATING",
        settings,
      },
    });
    const parent = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "MODULE",
        scopeId: projectModule.id,
        module: "SOCIAL",
        status: "QUEUED",
        idempotencyKey: "social-worker-success",
        request: {
          kind: "SOCIAL_MODULE",
          batchKey: "worker-social",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          briefRevision: 1,
          settings,
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "plan", label: "Planning", ordinal: 1 },
            { key: "items", label: "Creating items", ordinal: 2 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    for (let index = 0; index < 5; index += 1)
      await expect(processNextJob(prisma)).resolves.toBe(true);

    const [completedParent, items] = await Promise.all([
      prisma.generationJob.findUniqueOrThrow({ where: { id: parent.id } }),
      prisma.contentItem.findMany({
        where: { projectId: project.id, module: "SOCIAL" },
        include: { versions: true, currentVersion: true },
      }),
    ]);
    expect(completedParent.status).toBe("COMPLETED");
    expect(items).toHaveLength(4);
    expect(items.every((item) => item.versions.length === 1)).toBe(true);
    expect(new Set(items.map((item) => item.identityKey)).size).toBe(4);

    const post = items.find((item) => item.type === "SOCIAL_POST")!;
    const regeneration = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "CONTENT_ITEM",
        scopeId: post.id,
        module: "SOCIAL",
        status: "QUEUED",
        idempotencyKey: "social-worker-post-body-regeneration",
        request: {
          kind: "SOCIAL_FIELD_REGENERATE",
          itemId: post.id,
          contentType: post.type,
          expectedCurrentVersionId: post.currentVersionId,
          brandProfileVersionId: project.currentBrandProfileVersionId,
          target: "POST_BODY",
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "generate", label: "Generating", ordinal: 1 },
            { key: "validate", label: "Validating", ordinal: 2 },
            { key: "save", label: "Saving", ordinal: 3 },
          ],
        },
      },
    });
    await expect(processNextJob(prisma)).resolves.toBe(true);
    const regenerated = await prisma.contentItem.findUniqueOrThrow({
      where: { id: post.id },
      include: { versions: true },
    });
    expect(regenerated.versions).toHaveLength(2);
    expect(regenerated.currentVersionId).not.toBe(post.currentVersionId);
    expect(
      regenerated.versions.some(
        (version) => version.sourceJobId === regeneration.id,
      ),
    ).toBe(true);
  });
});

describe("durable Ads jobs", () => {
  it("persists independent assets and replaces one variant with a complete version", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "phase2-success" },
    });
    const settings = {
      schemaVersion: "1.0",
      campaignName: "Worker Ads campaign",
      campaignObjective: "CONVERSIONS",
      channels: ["META_INSTAGRAM"],
      assetTypes: ["META_AD", "CREATIVE_BRIEF", "IMAGE_PROMPT_PACK"],
      offer: {
        name: "UrbanStride collection",
        description: "Fictional footwear for city movement.",
        differentiators: ["Everyday comfort"],
      },
      audience: {
        summary: "Urban professionals who walk and commute.",
        painPoints: ["Uncomfortable footwear"],
        desiredOutcomes: ["Comfort through the day"],
      },
      primaryConversionAction: "Explore the collection",
      variantsPerAsset: 2,
      outputLanguage: "English",
      mockScenario: "success",
    };
    const projectModule = await prisma.projectModule.create({
      data: {
        projectId: project.id,
        module: "ADS",
        status: "GENERATING",
        settings,
      },
    });
    const parent = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "MODULE",
        scopeId: projectModule.id,
        module: "ADS",
        status: "QUEUED",
        idempotencyKey: "ads-worker-success",
        request: {
          kind: "ADS_MODULE",
          batchKey: "worker-ads",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          briefRevision: 1,
          settings,
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "plan", label: "Planning", ordinal: 1 },
            { key: "assets", label: "Creating assets", ordinal: 2 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    for (let index = 0; index < 4; index += 1)
      await expect(processNextJob(prisma)).resolves.toBe(true);
    const [completedParent, assets] = await Promise.all([
      prisma.generationJob.findUniqueOrThrow({ where: { id: parent.id } }),
      prisma.contentItem.findMany({
        where: { projectId: project.id, module: "ADS" },
        include: { versions: true, currentVersion: true },
      }),
    ]);
    expect(completedParent.status).toBe("COMPLETED");
    expect(assets).toHaveLength(3);
    expect(assets.every((asset) => asset.versions.length === 1)).toBe(true);

    const meta = assets.find((asset) => asset.type === "META_AD")!;
    await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "CONTENT_ITEM",
        scopeId: meta.id,
        module: "ADS",
        status: "QUEUED",
        idempotencyKey: "ads-worker-variant-regeneration",
        request: {
          kind: "ADS_VARIANT_REGENERATE",
          itemId: meta.id,
          contentType: meta.type,
          expectedCurrentVersionId: meta.currentVersionId,
          brandProfileVersionId: project.currentBrandProfileVersionId,
          target: { kind: "VARIANT", variantId: "variant-1" },
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "generate", label: "Generating", ordinal: 1 },
            { key: "validate", label: "Validating", ordinal: 2 },
            { key: "save", label: "Saving", ordinal: 3 },
          ],
        },
      },
    });
    await expect(processNextJob(prisma)).resolves.toBe(true);
    const regenerated = await prisma.contentItem.findUniqueOrThrow({
      where: { id: meta.id },
      include: { versions: true },
    });
    expect(regenerated.versions).toHaveLength(2);
    expect(regenerated.currentVersionId).not.toBe(meta.currentVersionId);
  });
});

describe("durable Video jobs", () => {
  it("persists independent planning assets and regenerates a scene without replacing history", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "phase2-success" },
    });
    const settings = {
      schemaVersion: "1.0",
      campaignName: "Worker Video campaign",
      platforms: ["INSTAGRAM_REELS"],
      formats: ["REEL"],
      objectives: ["AWARENESS"],
      assetTypes: [
        "VIDEO_SCRIPT",
        "SHOT_LIST",
        "VOICE_OVER_SCRIPT",
        "VIDEO_CAPTION",
        "VIDEO_PRODUCTION_BRIEF",
      ],
      conceptCount: 1,
      duration: { range: "UP_TO_30_SECONDS" },
      topic: "Comfort for daily city movement",
      presenterStyle: "MIXED",
      outputLanguage: "English",
      includeOnScreenText: true,
      includeVoiceOver: true,
      includeCaption: true,
      includeShotList: true,
      mockScenario: "success",
    };
    const projectModule = await prisma.projectModule.create({
      data: {
        projectId: project.id,
        module: "VIDEO",
        status: "GENERATING",
        settings,
      },
    });
    const parent = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "MODULE",
        scopeId: projectModule.id,
        module: "VIDEO",
        status: "QUEUED",
        idempotencyKey: "video-worker-success",
        request: {
          kind: "VIDEO_MODULE",
          batchKey: "worker-video",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          briefRevision: 1,
          settings,
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "plan", label: "Planning", ordinal: 1 },
            { key: "assets", label: "Creating assets", ordinal: 2 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    for (let index = 0; index < 6; index += 1)
      await expect(processNextJob(prisma)).resolves.toBe(true);

    const [completedParent, assets] = await Promise.all([
      prisma.generationJob.findUniqueOrThrow({ where: { id: parent.id } }),
      prisma.contentItem.findMany({
        where: { projectId: project.id, module: "VIDEO" },
        include: { versions: true, currentVersion: true },
      }),
    ]);
    expect(completedParent.status).toBe("COMPLETED");
    expect(assets).toHaveLength(5);
    expect(assets.every((asset) => asset.versions.length === 1)).toBe(true);
    expect(
      assets.every(
        (asset) =>
          asset.sourceBrandProfileVersionId ===
          project.currentBrandProfileVersionId,
      ),
    ).toBe(true);

    const script = assets.find((asset) => asset.type === "VIDEO_SCRIPT")!;
    const originalSnapshot = script.currentVersion!.snapshot as {
      scenes: { id: string }[];
    };
    const originalSceneId = originalSnapshot.scenes[0]!.id;
    const regeneration = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "CONTENT_ITEM",
        scopeId: script.id,
        module: "VIDEO",
        status: "QUEUED",
        idempotencyKey: "video-worker-scene-regeneration",
        request: {
          kind: "VIDEO_SCENE_REGENERATE",
          itemId: script.id,
          contentType: script.type,
          expectedCurrentVersionId: script.currentVersionId,
          brandProfileVersionId: project.currentBrandProfileVersionId,
          target: { kind: "SCENE", sceneId: originalSceneId },
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "generate", label: "Generating", ordinal: 1 },
            { key: "validate", label: "Validating", ordinal: 2 },
            { key: "save", label: "Saving", ordinal: 3 },
          ],
        },
      },
    });
    await expect(processNextJob(prisma)).resolves.toBe(true);
    const regenerated = await prisma.contentItem.findUniqueOrThrow({
      where: { id: script.id },
      include: { versions: { orderBy: { versionNumber: "asc" } } },
    });
    expect(regenerated.versions).toHaveLength(2);
    expect(regenerated.currentVersionId).not.toBe(script.currentVersionId);
    expect(regenerated.versions[1]?.source).toBe("REGENERATED");
    expect(regenerated.versions[1]?.sourceJobId).toBe(regeneration.id);
    const newSnapshot = regenerated.versions[1]!.snapshot as {
      scenes: { id: string }[];
    };
    expect(newSnapshot.scenes[0]?.id).toBe(originalSceneId);
  });

  it("keeps current content unchanged when targeted output is invalid", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "phase2-success" },
    });
    const item = await prisma.contentItem.findFirstOrThrow({
      where: { projectId: project.id, module: "VIDEO", type: "VIDEO_SCRIPT" },
      include: { currentVersion: true },
    });
    const originalVersionId = item.currentVersionId;
    await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "CONTENT_ITEM",
        scopeId: item.id,
        module: "VIDEO",
        status: "QUEUED",
        idempotencyKey: "video-worker-stale-regeneration",
        request: {
          kind: "VIDEO_ITEM_REGENERATE",
          itemId: item.id,
          contentType: item.type,
          expectedCurrentVersionId: "stale-version-id",
          brandProfileVersionId: project.currentBrandProfileVersionId,
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "generate", label: "Generating", ordinal: 1 },
            { key: "validate", label: "Validating", ordinal: 2 },
            { key: "save", label: "Saving", ordinal: 3 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    await expect(processNextJob(prisma)).resolves.toBe(true);
    const unchanged = await prisma.contentItem.findUniqueOrThrow({
      where: { id: item.id },
      include: { versions: true },
    });
    expect(unchanged.currentVersionId).toBe(originalVersionId);
    expect(unchanged.versions).toHaveLength(2);
  });
});

describe("durable General Copy jobs", () => {
  it("persists a partial-safe pack and retains history on regeneration", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: "phase2-success" },
    });
    const settings = {
      schemaVersion: "1.0",
      campaignName: "Worker Copy campaign",
      copyTypes: ["MARKETING_EMAIL", "PRODUCT_DESCRIPTION", "FAQ_DOCUMENT"],
      quantity: 3,
      purpose: "CONVERT",
      topic: "Comfort for daily city movement",
      audience: {
        summary: "Urban professionals who walk or commute daily",
        awarenessLevel: "SOLUTION_AWARE",
      },
      desiredAction: "Explore the collection",
      toneOverride: "BRAND_DEFAULT",
      lengthPreference: { value: "MEDIUM" },
      outputLanguage: "English",
      mockScenario: "success",
    };
    const projectModule = await prisma.projectModule.create({
      data: {
        projectId: project.id,
        module: "COPY",
        status: "GENERATING",
        settings,
      },
    });
    const parent = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "MODULE",
        scopeId: projectModule.id,
        module: "COPY",
        status: "QUEUED",
        idempotencyKey: "copy-worker-success",
        request: {
          kind: "COPY_MODULE",
          batchKey: "worker-copy",
          brandProfileVersionId: project.currentBrandProfileVersionId,
          settings,
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "plan", label: "Planning", ordinal: 1 },
            { key: "assets", label: "Creating assets", ordinal: 2 },
          ],
        },
      },
    });
    const { processNextJob } =
      await import("../../src/workers/generation-worker");
    for (let index = 0; index < 4; index += 1)
      await expect(processNextJob(prisma)).resolves.toBe(true);
    const assets = await prisma.contentItem.findMany({
      where: {
        projectId: project.id,
        module: "COPY",
        type: { not: "FOUNDATION_COPY" },
      },
      include: { versions: true, currentVersion: true },
    });
    expect(
      await prisma.generationJob.findUniqueOrThrow({
        where: { id: parent.id },
      }),
    ).toMatchObject({ status: "COMPLETED" });
    expect(assets).toHaveLength(3);
    expect(assets.every((asset) => asset.versions.length === 1)).toBe(true);

    const email = assets.find((asset) => asset.type === "MARKETING_EMAIL")!;
    await prisma.generationJob.create({
      data: {
        projectId: project.id,
        scopeType: "CONTENT_ITEM",
        scopeId: email.id,
        module: "COPY",
        status: "QUEUED",
        idempotencyKey: "copy-worker-field-regeneration",
        request: {
          kind: "COPY_FIELD_REGENERATE",
          itemId: email.id,
          contentType: email.type,
          expectedCurrentVersionId: email.currentVersionId,
          brandProfileVersionId: project.currentBrandProfileVersionId,
          target: { kind: "FIELD", field: "SUBJECT_LINE" },
        },
        steps: {
          create: [
            { key: "prepare", label: "Preparing", ordinal: 0 },
            { key: "generate", label: "Generating", ordinal: 1 },
            { key: "validate", label: "Validating", ordinal: 2 },
            { key: "save", label: "Saving", ordinal: 3 },
          ],
        },
      },
    });
    await expect(processNextJob(prisma)).resolves.toBe(true);
    const regenerated = await prisma.contentItem.findUniqueOrThrow({
      where: { id: email.id },
      include: { versions: true },
    });
    expect(regenerated.versions).toHaveLength(2);
    expect(regenerated.currentVersionId).not.toBe(email.currentVersionId);
  });
});
