import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BrandProfileSchema } from "@/domain/brand-profile/brand-profile-schema";
import { ContentProvenanceSchema } from "@/domain/content/content-schemas";
import {
  WebsiteGenerationRequestSchema,
  WebsitePageSnapshotSchema,
  type WebsitePageSnapshot,
  type WebsitePageType,
} from "@/domain/website/website-schemas";
import { createContentVersion } from "@/server/services/content-version-service";
import { generateProductionSnapshot } from "@/server/ai/generation-executor";
type Job = {
  id: string;
  projectId: string;
  request: unknown;
  leaseToken: string | null;
};

type PageRequest = {
  kind:
    | "WEBSITE_PAGE_NEW"
    | "WEBSITE_PAGE_REGENERATE"
    | "WEBSITE_SECTION_REGENERATE";
  itemId?: string;
  pageKey?: string;
  pageType?: WebsitePageType;
  pageName?: string;
  purpose?: string;
  expectedCurrentVersionId?: string;
  sectionId?: string;
  brandProfileVersionId: string;
  scenario?: string;
};

function provenance(jobId: string, brandProfileVersionId: string) {
  return ContentProvenanceSchema.parse({
    provider: "mock",
    model: "mock-website-v1",
    promptVersion: "website-page-1.0",
    schemaVersion: "1.0",
    requestId: jobId,
    generationJobId: jobId,
    brandProfileVersionId,
    generatedAt: new Date(0).toISOString(),
    mock: true,
  });
}

function mockPage(
  request: PageRequest,
  brand: ReturnType<typeof BrandProfileSchema.parse>,
  jobId: string,
): WebsitePageSnapshot {
  const name = request.pageName ?? "Website page";
  const key = request.pageKey ?? "page";
  const prov = provenance(jobId, request.brandProfileVersionId);
  return WebsitePageSnapshotSchema.parse({
    schemaVersion: "1.0",
    pageKey: key,
    pageType: request.pageType ?? "CUSTOM",
    pageName: name,
    purpose: request.purpose ?? `Explain ${brand.valueProposition}`,
    targetAudience: brand.targetAudienceSummary,
    seo: {
      title: `${name} | ${brand.slogan}`.slice(0, 70),
      metaDescription: `${brand.brandSummary} ${brand.valueProposition}`.slice(
        0,
        180,
      ),
      primaryKeyword: name.toLowerCase(),
      secondaryKeywords: brand.wordsToUse.slice(0, 4),
    },
    hero: {
      eyebrow: brand.brandPromise,
      headline:
        request.pageType === "HOME"
          ? brand.slogan
          : `${name} for your next step`,
      supportingText: brand.valueProposition,
      primaryCTA: brand.primaryCallsToAction[0],
    },
    sections: [
      {
        id: `${key}-intro`,
        type: "INTRO",
        heading: `Why ${name} matters`,
        body: brand.brandSummary,
      },
      {
        id: `${key}-benefits`,
        type: "BENEFITS",
        heading: "What you gain",
        items: brand.keyMarketingMessages.slice(0, 3).map((message, index) => ({
          title: `Benefit ${index + 1}`,
          description: message,
        })),
      },
      {
        id: `${key}-cta`,
        type: "CTA",
        heading: "Ready to move forward?",
        body: brand.brandPromise,
        callToAction: brand.primaryCallsToAction[0],
      },
    ],
    finalCTA: {
      heading: brand.slogan,
      body: brand.valueProposition,
      callToAction: brand.primaryCallsToAction[0],
    },
    provenance: prov,
  });
}

