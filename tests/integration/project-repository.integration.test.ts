import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for integration tests.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

beforeAll(async () => {
  await prisma.session.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: "integration-owner-a", email: "owner-a@test.invalid" },
      { id: "integration-owner-b", email: "owner-b@test.invalid" },
    ],
  });
  await prisma.project.createMany({
    data: [
      {
        id: "integration-project-a",
        userId: "integration-owner-a",
        name: "Owner A Project",
        brandName: "Owner A",
        type: "Service",
      },
      {
        id: "integration-project-b",
        userId: "integration-owner-b",
        name: "Owner B Project",
        brandName: "Owner B",
        type: "E-commerce",
      },
    ],
  });
  const profile = await prisma.brandProfile.create({
    data: { projectId: "integration-project-a" },
  });
  const profileVersion = await prisma.brandProfileVersion.create({
    data: {
      brandProfileId: profile.id,
      versionNumber: 1,
      schemaVersion: "1.0",
      snapshot: {},
      source: "GENERATED",
      mock: true,
      provenance: {},
    },
  });
  await prisma.project.update({
    where: { id: "integration-project-a" },
    data: { currentBrandProfileVersionId: profileVersion.id },
  });
  const item = await prisma.contentItem.create({
    data: {
      id: "integration-content-item",
      projectId: "integration-project-a",
      module: "COPY",
      type: "FOUNDATION_COPY",
      title: "Integration foundation copy",
      sourceBrandProfileVersionId: profileVersion.id,
    },
  });
  const provenance = {
    provider: "mock",
    model: "mock-foundation-copy-v1",
    promptVersion: "foundation-copy-1.0",
    schemaVersion: "1.0",
    requestId: "integration-content-request",
    generationJobId: null,
    brandProfileVersionId: profileVersion.id,
    generatedAt: "2026-01-01T00:00:00.000Z",
    mock: true,
  };
  const version = await prisma.contentItemVersion.create({
    data: {
      id: "integration-content-v1",
      contentItemId: item.id,
      versionNumber: 1,
      schemaVersion: "1.0",
      snapshot: {
        schemaVersion: "1.0",
        title: "Integration foundation copy",
        objective: "Prove shared persistence",
        headline: "A shared content foundation",
        body: "Structured content stays versioned and owner scoped.",
        callToAction: "Review content",
      },
      source: "GENERATED",
      brandProfileVersionId: profileVersion.id,
      mock: true,
      provenance,
    },
  });
  await prisma.contentItem.update({
    where: { id: item.id },
    data: { currentVersionId: version.id },
  });
});

describe("content ownership and immutable versions", () => {
  it("returns items and versions only through project ownership", async () => {
    const { createContentRepository } =
      await import("../../src/server/repositories/content-repository");
    const repository = createContentRepository(prisma);
    await expect(
      repository.findOwnedItem(
        "integration-owner-a",
        "integration-content-item",
      ),
    ).resolves.toMatchObject({ title: "Integration foundation copy" });
    await expect(
      repository.findOwnedItem(
        "integration-owner-b",
        "integration-content-item",
      ),
    ).resolves.toBeNull();
    await expect(
      repository.findOwnedVersion(
        "integration-owner-b",
        "integration-content-v1",
      ),
    ).resolves.toBeNull();
  });

  it("creates a manual version and detects stale optimistic saves", async () => {
    const { createContentVersion } =
      await import("../../src/server/services/content-version-service");
    const item = await prisma.contentItem.findUniqueOrThrow({
      where: { id: "integration-content-item" },
      include: { currentVersion: true },
    });
    const provenance = item.currentVersion!.provenance;
    const result = await createContentVersion(prisma, {
      itemId: item.id,
      expectedCurrentVersionId: item.currentVersionId!,
      snapshot: {
        schemaVersion: "1.0",
        title: "Integration foundation copy",
        objective: "Prove immutable manual editing",
        headline: "A newer shared content foundation",
        body: "The previous version remains unchanged.",
        callToAction: "Review the latest",
      },
      source: "MANUAL_EDIT",
      brandProfileVersionId: item.currentVersion!.brandProfileVersionId,
      provenance,
      actorUserId: "integration-owner-a",
      mock: true,
    });
    expect(result).toMatchObject({ ok: true, value: { versionNumber: 2 } });
    const conflict = await createContentVersion(prisma, {
      itemId: item.id,
      expectedCurrentVersionId: item.currentVersionId!,
      snapshot: item.currentVersion!.snapshot as never,
      source: "MANUAL_EDIT",
      brandProfileVersionId: item.currentVersion!.brandProfileVersionId,
      provenance,
      mock: true,
    });
    expect(conflict).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      await prisma.contentItemVersion.count({
        where: { contentItemId: item.id },
      }),
    ).toBe(2);
  });

  it("keeps Library project and owner scoped", async () => {
    const { createContentRepository } =
      await import("../../src/server/repositories/content-repository");
    const repository = createContentRepository(prisma);
    await expect(
      repository.listProjectItems(
        "integration-owner-a",
        "integration-project-a",
        {},
      ),
    ).resolves.toHaveLength(1);
    await expect(
      repository.listProjectItems(
        "integration-owner-b",
        "integration-project-a",
        {},
      ),
    ).resolves.toHaveLength(0);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("project repository ownership", () => {
  it("lists only projects owned by the trusted user ID", async () => {
    const { createProjectRepository } =
      await import("../../src/server/repositories/project-repository");
    const projects = await createProjectRepository(prisma).listOwned(
      "integration-owner-a",
    );

    expect(projects.map((project) => project.id)).toEqual([
      "integration-project-a",
    ]);
  });

  it("opens an owned project", async () => {
    const { createProjectRepository } =
      await import("../../src/server/repositories/project-repository");
    const project = await createProjectRepository(prisma).findOwnedById(
      "integration-owner-a",
      "integration-project-a",
    );

    expect(project?.name).toBe("Owner A Project");
  });

  it("returns the same neutral null for unauthorized and missing projects", async () => {
    const { createProjectRepository } =
      await import("../../src/server/repositories/project-repository");
    const repository = createProjectRepository(prisma);

    await expect(
      repository.findOwnedById("integration-owner-a", "integration-project-b"),
    ).resolves.toBeNull();
    await expect(
      repository.findOwnedById("integration-owner-a", "missing-project"),
    ).resolves.toBeNull();
  });

  it("cannot accept a client-supplied owner inside project input", async () => {
    const { createProjectRepository } =
      await import("../../src/server/repositories/project-repository");
    const repository = createProjectRepository(prisma);

    expect(Object.keys(repository).sort()).toEqual([
      "findOwnedById",
      "listOwned",
      "owns",
    ]);
  });
});
