"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  VideoContentTypeSchema,
  VideoFormatSchema,
  VideoGenerationRequestSchema,
  VideoObjectiveSchema,
  VideoPlatformSchema,
  type VideoContentType,
  type VideoFormat,
  type VideoGenerationRequest,
  type VideoObjective,
  type VideoPlatform,
} from "@/domain/video/video-schemas";
import { configureVideoAction, generateVideoAction } from "./video-actions";

type Fields = {
  campaignName: string;
  topic: string;
  audienceSummary: string;
  productOrServiceFocus: string;
  coreMessage: string;
  primaryCallToAction: string;
  presenterStyle: VideoGenerationRequest["presenterStyle"];
  durationRange: VideoGenerationRequest["duration"]["range"];
  customSeconds: number;
  conceptCount: number;
  visualStyle: string;
  filmingConstraints: string;
  availableAssets: string;
  outputLanguage: string;
  notes: string;
  mockScenario: VideoGenerationRequest["mockScenario"];
  includeOnScreenText: boolean;
  includeVoiceOver: boolean;
  includeCaption: boolean;
  includeShotList: boolean;
};
const lines = (value: string) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
const toggle = <T extends string>(values: T[], value: T, checked: boolean) =>
  checked ? [...values, value] : values.filter((item) => item !== value);

