"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  ADS_CHANNEL_TYPE_COMPATIBILITY,
  AdsGenerationRequestSchema,
  type AdsChannel,
  type AdsContentType,
  type AdsGenerationRequest,
} from "@/domain/ads/ads-schemas";
import { configureAdsAction, generateAdsAction } from "./ads-actions";

type Fields = {
  campaignName: string;
  campaignObjective: AdsGenerationRequest["campaignObjective"];
  offerName: string;
  offerDescription: string;
  differentiators: string;
  proofPoints: string;
  audienceSummary: string;
  painPoints: string;
  desiredOutcomes: string;
  objections: string;
  primaryConversionAction: string;
  landingPageContext: string;
  keywordThemes: string;
  variantsPerAsset: number;
  outputLanguage: string;
  notes: string;
  mockScenario: AdsGenerationRequest["mockScenario"];
};

const channels: AdsChannel[] = [
  "GOOGLE_SEARCH",
  "META_FACEBOOK",
  "META_INSTAGRAM",
  "LINKEDIN",
];
const assetTypes: AdsContentType[] = [
  "GOOGLE_SEARCH_AD",
  "META_AD",
  "LINKEDIN_AD",
  "CREATIVE_BRIEF",
  "IMAGE_PROMPT_PACK",
];
const objectives: AdsGenerationRequest["campaignObjective"][] = [
  "AWARENESS",
  "TRAFFIC",
  "LEAD_GENERATION",
  "CONVERSIONS",
  "SALES",
  "PRODUCT_LAUNCH",
  "EVENT_PROMOTION",
  "RETARGETING",
];
const list = (value: string) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

