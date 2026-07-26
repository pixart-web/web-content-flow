import Link from "next/link";
import { notFound } from "next/navigation";

import { FoundationCopySnapshotSchema } from "@/domain/content/content-schemas";
import { ContentItemEditor } from "@/features/content/content-item-editor";
import { WebsitePageSnapshotSchema } from "@/domain/website/website-schemas";
import { WebsitePageEditor } from "@/features/website/website-page-editor";
import { SocialSnapshotSchema } from "@/domain/social/social-schemas";
import { SocialItemEditor } from "@/features/social/social-item-editor";
import { AdsSnapshotSchema } from "@/domain/ads/ads-schemas";
import { AdsItemEditor } from "@/features/ads/ads-item-editor";
import { VideoSnapshotSchema } from "@/domain/video/video-schemas";
import { VideoItemEditor } from "@/features/video/video-item-editor";
import {
  GeneralCopySnapshotSchema,
  GeneralCopyTypeSchema,
} from "@/domain/copy/copy-schemas";
import { CopyItemEditor } from "@/features/copy/copy-item-editor";
import {
  CalendarContentTypeSchema,
  CalendarSnapshotSchema,
} from "@/domain/calendar/calendar-schemas";
import { CalendarItemEditor } from "@/features/calendar/calendar-item-editor";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ projectId: string; module: string; itemId: string }>;
}) {
  const { projectId, module, itemId } = await params;
  if (
    !["copy", "website", "social", "ads", "video", "calendar"].includes(module)
  )
    notFound();
  const user = await requireUser(
    `/app/projects/${projectId}/content/${module}/${itemId}`,
  );
  const repository = createContentRepository(getPrisma());
  const item = await repository.findOwnedItemInRoute(
    user.id,
    projectId,
    module === "website"
      ? "WEBSITE"
      : module === "social"
        ? "SOCIAL"
        : module === "ads"
          ? "ADS"
          : module === "video"
            ? "VIDEO"
            : module === "calendar"
              ? "CALENDAR"
              : "COPY",
    itemId,
  );
  if (!item?.currentVersion) notFound();
  if (module === "calendar") {
    const type = CalendarContentTypeSchema.safeParse(item.type);
    const calendar = CalendarSnapshotSchema.safeParse(
      item.currentVersion.snapshot,
    );
    if (
      !type.success ||
      !calendar.success ||
      calendar.data.contentType !== type.data
    )
      notFound();
    const [versions, sources] = await Promise.all([
      repository.listOwnedVersions(user.id, item.id),
      getPrisma().contentItem.findMany({
        where: {
          projectId,
          module: { in: ["WEBSITE", "SOCIAL", "ADS", "VIDEO", "COPY"] },
          currentVersionId: { not: null },
          project: { userId: user.id },
        },
        select: {
          id: true,
          title: true,
          type: true,
          module: true,
          currentVersionId: true,
          sourceBrandProfileVersionId: true,
          currentVersion: { select: { mock: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
    ]);
    return (
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-secondary text-sm">
          <Link
            className="text-link"
            href={`/app/projects/${projectId}/content/calendar`}
          >
            Content Calendar
          </Link>{" "}
          / {item.title}
        </nav>
        <header>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="bg-surface-selected rounded-pill px-3 py-1">
              {calendar.data.contentType.replaceAll("_", " ")}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              Mock
            </span>
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-secondary mt-2 text-sm">
            Uses Brand Profile v{item.sourceBrandProfileVersion.versionNumber}.
            Linked source versions and calendar history never update silently.
          </p>
          <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
            Planning only — no content was published or externally scheduled.
          </p>
        </header>
        <CalendarItemEditor
          currentVersionId={item.currentVersion.id}
          itemId={item.id}
          projectId={projectId}
          snapshot={calendar.data}
          sources={sources.flatMap((source) =>
            source.currentVersionId &&
            source.currentVersion &&
            source.module !== "CALENDAR"
              ? [
                  {
                    id: source.id,
                    title: source.title,
                    type: source.type,
                    module: source.module,
                    currentVersionId: source.currentVersionId,
                    mock: source.currentVersion.mock,
                    brandProfileVersionId: source.sourceBrandProfileVersionId,
                  },
                ]
              : [],
          )}
          versions={versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            source: version.source,
            createdAt: version.createdAt.toISOString(),
            brandProfileVersion: version.brandProfileVersion.versionNumber,
            mock: version.mock,
            current: version.id === item.currentVersionId,
          }))}
        />
      </div>
    );
  }
  if (module === "video") {
    const videoSnapshot = VideoSnapshotSchema.safeParse(
      item.currentVersion.snapshot,
    );
    if (!videoSnapshot.success || videoSnapshot.data.contentType !== item.type)
      notFound();
    const versions = await repository.listOwnedVersions(user.id, item.id);
    return (
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-secondary text-sm">
          <Link
            className="text-link"
            href={`/app/projects/${projectId}/content/video`}
          >
            Video &amp; Reels
          </Link>{" "}
          / {item.title}
        </nav>
        <header>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="bg-surface-selected rounded-pill px-3 py-1">
              {videoSnapshot.data.platform}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {videoSnapshot.data.contentType.replaceAll("_", " ")}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {videoSnapshot.data.format.replaceAll("_", " ")}
            </span>
            {item.currentVersion.mock ? (
              <span className="border-default rounded-pill border px-3 py-1">
                Mock
              </span>
            ) : null}
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-secondary mt-2 text-sm">
            Uses Brand Profile v{item.sourceBrandProfileVersion.versionNumber}.
            Existing content does not change when the Brand Profile changes.
          </p>
          <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
            Production planning only. No playable or rendered media is
            available.
          </p>
        </header>
        <VideoItemEditor
          currentVersionId={item.currentVersion.id}
          itemId={item.id}
          projectId={projectId}
          snapshot={videoSnapshot.data}
          versions={versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            source: version.source,
            createdAt: version.createdAt.toISOString(),
            brandProfileVersion: version.brandProfileVersion.versionNumber,
            mock: version.mock,
            current: version.id === item.currentVersionId,
          }))}
        />
      </div>
    );
  }
  if (module === "ads") {
    const adsSnapshot = AdsSnapshotSchema.safeParse(
      item.currentVersion.snapshot,
    );
    if (!adsSnapshot.success || adsSnapshot.data.contentType !== item.type)
      notFound();
    const versions = await repository.listOwnedVersions(user.id, item.id);
    return (
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-secondary text-sm">
          <Link
            className="text-link"
            href={`/app/projects/${projectId}/content/ads`}
          >
            Ads &amp; Creative
          </Link>{" "}
          / {item.title}
        </nav>
        <header>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="bg-surface-selected rounded-pill px-3 py-1">
              {adsSnapshot.data.channel}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {adsSnapshot.data.contentType.replaceAll("_", " ")}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {adsSnapshot.data.campaignObjective}
            </span>
            {item.currentVersion.mock ? (
              <span className="border-default rounded-pill border px-3 py-1">
                Mock
              </span>
            ) : null}
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-secondary mt-2 text-sm">
            Uses Brand Profile v{item.sourceBrandProfileVersion.versionNumber}.
            Existing content does not change when the Brand Profile changes.
          </p>
          <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
            Review claims, disclosures and platform requirements before
            publishing.
          </p>
        </header>
        <AdsItemEditor
          currentVersionId={item.currentVersion.id}
          itemId={item.id}
          projectId={projectId}
          snapshot={adsSnapshot.data}
          versions={versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            source: version.source,
            createdAt: version.createdAt.toISOString(),
            brandProfileVersion: version.brandProfileVersion.versionNumber,
            mock: version.mock,
            current: version.id === item.currentVersionId,
          }))}
        />
      </div>
    );
  }
  if (module === "social") {
    if (
      ![
        "SOCIAL_POST",
        "SOCIAL_CAROUSEL",
        "SOCIAL_STORY",
        "SOCIAL_CAPTION",
      ].includes(item.type)
    )
      notFound();
    const socialSnapshot = SocialSnapshotSchema.safeParse(
      item.currentVersion.snapshot,
    );
    if (
      !socialSnapshot.success ||
      socialSnapshot.data.contentType !== item.type
    )
      notFound();
    const versions = await repository.listOwnedVersions(user.id, item.id);
    return (
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-secondary text-sm">
          <Link
            className="text-link"
            href={`/app/projects/${projectId}/content/social`}
          >
            Social
          </Link>{" "}
          / {item.title}
        </nav>
        <header>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="bg-surface-selected rounded-pill px-3 py-1">
              {socialSnapshot.data.platform}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {socialSnapshot.data.contentType.replace("SOCIAL_", "")}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {socialSnapshot.data.objective}
            </span>
            {item.currentVersion.mock ? (
              <span className="border-default rounded-pill border px-3 py-1">
                Mock
              </span>
            ) : null}
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-secondary mt-2 text-sm">
            Uses Brand Profile v{item.sourceBrandProfileVersion.versionNumber}.
            Existing content does not change when the Brand Profile changes.
          </p>
        </header>
        <SocialItemEditor
          currentVersionId={item.currentVersion.id}
          itemId={item.id}
          projectId={projectId}
          snapshot={socialSnapshot.data}
          versions={versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            source: version.source,
            createdAt: version.createdAt.toISOString(),
            brandProfileVersion: version.brandProfileVersion.versionNumber,
            mock: version.mock,
            current: version.id === item.currentVersionId,
          }))}
        />
      </div>
    );
  }
  if (module === "website") {
    if (item.type !== "WEBSITE_PAGE") notFound();
    const websiteSnapshot = WebsitePageSnapshotSchema.safeParse(
      item.currentVersion.snapshot,
    );
    if (!websiteSnapshot.success) notFound();
    const versions = await repository.listOwnedVersions(user.id, item.id);
    return (
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-secondary text-sm">
          <Link
            className="text-link"
            href={`/app/projects/${projectId}/content/website`}
          >
            Website
          </Link>{" "}
          / {item.title}
        </nav>
        <header>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="bg-surface-selected rounded-pill px-3 py-1">
              Website page
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {item.status}
            </span>
            {item.currentVersion.mock ? (
              <span className="border-default rounded-pill border px-3 py-1">
                Mock
              </span>
            ) : null}
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-secondary mt-2 text-sm">
            Uses Brand Profile v{item.sourceBrandProfileVersion.versionNumber}.
            Existing content does not change when the Brand Profile changes.
          </p>
        </header>
        <WebsitePageEditor
          projectId={projectId}
          itemId={item.id}
          currentVersionId={item.currentVersion.id}
          snapshot={websiteSnapshot.data}
          versions={versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            source: version.source,
            createdAt: version.createdAt.toISOString(),
            brandProfileVersion: version.brandProfileVersion.versionNumber,
            mock: version.mock,
            current: version.id === item.currentVersionId,
          }))}
        />
      </div>
    );
  }
  const copyType = GeneralCopyTypeSchema.safeParse(item.type);
  if (copyType.success) {
    const copySnapshot = GeneralCopySnapshotSchema.safeParse(
      item.currentVersion.snapshot,
    );
    if (
      !copySnapshot.success ||
      copySnapshot.data.contentType !== copyType.data
    )
      notFound();
    const versions = await repository.listOwnedVersions(user.id, item.id);
    return (
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-secondary text-sm">
          <Link
            className="text-link"
            href={`/app/projects/${projectId}/content/copy`}
          >
            General Copy
          </Link>{" "}
          / {item.title}
        </nav>
        <header>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="bg-surface-selected rounded-pill px-3 py-1">
              {copySnapshot.data.contentType.replaceAll("_", " ")}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {copySnapshot.data.purpose}
            </span>
            <span className="border-default rounded-pill border px-3 py-1">
              {copySnapshot.data.tone}
            </span>
            {item.currentVersion.mock ? (
              <span className="border-default rounded-pill border px-3 py-1">
                Mock
              </span>
            ) : null}
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-secondary mt-2 text-sm">
            Uses Brand Profile v{item.sourceBrandProfileVersion.versionNumber}.
            Existing content does not change when the Brand Profile changes.
          </p>
          <p className="border-default bg-surface-subtle rounded-control mt-3 border p-3 text-sm">
            Review factual claims and publication requirements before use.
          </p>
        </header>
        <CopyItemEditor
          currentVersionId={item.currentVersion.id}
          itemId={item.id}
          projectId={projectId}
          snapshot={copySnapshot.data}
          versions={versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            source: version.source,
            createdAt: version.createdAt.toISOString(),
            brandProfileVersion: version.brandProfileVersion.versionNumber,
            mock: version.mock,
            current: version.id === item.currentVersionId,
          }))}
        />
      </div>
    );
  }
  if (item.type !== "FOUNDATION_COPY") notFound();
  const snapshot = FoundationCopySnapshotSchema.safeParse(
    item.currentVersion.snapshot,
  );
  if (!snapshot.success) notFound();
  const [versions, job] = await Promise.all([
    repository.listOwnedVersions(user.id, item.id),
    getPrisma().generationJob.findFirst({
      where: {
        projectId,
        scopeType: "CONTENT_ITEM",
        scopeId: item.id,
        project: { userId: user.id },
      },
      orderBy: { createdAt: "desc" },
      include: { steps: { orderBy: { ordinal: "asc" } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-secondary text-sm">
        <Link className="text-link" href={`/app/projects/${projectId}/library`}>
          Library
        </Link>{" "}
        / {item.title}
      </nav>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-surface-selected rounded-pill px-3 py-1 text-xs font-semibold">
            Foundation content · platform proof
          </span>
          <span className="border-default rounded-pill border px-3 py-1 text-xs font-semibold">
            {item.status}
          </span>
          {item.currentVersion.mock ? (
            <span className="border-default rounded-pill border px-3 py-1 text-xs font-semibold">
              Mock
            </span>
          ) : null}
        </div>
        <h2 className="font-display mt-3 text-2xl font-semibold">
          {item.title}
        </h2>
        <p className="text-secondary mt-2 text-sm">
          Uses Brand Profile v{item.sourceBrandProfileVersion.versionNumber}.
          Existing content does not change when the Brand Profile changes.
        </p>
      </header>
      <ContentItemEditor
        currentVersionId={item.currentVersion.id}
        itemId={item.id}
        projectId={projectId}
        snapshot={snapshot.data}
        versions={versions.map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          source: version.source,
          createdAt: version.createdAt.toISOString(),
          brandProfileVersion: version.brandProfileVersion.versionNumber,
          mock: version.mock,
          current: version.id === item.currentVersionId,
        }))}
        {...(job && job.status !== "CANCELLED"
          ? {
              job: {
                id: job.id,
                status: job.status,
                mode: job.mode,
                attempt: job.attempt,
                maxAttempts: job.maxAttempts,
                safeErrorCode: job.safeErrorCode,
                steps: job.steps.map((step) => ({
                  key: step.key,
                  label: step.label,
                  status: step.status,
                })),
              },
            }
          : {})}
      />
    </div>
  );
}
