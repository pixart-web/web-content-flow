import { gunzipSync, gzipSync } from "node:zlib";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  exportWorkspace,
  importWorkspace,
} from "../../src/server/workspace/workspace-package";

// LF-12 (doc 52): logical workspace package, export → import round trip.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const SOURCE = "wsp-source-owner";
const TARGET = "wsp-target-owner";
const FULL = "wsp-full-owner";
const BUSY = "wsp-busy-owner";
const owners = [SOURCE, TARGET, FULL, BUSY];
const embedding = new Uint8Array(new Float32Array([0.6, 0.8]).buffer);

async function cleanup() {
  await prisma.project.deleteMany({ where: { userId: { in: owners } } });
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
}

async function seedSourceProject() {
  const project = await prisma.project.create({
    data: {
      id: "wsp-project",
      userId: SOURCE,
      name: "Sapatilhas",
      brandName: "Passo Leve",
      type: "E-commerce",
      status: "ACTIVE",
      outputLanguage: "Portuguese",
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      brief: {
        create: {
          schemaVersion: "1",
          revision: 3,
          data: { brandName: "Passo Leve" },
        },
      },
      modules: {
        create: {
          id: "wsp-module",
          module: "COPY",
          status: "COMPLETE",
          settings: { tone: "warm" },
        },
      },
      brandProfile: { create: { id: "wsp-brand" } },
    },
  });
  await prisma.brandProfileVersion.create({
    data: {
      id: "wsp-bpv-1",
      brandProfileId: "wsp-brand",
      versionNumber: 1,
      schemaVersion: "1",
      snapshot: { voice: "warm" },
      source: "GENERATED",
      actorUserId: SOURCE,
      provenance: { provider: "ollama" },
    },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: { currentBrandProfileVersionId: "wsp-bpv-1" },
  });
  await prisma.generationJob.create({
    data: {
      id: "wsp-job-parent",
      projectId: project.id,
      scopeType: "MODULE",
      scopeId: "wsp-module",
      module: "COPY",
      status: "COMPLETED",
      mode: "REAL",
      provider: "LOCAL",
      idempotencyKey: "wsp-parent",
      request: { module: "COPY" },
      leaseToken: "should-not-travel",
      steps: { create: { key: "generate", label: "Generate", ordinal: 1 } },
    },
  });
  await prisma.generationJob.create({
    data: {
      id: "wsp-job-child",
      projectId: project.id,
      parentJobId: "wsp-job-parent",
      scopeType: "CONTENT_ITEM",
      module: "COPY",
      status: "COMPLETED",
      idempotencyKey: "wsp-child",
      request: {},
    },
  });
  await prisma.knowledgeDocument.create({
    data: {
      id: "wsp-doc",
      projectId: project.id,
      title: "Ficha",
      mediaType: "text/markdown",
      content: "Sola de borracha natural.",
      byteSize: 25,
      contentSha256: "a".repeat(64),
      status: "INDEXED",
      chunks: {
        create: {
          id: "wsp-chunk",
          projectId: project.id,
          ordinal: 0,
          text: "Sola de borracha natural.",
          tokenEstimate: 6,
          embedding,
          embeddingModel: "bge-m3",
          embeddingDims: 2,
        },
      },
    },
  });
  await prisma.contentItem.create({
    data: {
      id: "wsp-item",
      projectId: project.id,
      module: "COPY",
      type: "email",
      identityKey: "email-1",
      title: "Email de lançamento",
      status: "APPROVED",
      sourceJobId: "wsp-job-child",
      sourceBrandProfileVersionId: "wsp-bpv-1",
    },
  });
  await prisma.contentItemVersion.createMany({
    data: [
      {
        id: "wsp-civ-1",
        contentItemId: "wsp-item",
        versionNumber: 1,
        schemaVersion: "1",
        snapshot: { body: "v1" },
        source: "GENERATED",
        sourceJobId: "wsp-job-child",
        brandProfileVersionId: "wsp-bpv-1",
        provenance: { knowledgeChunkIds: ["wsp-chunk", "gone"] },
      },
      {
        id: "wsp-civ-2",
        contentItemId: "wsp-item",
        versionNumber: 2,
        schemaVersion: "1",
        snapshot: { body: "v2" },
        source: "MANUAL_EDIT",
        brandProfileVersionId: "wsp-bpv-1",
        actorUserId: SOURCE,
        provenance: {},
      },
    ],
  });
  await prisma.contentItem.update({
    where: { id: "wsp-item" },
    data: { currentVersionId: "wsp-civ-2" },
  });
  await prisma.generationUsage.create({
    data: {
      projectId: project.id,
      userId: SOURCE,
      generationJobId: "wsp-job-child",
      contentItemVersionId: "wsp-civ-1",
      provider: "LOCAL",
      modelId: "gemma4:12b-it-qat",
      modelTier: "STANDARD",
      promptKey: "copy",
      promptVersion: "1.2.0",
      generationPurpose: "ITEM_GENERATION",
      attemptNumber: 1,
      totalTokens: 1234,
      estimatedCostMinorUnits: BigInt("12345678901234"),
      usageSource: "PROVIDER_REPORTED",
    },
  });
}