async function aggregateParent(prisma: PrismaClient, parentJobId: string) {
  const children = await prisma.generationJob.findMany({
    where: { parentJobId },
    select: { status: true },
  });
  const terminal = children.every((child) =>
    ["COMPLETED", "FAILED", "CANCELLED"].includes(child.status),
  );
  if (!terminal) return;
  const complete = children.filter(
    (child) => child.status === "COMPLETED",
  ).length;
  const status =
    complete === children.length
      ? "COMPLETED"
      : complete > 0
        ? "PARTIAL"
        : "FAILED";
  const parent = await prisma.generationJob.update({
    where: { id: parentJobId },
    data: {
      status,
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "PAGE_GENERATION_FAILED",
    },
  });
  await prisma.generationJobStep.update({
    where: { jobId_key: { jobId: parentJobId, key: "pages" } },
    data: {
      status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      safeErrorCode: status === "COMPLETED" ? null : "PAGE_GENERATION_FAILED",
    },
  });
  await prisma.projectModule.updateMany({
    where: { projectId: parent.projectId, module: "WEBSITE" },
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
  if (parentJobId) await aggregateParent(prisma, parentJobId);
}

export async function handleWebsiteJob(prisma: PrismaClient, job: Job) {
  const stored = await prisma.generationJob.findUnique({
    where: { id: job.id },
    select: { parentJobId: true, mode: true, briefRevision: true },
  });
  const raw = job.request as { kind?: string };
  if (raw.kind === "WEBSITE_MODULE") {
    try {
      const request = job.request as {
        kind: "WEBSITE_MODULE";
        brandProfileVersionId: string;
        settings: unknown;
      };
      const settings = WebsiteGenerationRequestSchema.parse(request.settings);
      const pages = settings.selectedPages.map((pageType) => ({
        pageKey: pageType.toLowerCase(),
        pageType,
        pageName:
          pageType === "HOME"
            ? "Home"
            : pageType.charAt(0) + pageType.slice(1).toLowerCase(),
        purpose: `${pageType} page supporting ${settings.websiteObjective}`,
      }));
      pages.push(
        ...settings.additionalPages.map((page) => ({
          pageKey: page.key,
          pageType: "CUSTOM" as const,
          pageName: page.name,
          purpose: page.purpose,
        })),
      );
      await prisma.$transaction(async (tx) => {
        for (const page of pages) {
          const idempotencyKey = `${job.id}:${page.pageKey}`;
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
              scopeId: page.pageKey,
              module: "WEBSITE",
              status: "QUEUED",
              mode: stored?.mode ?? "MOCK",
              provider: stored?.mode === "REAL" ? "OPENAI" : "MOCK",
              briefRevision: stored?.briefRevision ?? null,
              promptKey: `website.${page.pageType.toLocaleLowerCase()}.generation`,
              promptVersion: "1.0.0",
              generationPurpose: "ITEM_GENERATION",
              idempotencyKey,
              request: {
                kind: "WEBSITE_PAGE_NEW",
                ...page,
                brandProfileVersionId: request.brandProfileVersionId,
                scenario:
                  settings.mockScenario === "one-page-failure" &&
                  page.pageKey === pages.at(-1)?.pageKey
                    ? "failure"
                    : settings.mockScenario === "invalid-services-page" &&
                        page.pageType === "SERVICES"
                      ? "invalid"
                      : settings.mockScenario === "timeout-home-page" &&
                          page.pageType === "HOME"
                        ? "timeout"
                        : "success",
              } as Prisma.InputJsonValue,
              steps: {
                create: [
                  ["prepare", "Preparing project context"],
                  ["generate", `Generating ${page.pageName} page`],
                  ["validate", "Validating page structure"],
                  ["save", "Saving page content"],
                ].map((step, ordinal) => ({
                  key: step[0]!,
                  label: step[1]!,
                  ordinal,
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
          where: { jobId_key: { jobId: job.id, key: "pages" } },
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

  const request = job.request as PageRequest;
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
    let snapshot: WebsitePageSnapshot;
    const itemId = request.itemId;
    if (request.kind === "WEBSITE_PAGE_NEW") {
      snapshot = mockPage(request, brand, job.id);
      if (request.scenario === "invalid")
        (snapshot as unknown as { schemaVersion: string }).schemaVersion =
          "invalid";
      snapshot = WebsitePageSnapshotSchema.parse(snapshot);
      snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: snapshot,
          schema: WebsitePageSnapshotSchema,
          context: { request, brandProfile: brand },
          promptKey: `website.${(request.pageType ?? "custom").toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose: "ITEM_GENERATION",
        })
      ).snapshot;
      const existing = await prisma.contentItem.findFirst({
        where: {
          projectId: job.projectId,
          module: "WEBSITE",
          identityKey: snapshot.pageKey,
        },
      });
      if (!existing) {
        await prisma.$transaction(async (tx) => {
          const item = await tx.contentItem.create({
            data: {
              projectId: job.projectId,
              module: "WEBSITE",
              type: "WEBSITE_PAGE",
              identityKey: snapshot.pageKey,
              title: snapshot.pageName,
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
      if (!itemId || !request.expectedCurrentVersionId)
        throw new Error("INVALID_REQUEST");
      const item = await prisma.contentItem.findFirst({
        where: { id: itemId, projectId: job.projectId, module: "WEBSITE" },
        include: { currentVersion: true },
      });
      if (!item?.currentVersion) throw new Error("ITEM_NOT_FOUND");
      const current = WebsitePageSnapshotSchema.parse(
        item.currentVersion.snapshot,
      );
      snapshot = mockPage(
        {
          ...request,
          pageKey: current.pageKey,
          pageType: current.pageType,
          pageName: current.pageName,
          purpose: current.purpose,
        },
        brand,
        job.id,
      );
      if (request.kind === "WEBSITE_SECTION_REGENERATE") {
        const index = current.sections.findIndex(
          (section) => section.id === request.sectionId,
        );
        if (index < 0) throw new Error("SECTION_NOT_FOUND");
        const replacement = snapshot.sections.find(
          (section) => section.type === current.sections[index]?.type,
        );
        if (!replacement) throw new Error("INVALID_OUTPUT");
        snapshot = {
          ...current,
          sections: current.sections.map((section, currentIndex) =>
            currentIndex === index
              ? { ...replacement, id: section.id }
              : section,
          ),
          provenance: provenance(job.id, request.brandProfileVersionId),
        };
      }
      snapshot = (
        await generateProductionSnapshot(prisma, {
          jobId: job.id,
          candidate: snapshot,
          schema: WebsitePageSnapshotSchema,
          context: { request, brandProfile: brand, currentSnapshot: current },
          promptKey: `website.${current.pageType.toLocaleLowerCase()}.generation`,
          promptVersion: "1.0.0",
          purpose:
            request.kind === "WEBSITE_SECTION_REGENERATE"
              ? "SECTION_REGENERATION"
              : "WHOLE_ITEM_REGENERATION",
        })
      ).snapshot;
      const result = await createContentVersion(prisma, {
        itemId,
        expectedCurrentVersionId: request.expectedCurrentVersionId,
        snapshot,
        source: "REGENERATED",
        brandProfileVersionId: request.brandProfileVersionId,
        provenance: snapshot.provenance,
        sourceJobId: job.id,
        mock: snapshot.provenance.mock,
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
    await fail(
      prisma,
      job,
      error instanceof Error ? error.message : "INVALID_OUTPUT",
      stored?.parentJobId,
    );
  }
}