export function VideoSetupForm({
  projectId,
  defaultLanguage,
  initial,
}: {
  projectId: string;
  defaultLanguage: string;
  initial?: VideoGenerationRequest;
}) {
  const [platforms, setPlatforms] = useState<VideoPlatform[]>(
    initial?.platforms ?? ["INSTAGRAM_REELS", "TIKTOK"],
  );
  const [formats, setFormats] = useState<VideoFormat[]>(
    initial?.formats ?? ["REEL", "EDUCATIONAL_VIDEO"],
  );
  const [objectives, setObjectives] = useState<VideoObjective[]>(
    initial?.objectives ?? ["AWARENESS"],
  );
  const [assetTypes, setAssetTypes] = useState<VideoContentType[]>(
    initial?.assetTypes ?? [
      "VIDEO_SCRIPT",
      "SHOT_LIST",
      "VIDEO_CAPTION",
      "VIDEO_PRODUCTION_BRIEF",
    ],
  );
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { register, handleSubmit, control } = useForm<Fields>({
    defaultValues: {
      campaignName: initial?.campaignName ?? "",
      topic: initial?.topic ?? "",
      audienceSummary: initial?.audienceSummary ?? "",
      productOrServiceFocus: initial?.productOrServiceFocus ?? "",
      coreMessage: initial?.coreMessage ?? "",
      primaryCallToAction: initial?.primaryCallToAction ?? "",
      presenterStyle: initial?.presenterStyle ?? "MIXED",
      durationRange: initial?.duration.range ?? "UP_TO_30_SECONDS",
      customSeconds: initial?.duration.customSeconds ?? 30,
      conceptCount: initial?.conceptCount ?? 1,
      visualStyle: initial?.visualStyle ?? "",
      filmingConstraints: initial?.filmingConstraints?.join("\n") ?? "",
      availableAssets: initial?.availableAssets?.join("\n") ?? "",
      outputLanguage: initial?.outputLanguage ?? defaultLanguage,
      notes: initial?.notes ?? "",
      mockScenario: initial?.mockScenario ?? "success",
      includeOnScreenText: initial?.includeOnScreenText ?? true,
      includeVoiceOver: initial?.includeVoiceOver ?? true,
      includeCaption: initial?.includeCaption ?? true,
      includeShotList: initial?.includeShotList ?? true,
    },
  });
  const durationRange = useWatch({ control, name: "durationRange" });
  return (
    <form
      className="border-default bg-surface rounded-panel space-y-5 border p-5 sm:p-6"
      onSubmit={handleSubmit((values) => {
        const parsed = VideoGenerationRequestSchema.safeParse({
          schemaVersion: "1.0",
          platforms,
          formats,
          objectives,
          assetTypes,
          conceptCount: Number(values.conceptCount),
          duration: {
            range: values.durationRange,
            ...(values.durationRange === "CUSTOM"
              ? { customSeconds: Number(values.customSeconds) }
              : {}),
          },
          topic: values.topic,
          presenterStyle: values.presenterStyle,
          outputLanguage: values.outputLanguage,
          includeOnScreenText: values.includeOnScreenText,
          includeVoiceOver: values.includeVoiceOver,
          includeCaption: values.includeCaption,
          includeShotList: values.includeShotList,
          mockScenario: values.mockScenario,
          ...(values.campaignName ? { campaignName: values.campaignName } : {}),
          ...(values.audienceSummary
            ? { audienceSummary: values.audienceSummary }
            : {}),
          ...(values.productOrServiceFocus
            ? { productOrServiceFocus: values.productOrServiceFocus }
            : {}),
          ...(values.coreMessage ? { coreMessage: values.coreMessage } : {}),
          ...(values.primaryCallToAction
            ? { primaryCallToAction: values.primaryCallToAction }
            : {}),
          ...(values.visualStyle ? { visualStyle: values.visualStyle } : {}),
          ...(lines(values.filmingConstraints).length
            ? { filmingConstraints: lines(values.filmingConstraints) }
            : {}),
          ...(lines(values.availableAssets).length
            ? { availableAssets: lines(values.availableAssets) }
            : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        });
        if (!parsed.success)
          return setMessage(
            parsed.error.issues[0]?.message ?? "Check the Video setup.",
          );
        startTransition(async () => {
          const configured = await configureVideoAction(projectId, parsed.data);
          if (!configured.ok) return setMessage(configured.error.message);
          const queued = await generateVideoAction(projectId);
          setMessage(
            queued.ok
              ? "Video planning queued. You can continue working."
              : queued.error.message,
          );
          router.refresh();
        });
      })}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">
          Video planning setup
        </h2>
        <p className="text-secondary mt-2 text-sm">
          Create scripts and production guidance. No video or audio is rendered.
        </p>
      </div>
      {[
        ["Platforms", VideoPlatformSchema.options, platforms, setPlatforms],
        ["Formats", VideoFormatSchema.options, formats, setFormats],
        ["Objectives", VideoObjectiveSchema.options, objectives, setObjectives],
        [
          "Asset types",
          VideoContentTypeSchema.options,
          assetTypes,
          setAssetTypes,
        ],
      ].map(([label, options, values, setter]) => (
        <fieldset key={String(label)}>
          <legend className="text-sm font-semibold">{String(label)}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(options as readonly string[]).map((value) => (
              <label
                className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
                key={value}
              >
                <input
                  checked={(values as string[]).includes(value)}
                  onChange={(event) =>
                    (setter as React.Dispatch<React.SetStateAction<string[]>>)(
                      (current) => toggle(current, value, event.target.checked),
                    )
                  }
                  type="checkbox"
                />
                {value.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">
          Topic
          <textarea
            className="border-default rounded-control mt-1 min-h-24 w-full border p-3 font-normal"
            {...register("topic")}
          />
        </label>
        <label className="text-sm font-semibold">
          Campaign name, optional
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("campaignName")}
          />
        </label>
        <label className="text-sm font-semibold">
          Concepts
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            min={1}
            max={10}
            type="number"
            {...register("conceptCount", { valueAsNumber: true })}
          />
        </label>
        <label className="text-sm font-semibold">
          Duration
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("durationRange")}
          >
            {[
              "UP_TO_15_SECONDS",
              "UP_TO_30_SECONDS",
              "UP_TO_60_SECONDS",
              "UP_TO_90_SECONDS",
              "CUSTOM",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {durationRange === "CUSTOM" ? (
          <label className="text-sm font-semibold">
            Custom seconds
            <input
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              min={5}
              max={180}
              type="number"
              {...register("customSeconds", { valueAsNumber: true })}
            />
          </label>
        ) : null}
        <label className="text-sm font-semibold">
          Presenter style
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("presenterStyle")}
          >
            {[
              "NO_PRESENTER",
              "FOUNDER_TO_CAMERA",
              "EXPERT_TO_CAMERA",
              "VOICE_OVER",
              "CUSTOMER_STYLE",
              "PRODUCT_ONLY",
              "MIXED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Output language
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("outputLanguage")}
          />
        </label>
      </div>
      {[
        ["audienceSummary", "Audience summary, optional"],
        ["productOrServiceFocus", "Product or service focus, optional"],
        ["coreMessage", "Core message, optional"],
        ["primaryCallToAction", "Primary call to action, optional"],
        ["visualStyle", "Visual style, optional"],
        ["filmingConstraints", "Filming constraints, one per line"],
        ["availableAssets", "Available assets, one per line"],
        ["notes", "Notes, optional"],
      ].map(([key, label]) => (
        <label className="block text-sm font-semibold" key={key}>
          {label}
          <textarea
            className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
            {...register(key as keyof Fields)}
          />
        </label>
      ))}
      <fieldset>
        <legend className="text-sm font-semibold">Included guidance</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[
            ["includeOnScreenText", "On-screen text"],
            ["includeVoiceOver", "Voice-over"],
            ["includeCaption", "Video caption"],
            ["includeShotList", "Shot list"],
          ].map(([key, label]) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={key}
            >
              <input type="checkbox" {...register(key as keyof Fields)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        Mock scenario
        <select
          className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
          {...register("mockScenario")}
        >
          {[
            "success",
            "one-asset-failure",
            "invalid-scene-duration",
            "duplicate-scene-id",
            "invalid-shot-list",
            "timeout-voice-over",
            "invalid-video-caption",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <button
        className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
        disabled={pending}
        type="submit"
      >
        {pending ? "Queuing video planning…" : "Generate video plan"}
      </button>
      {message ? (
        <p className="text-secondary text-sm" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