export function AdsSetupForm({
  projectId,
  defaultLanguage,
  initial,
}: {
  projectId: string;
  defaultLanguage: string;
  initial?: AdsGenerationRequest;
}) {
  const [selectedChannels, setSelectedChannels] = useState<AdsChannel[]>(
    initial?.channels ?? ["GOOGLE_SEARCH", "META_INSTAGRAM"],
  );
  const [selectedTypes, setSelectedTypes] = useState<AdsContentType[]>(
    initial?.assetTypes ?? [
      "GOOGLE_SEARCH_AD",
      "META_AD",
      "CREATIVE_BRIEF",
      "IMAGE_PROMPT_PACK",
    ],
  );
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { register, handleSubmit } = useForm<Fields>({
    defaultValues: {
      campaignName: initial?.campaignName ?? "",
      campaignObjective: initial?.campaignObjective ?? "CONVERSIONS",
      offerName: initial?.offer.name ?? "",
      offerDescription: initial?.offer.description ?? "",
      differentiators: initial?.offer.differentiators.join("\n") ?? "",
      proofPoints: initial?.offer.proofPoints?.join("\n") ?? "",
      audienceSummary: initial?.audience.summary ?? "",
      painPoints: initial?.audience.painPoints.join("\n") ?? "",
      desiredOutcomes: initial?.audience.desiredOutcomes.join("\n") ?? "",
      objections: initial?.audience.objections?.join("\n") ?? "",
      primaryConversionAction: initial?.primaryConversionAction ?? "",
      landingPageContext: initial?.landingPageContext ?? "",
      keywordThemes: initial?.keywordThemes?.join("\n") ?? "",
      variantsPerAsset: initial?.variantsPerAsset ?? 2,
      outputLanguage: initial?.outputLanguage ?? defaultLanguage,
      notes: initial?.notes ?? "",
      mockScenario: initial?.mockScenario ?? "success",
    },
  });
  const compatible = (type: AdsContentType) =>
    selectedChannels.some((channel) =>
      ADS_CHANNEL_TYPE_COMPATIBILITY[channel].includes(type),
    );
  const toggle = <T extends string>(
    current: T[],
    value: T,
    checked: boolean,
  ) =>
    checked ? [...current, value] : current.filter((item) => item !== value);
  return (
    <form
      className="border-default bg-surface rounded-panel space-y-5 border p-5 sm:p-6"
      onSubmit={handleSubmit((values) => {
        const parsed = AdsGenerationRequestSchema.safeParse({
          schemaVersion: "1.0",
          campaignObjective: values.campaignObjective,
          channels: selectedChannels,
          assetTypes: selectedTypes,
          offer: {
            name: values.offerName,
            description: values.offerDescription,
            differentiators: list(values.differentiators),
            ...(list(values.proofPoints).length
              ? { proofPoints: list(values.proofPoints) }
              : {}),
          },
          audience: {
            summary: values.audienceSummary,
            painPoints: list(values.painPoints),
            desiredOutcomes: list(values.desiredOutcomes),
            ...(list(values.objections).length
              ? { objections: list(values.objections) }
              : {}),
          },
          primaryConversionAction: values.primaryConversionAction,
          variantsPerAsset: Number(values.variantsPerAsset),
          outputLanguage: values.outputLanguage,
          mockScenario: values.mockScenario,
          ...(values.campaignName ? { campaignName: values.campaignName } : {}),
          ...(values.landingPageContext
            ? { landingPageContext: values.landingPageContext }
            : {}),
          ...(list(values.keywordThemes).length
            ? { keywordThemes: list(values.keywordThemes) }
            : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        });
        if (!parsed.success)
          return setMessage(
            parsed.error.issues[0]?.message ?? "Check the Ads setup.",
          );
        startTransition(async () => {
          const configured = await configureAdsAction(projectId, parsed.data);
          if (!configured.ok) return setMessage(configured.error.message);
          const queued = await generateAdsAction(projectId);
          setMessage(
            queued.ok
              ? "Ads generation queued. You can continue working."
              : queued.error.message,
          );
          router.refresh();
        });
      })}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">
          Campaign content setup
        </h2>
        <p className="text-secondary mt-2 text-sm">
          Variants are editorial alternatives. No performance prediction is
          provided.
        </p>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Channels</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((channel) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={channel}
            >
              <input
                checked={selectedChannels.includes(channel)}
                onChange={(event) =>
                  setSelectedChannels((current) =>
                    toggle(current, channel, event.target.checked),
                  )
                }
                type="checkbox"
              />
              {channel.replaceAll("_", " ")}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Asset types</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {assetTypes.map((type) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={type}
            >
              <input
                checked={selectedTypes.includes(type)}
                disabled={!compatible(type)}
                onChange={(event) =>
                  setSelectedTypes((current) =>
                    toggle(current, type, event.target.checked),
                  )
                }
                type="checkbox"
              />
              {type.replaceAll("_", " ")}
            </label>
          ))}
        </div>
        <p className="text-secondary mt-2 text-sm">
          Unavailable types are incompatible with the selected channels.
        </p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Campaign objective
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("campaignObjective")}
          >
            {objectives.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Campaign name, optional
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("campaignName")}
          />
        </label>
        <label className="text-sm font-semibold">
          Offer name
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("offerName")}
          />
        </label>
        <label className="text-sm font-semibold">
          Primary conversion action
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("primaryConversionAction")}
          />
        </label>
        <label className="text-sm font-semibold">
          Variants per ad
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            min={1}
            max={5}
            type="number"
            {...register("variantsPerAsset", { valueAsNumber: true })}
          />
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
        ["offerDescription", "Offer description"],
        ["differentiators", "Differentiators, one per line"],
        ["proofPoints", "Proof points, optional"],
        ["audienceSummary", "Audience summary"],
        ["painPoints", "Pain points, one per line"],
        ["desiredOutcomes", "Desired outcomes, one per line"],
        ["objections", "Objections, optional"],
        ["landingPageContext", "Landing-page context, optional (not fetched)"],
        ["keywordThemes", "Keyword themes, optional"],
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
      {process.env.NODE_ENV !== "production" ? (
        <label className="text-sm font-semibold">
          Mock scenario
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("mockScenario")}
          >
            {[
              "success",
              "one-asset-failure",
              "invalid-google-ad",
              "invalid-meta-variant",
              "invalid-image-prompt-pack",
              "timeout-linkedin-ad",
              "duplicate-variant-id",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      ) : null}
      {message ? (
        <p
          className="bg-surface-subtle rounded-control p-3 text-sm"
          role="status"
        >
          {message}
        </p>
      ) : null}
      <button
        className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Preparing generation…"
          : "Save setup and generate Ads assets"}
      </button>
    </form>
  );
}