beforeAll(async () => {
  await cleanup();
  await prisma.user.createMany({
    data: [
      { id: SOURCE, email: "wsp-source@test.invalid", plan: "INTERNAL" },
      { id: TARGET, email: "wsp-target@test.invalid", plan: "INTERNAL" },
      { id: FULL, email: "wsp-full@test.invalid", plan: "FREE" },
      { id: BUSY, email: "wsp-busy@test.invalid", plan: "INTERNAL" },
    ],
  });
  await seedSourceProject();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function exportSource() {
  const result = await exportWorkspace(prisma, {
    userId: SOURCE,
    appRelease: "test",
    databaseMigration: "test-migration",
    now: new Date("2026-11-20T12:00:00.000Z"),
  });
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe("workspace package", () => {
  it("exports every project without secrets or lease state", async () => {
    const result = await exportSource();
    expect(result.filename).toBe(
      "web-content-flow-workspace-2026-11-20.json.gz",
    );
    expect(result.projects).toBe(1);
    const text = gunzipSync(result.bytes).toString("utf8");
    expect(text).not.toContain("should-not-travel");
    expect(text).not.toContain("wsp-source@test.invalid");
    expect(text).not.toContain(SOURCE);
  });

  it("imports into another owner with new IDs and the same content", async () => {
    const { bytes } = await exportSource();
    const result = await importWorkspace(prisma, { userId: TARGET, bytes });
    expect(result).toMatchObject({
      ok: true,
      summary: {
        projects: 1,
        contentItems: 1,
        contentVersions: 2,
        brandProfileVersions: 1,
        knowledgeDocuments: 1,
        jobs: 2,
      },
    });
    if (!result.ok) return;
    const projectId = result.projectIds[0]!;
    expect(projectId).not.toBe("wsp-project");
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        brief: true,
        modules: true,
        currentBrandProfileVersion: true,
        contentItems: { include: { versions: true, currentVersion: true } },
        generationJobs: { include: { steps: true } },
        generationUsage: true,
        knowledgeChunks: true,
        knowledgeDocuments: true,
      },
    });
    expect(project).toMatchObject({
      userId: TARGET,
      name: "Sapatilhas",
      status: "ACTIVE",
      outputLanguage: "Portuguese",
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      brief: { revision: 3, data: { brandName: "Passo Leve" } },
      currentBrandProfileVersion: {
        snapshot: { voice: "warm" },
        actorUserId: TARGET,
      },
    });
    const item = project.contentItems[0]!;
    expect(item.currentVersion?.snapshot).toEqual({ body: "v2" });
    expect(item.currentVersion?.actorUserId).toBe(TARGET);
    const generated = item.versions.find((v) => v.versionNumber === 1)!;
    const chunk = project.knowledgeChunks[0]!;
    expect(chunk.id).not.toBe("wsp-chunk");
    expect(generated.provenance).toEqual({ knowledgeChunkIds: [chunk.id] });
    expect(Buffer.from(chunk.embedding!)).toEqual(Buffer.from(embedding));
    expect(project.knowledgeDocuments[0]!.status).toBe("INDEXED");
    const parent = project.generationJobs.find((j) => j.steps.length === 1)!;
    const child = project.generationJobs.find((j) => j.parentJobId)!;
    expect(child.parentJobId).toBe(parent.id);
    expect(parent.scopeId).toBe(project.modules[0]!.id);
    expect(parent.leaseToken).toBeNull();
    expect(item.sourceJobId).toBe(child.id);
    expect(generated.sourceJobId).toBe(child.id);
    expect(project.generationUsage[0]).toMatchObject({
      userId: TARGET,
      generationJobId: child.id,
      contentItemVersionId: generated.id,
      totalTokens: 1234,
      estimatedCostMinorUnits: BigInt("12345678901234"),
    });
  });

  it("imports into the same owner as a copy and leaves the original alone", async () => {
    const { bytes } = await exportSource();
    const result = await importWorkspace(prisma, { userId: SOURCE, bytes });
    expect(result.ok).toBe(true);
    expect(await prisma.project.count({ where: { userId: SOURCE } })).toBe(2);
    const original = await prisma.contentItem.findUniqueOrThrow({
      where: { id: "wsp-item" },
    });
    expect(original.currentVersionId).toBe("wsp-civ-2");
  });

  it("rejects damaged, foreign and newer packages without writing", async () => {
    const before = await prisma.project.count({ where: { userId: TARGET } });
    const { bytes } = await exportSource();
    const value = JSON.parse(gunzipSync(bytes).toString("utf8"));
    const broken = structuredClone(value);
    broken.projects[0].contentItems[0].currentVersionId = "missing";
    const newer = { ...value, formatVersion: 2 };
    const cases = [
      { bytes: Buffer.from("not gzip"), code: "INVALID" },
      { bytes: gzipSync('{"format":"other"}'), code: "INVALID" },
      { bytes: gzipSync(JSON.stringify(broken)), code: "INVALID" },
      { bytes: gzipSync(JSON.stringify(newer)), code: "UNSUPPORTED" },
    ];
    for (const entry of cases)
      expect(
        await importWorkspace(prisma, { userId: TARGET, bytes: entry.bytes }),
      ).toMatchObject({ ok: false, code: entry.code });
    expect(await prisma.project.count({ where: { userId: TARGET } })).toBe(
      before,
    );
  });

  it("respects the plan's project limit", async () => {
    const { bytes } = await exportSource();
    const value = JSON.parse(gunzipSync(bytes).toString("utf8"));
    const four = {
      ...value,
      projects: [0, 1, 2, 3].map((n) => ({
        ...value.projects[0],
        id: `p${n}`,
        modules: [],
        brandProfile: null,
        currentBrandProfileVersionId: null,
        jobs: [],
        contentItems: [],
        usage: [],
        knowledgeDocuments: [],
      })),
    };
    expect(
      await importWorkspace(prisma, {
        userId: FULL,
        bytes: gzipSync(JSON.stringify(four)),
      }),
    ).toMatchObject({ ok: false, code: "PROJECT_LIMIT" });
    expect(await prisma.project.count({ where: { userId: FULL } })).toBe(0);
  });

  it("refuses to export while a generation is running", async () => {
    await prisma.project.create({
      data: {
        id: "wsp-busy-project",
        userId: BUSY,
        name: "b",
        brandName: "b",
        type: "E-commerce",
        generationJobs: {
          create: {
            scopeType: "MODULE",
            module: "COPY",
            status: "RUNNING",
            idempotencyKey: "busy",
            request: {},
          },
        },
      },
    });
    expect(
      await exportWorkspace(prisma, {
        userId: BUSY,
        appRelease: "test",
        databaseMigration: "test",
      }),
    ).toMatchObject({ ok: false, code: "ACTIVE_JOBS", activeJobs: 1 });
  });
});
