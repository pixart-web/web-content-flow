import Link from "next/link";
import { notFound } from "next/navigation";

import { LibraryFiltersSchema } from "@/domain/content/content-schemas";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createContentRepository } from "@/server/repositories/content-repository";
import { createPhase2Repository } from "@/server/repositories/phase-2-repository";
import { ContentJobStatus } from "@/features/content/content-job-status";
import { SocialSnapshotSchema } from "@/domain/social/social-schemas";
import { AdsSnapshotSchema } from "@/domain/ads/ads-schemas";
import { VideoSnapshotSchema } from "@/domain/video/video-schemas";
import {
  CopyPurposeSchema,
  GeneralCopySnapshotSchema,
  GeneralCopyTypeSchema,
} from "@/domain/copy/copy-schemas";
import {
  CalendarContentTypeSchema,
  CalendarSnapshotSchema,
} from "@/domain/calendar/calendar-schemas";

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const raw = await searchParams;
  const user = await requireUser(`/app/projects/${projectId}/library`);
  const project = await createPhase2Repository(getPrisma()).findOwnedProject(
    user.id,
    projectId,
  );
  if (!project) notFound();
  const filters = LibraryFiltersSchema.safeParse({
    ...(typeof raw.module === "string" && raw.module
      ? { module: raw.module }
      : {}),
    ...(typeof raw.status === "string" && raw.status
      ? { status: raw.status }
      : {}),
    ...(typeof raw.mock === "string" && raw.mock ? { mock: raw.mock } : {}),
    ...(typeof raw.query === "string" && raw.query ? { query: raw.query } : {}),
    ...(typeof raw.socialPlatform === "string" && raw.socialPlatform
      ? { socialPlatform: raw.socialPlatform }
      : {}),
    ...(typeof raw.socialType === "string" && raw.socialType
      ? { socialType: raw.socialType }
      : {}),
    ...(typeof raw.campaign === "string" && raw.campaign
      ? { campaign: raw.campaign }
      : {}),
    ...(typeof raw.adsChannel === "string" && raw.adsChannel
      ? { adsChannel: raw.adsChannel }
      : {}),
    ...(typeof raw.adsType === "string" && raw.adsType
      ? { adsType: raw.adsType }
      : {}),
    ...(typeof raw.videoPlatform === "string" && raw.videoPlatform
      ? { videoPlatform: raw.videoPlatform }
      : {}),
    ...(typeof raw.videoFormat === "string" && raw.videoFormat
      ? { videoFormat: raw.videoFormat }
      : {}),
    ...(typeof raw.videoType === "string" && raw.videoType
      ? { videoType: raw.videoType }
      : {}),
    ...(typeof raw.copyType === "string" && raw.copyType
      ? { copyType: raw.copyType }
      : {}),
    ...(typeof raw.copyPurpose === "string" && raw.copyPurpose
      ? { copyPurpose: raw.copyPurpose }
      : {}),
    ...(typeof raw.calendarType === "string" && raw.calendarType
      ? { calendarType: raw.calendarType }
      : {}),
    ...(typeof raw.calendarStart === "string" && raw.calendarStart
      ? { calendarStart: raw.calendarStart }
      : {}),
    ...(typeof raw.calendarEnd === "string" && raw.calendarEnd
      ? { calendarEnd: raw.calendarEnd }
      : {}),
  });
  const applied = filters.success ? filters.data : {};
  const [items, job] = await Promise.all([
    createContentRepository(getPrisma()).listProjectItems(user.id, projectId, {
      ...(applied.module ? { module: applied.module } : {}),
      ...(applied.status ? { status: applied.status } : {}),
      ...(applied.mock ? { mock: applied.mock === "true" } : {}),
      ...(applied.query ? { query: applied.query } : {}),
    }),
    getPrisma().generationJob.findFirst({
      where: {
        projectId,
        scopeType: "CONTENT_ITEM",
        project: { userId: user.id },
      },
      orderBy: { createdAt: "desc" },
      include: { steps: { orderBy: { ordinal: "asc" } } },
    }),
  ]);
  const visibleItems = items.filter((item) => {
    if (
      !applied.socialPlatform &&
      !applied.socialType &&
      !applied.campaign &&
      !applied.adsChannel &&
      !applied.adsType &&
      !applied.videoPlatform &&
      !applied.videoFormat &&
      !applied.videoType &&
      !applied.copyType &&
      !applied.copyPurpose &&
      !applied.calendarType &&
      !applied.calendarStart &&
      !applied.calendarEnd
    )
      return true;
    if (applied.adsChannel || applied.adsType) {
      if (item.module !== "ADS") return false;
      const ads = AdsSnapshotSchema.safeParse(item.currentVersion?.snapshot);
      if (!ads.success) return false;
      if (applied.adsChannel && ads.data.channel !== applied.adsChannel)
        return false;
      if (applied.adsType && ads.data.contentType !== applied.adsType)
        return false;
      return true;
    }
    if (
      applied.calendarType ||
      applied.calendarStart ||
      applied.calendarEnd ||
      (applied.module === "CALENDAR" && applied.campaign)
    ) {
      if (item.module !== "CALENDAR") return false;
      const calendar = CalendarSnapshotSchema.safeParse(
        item.currentVersion?.snapshot,
      );
      if (!calendar.success) return false;
      if (
        applied.calendarType &&
        calendar.data.contentType !== applied.calendarType
      )
        return false;
      const period =
        calendar.data.contentType === "CAMPAIGN_PLAN"
          ? {
              startDate: calendar.data.campaign.startDate,
              endDate: calendar.data.campaign.endDate,
            }
          : calendar.data.planningPeriod;
      if (applied.calendarStart && period.endDate < applied.calendarStart)
        return false;
      if (applied.calendarEnd && period.startDate > applied.calendarEnd)
        return false;
      if (applied.campaign) {
        const names =
          calendar.data.contentType === "CAMPAIGN_PLAN"
            ? [calendar.data.campaign.name]
            : calendar.data.contentType === "EDITORIAL_CALENDAR"
              ? (calendar.data.campaigns ?? []).map(({ name }) => name)
              : [];
        if (
          !names.some((name) =>
            name
              .toLocaleLowerCase()
              .includes(applied.campaign!.toLocaleLowerCase()),
          )
        )
          return false;
      }
      return true;
    }
    if (
      applied.copyType ||
      applied.copyPurpose ||
      (applied.module === "COPY" && applied.campaign)
    ) {
      if (item.module !== "COPY" || item.type === "FOUNDATION_COPY")
        return false;
      const copy = GeneralCopySnapshotSchema.safeParse(
        item.currentVersion?.snapshot,
      );
      if (!copy.success) return false;
      if (applied.copyType && copy.data.contentType !== applied.copyType)
        return false;
      if (applied.copyPurpose && copy.data.purpose !== applied.copyPurpose)
        return false;
      if (
        applied.campaign &&
        !copy.data.campaignName
          ?.toLocaleLowerCase()
          .includes(applied.campaign.toLocaleLowerCase())
      )
        return false;
      return true;
    }
    if (
      applied.videoPlatform ||
      applied.videoFormat ||
      applied.videoType ||
      (applied.module === "VIDEO" && applied.campaign)
    ) {
      if (item.module !== "VIDEO") return false;
      const video = VideoSnapshotSchema.safeParse(
        item.currentVersion?.snapshot,
      );
      if (!video.success) return false;
      if (
        applied.videoPlatform &&
        video.data.platform !== applied.videoPlatform
      )
        return false;
      if (applied.videoFormat && video.data.format !== applied.videoFormat)
        return false;
      if (applied.videoType && video.data.contentType !== applied.videoType)
        return false;
      if (
        applied.campaign &&
        !video.data.campaignName
          ?.toLocaleLowerCase()
          .includes(applied.campaign.toLocaleLowerCase())
      )
        return false;
      return true;
    }
    if (item.module !== "SOCIAL") return false;
    const snapshot = SocialSnapshotSchema.safeParse(
      item.currentVersion?.snapshot,
    );
    if (!snapshot.success) return false;
    if (
      applied.socialPlatform &&
      snapshot.data.platform !== applied.socialPlatform
    )
      return false;
    if (applied.socialType && snapshot.data.contentType !== applied.socialType)
      return false;
    if (
      applied.campaign &&
      !snapshot.data.campaignName
        ?.toLocaleLowerCase()
        .includes(applied.campaign.toLocaleLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold">Library</h2>
        <p className="text-secondary mt-2">
          Project content and its current immutable versions.
        </p>
      </header>
      {job && !["COMPLETED", "CANCELLED"].includes(job.status) ? (
        <ContentJobStatus
          projectId={projectId}
          initialJob={{
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
          }}
        />
      ) : null}
      <form className="border-default bg-surface rounded-card grid gap-3 border p-4 sm:grid-cols-4">
        <label className="text-sm font-semibold">
          Search
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.query ?? ""}
            name="query"
          />
        </label>
        <label className="text-sm font-semibold">
          Module
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.module ?? ""}
            name="module"
          >
            <option value="">All</option>
            <option value="COPY">Copy</option>
            <option value="WEBSITE">Website</option>
            <option value="SOCIAL">Social</option>
            <option value="ADS">Ads &amp; Creative</option>
            <option value="VIDEO">Video &amp; Reels</option>
            <option value="CALENDAR">Content Calendar</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Status
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.status ?? ""}
            name="status"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
          </select>
        </label>
        <button
          className="bg-action-primary text-inverse rounded-control min-h-11 self-end px-4 text-sm font-semibold"
          type="submit"
        >
          Apply filters
        </button>
        <label className="text-sm font-semibold">
          Social platform
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.socialPlatform ?? ""}
            name="socialPlatform"
          >
            <option value="">All</option>
            {["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Social type
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.socialType ?? ""}
            name="socialType"
          >
            <option value="">All</option>
            {[
              "SOCIAL_POST",
              "SOCIAL_CAROUSEL",
              "SOCIAL_STORY",
              "SOCIAL_CAPTION",
            ].map((value) => (
              <option key={value}>{value.replace("SOCIAL_", "")}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Campaign
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.campaign ?? ""}
            name="campaign"
          />
        </label>
        <label className="text-sm font-semibold">
          Ads channel
          <select
            aria-label="Ads channel"
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.adsChannel ?? ""}
            name="adsChannel"
          >
            <option value="">All</option>
            {[
              "GOOGLE_SEARCH",
              "META_FACEBOOK",
              "META_INSTAGRAM",
              "LINKEDIN",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Ads type
          <select
            aria-label="Ads type"
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.adsType ?? ""}
            name="adsType"
          >
            <option value="">All</option>
            {[
              "GOOGLE_SEARCH_AD",
              "META_AD",
              "LINKEDIN_AD",
              "CREATIVE_BRIEF",
              "IMAGE_PROMPT_PACK",
            ].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Video platform
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.videoPlatform ?? ""}
            name="videoPlatform"
          >
            <option value="">All</option>
            {[
              "INSTAGRAM_REELS",
              "TIKTOK",
              "YOUTUBE_SHORTS",
              "FACEBOOK_REELS",
              "LINKEDIN_VIDEO",
              "GENERIC_VERTICAL_VIDEO",
            ].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Video format
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.videoFormat ?? ""}
            name="videoFormat"
          >
            <option value="">All</option>
            {[
              "SHORT_FORM_VIDEO",
              "REEL",
              "PRODUCT_DEMO",
              "TUTORIAL",
              "TESTIMONIAL_SCRIPT",
              "FOUNDER_MESSAGE",
              "PROMOTIONAL_VIDEO",
              "EDUCATIONAL_VIDEO",
              "BEHIND_THE_SCENES",
            ].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Video type
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.videoType ?? ""}
            name="videoType"
          >
            <option value="">All</option>
            {[
              "VIDEO_SCRIPT",
              "SHOT_LIST",
              "VOICE_OVER_SCRIPT",
              "VIDEO_CAPTION",
              "VIDEO_PRODUCTION_BRIEF",
            ].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Copy type
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.copyType ?? ""}
            name="copyType"
          >
            <option value="">All</option>
            {GeneralCopyTypeSchema.options.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Copy purpose
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.copyPurpose ?? ""}
            name="copyPurpose"
          >
            <option value="">All</option>
            {CopyPurposeSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Calendar type
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.calendarType ?? ""}
            name="calendarType"
          >
            <option value="">All</option>
            {CalendarContentTypeSchema.options.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Calendar starts after
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.calendarStart ?? ""}
            name="calendarStart"
            type="date"
          />
        </label>
        <label className="text-sm font-semibold">
          Calendar ends before
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={applied.calendarEnd ?? ""}
            name="calendarEnd"
            type="date"
          />
        </label>
      </form>
      {visibleItems.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleItems.map((item) => (
            <article
              className="border-default bg-surface rounded-card border p-5"
              key={item.id}
            >
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span>{item.module}</span>
                <span>·</span>
                <span>{item.type}</span>
                <span>·</span>
                <span>{item.status}</span>
              </div>
              <h3 className="font-display mt-2 text-lg font-semibold">
                {item.title}
              </h3>
              <p className="text-secondary mt-2 text-sm">
                Version {item.currentVersion?.versionNumber ?? "—"} · Brand
                Profile v{item.sourceBrandProfileVersion.versionNumber}
                {item.currentVersion?.mock ? " · Mock" : ""}
              </p>
              <Link
                className="text-link mt-3 inline-flex min-h-11 items-center font-semibold"
                href={`/app/projects/${projectId}/content/${item.module.toLowerCase()}/${item.id}`}
              >
                Open content
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="border-default bg-surface rounded-card border p-6">
          <h3 className="font-display text-lg font-semibold">
            {Object.keys(applied).length
              ? "No content matches these filters"
              : "No project content yet"}
          </h3>
          <p className="text-secondary mt-2">
            {Object.keys(applied).length
              ? "Adjust or clear the filters."
              : "Generate content from an available project module."}
          </p>
        </section>
      )}
    </div>
  );
}
