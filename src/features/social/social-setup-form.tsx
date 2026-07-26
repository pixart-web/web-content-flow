"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  SocialGenerationRequestSchema,
  type SocialContentType,
  type SocialGenerationRequest,
  type SocialObjective,
  type SocialPlatform,
} from "@/domain/social/social-schemas";

import { configureSocialAction, generateSocialAction } from "./social-actions";

type FormFields = {
  campaignName: string;
  campaignDescription: string;
  quantity: number;
  primaryCallToAction: string;
  toneOverride: SocialGenerationRequest["toneOverride"];
  topic: string;
  productOrServiceFocus: string;
  outputLanguage: string;
  includeHashtags: boolean;
  notes: string;
  mockScenario: SocialGenerationRequest["mockScenario"];
};

const platforms: SocialPlatform[] = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X"];
const objectives: SocialObjective[] = [
  "AWARENESS",
  "EDUCATION",
  "ENGAGEMENT",
  "SALES",
  "LAUNCH",
  "COMMUNITY",
  "TESTIMONIAL",
  "TIPS",
  "PROMOTION",
];
const contentTypes: SocialContentType[] = [
  "SOCIAL_POST",
  "SOCIAL_CAROUSEL",
  "SOCIAL_STORY",
  "SOCIAL_CAPTION",
];

function toggleValue<T extends string>(
  values: readonly T[],
  value: T,
  checked: boolean,
) {
  return checked
    ? [...values, value]
    : values.filter((candidate) => candidate !== value);
}

export function SocialSetupForm({
  projectId,
  initial,
  defaultLanguage,
}: {
  projectId: string;
  initial?: SocialGenerationRequest;
  defaultLanguage: string;
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    initial?.platforms ?? ["INSTAGRAM", "LINKEDIN"],
  );
  const [selectedObjectives, setSelectedObjectives] = useState<
    SocialObjective[]
  >(initial?.objectives ?? ["AWARENESS", "EDUCATION"]);
  const [selectedTypes, setSelectedTypes] = useState<SocialContentType[]>(
    initial?.contentTypes ?? ["SOCIAL_POST", "SOCIAL_CAROUSEL"],
  );
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { register, handleSubmit } = useForm<FormFields>({
    defaultValues: {
      campaignName: initial?.campaignName ?? "",
      campaignDescription: initial?.campaignDescription ?? "",
      quantity: initial?.quantity ?? 6,
      primaryCallToAction: initial?.primaryCallToAction ?? "",
      toneOverride: initial?.toneOverride ?? "INHERIT",
      topic: initial?.topic ?? "",
      productOrServiceFocus: initial?.productOrServiceFocus ?? "",
      outputLanguage: initial?.outputLanguage ?? defaultLanguage,
      includeHashtags: initial?.includeHashtags ?? true,
      notes: initial?.notes ?? "",
      mockScenario: initial?.mockScenario ?? "success",
    },
  });

  return (
    <form
      className="border-default bg-surface rounded-panel space-y-5 border p-5 sm:p-6"
      onSubmit={handleSubmit((values) => {
        const request = SocialGenerationRequestSchema.safeParse({
          schemaVersion: "1.0",
          platforms: selectedPlatforms,
          objectives: selectedObjectives,
          contentTypes: selectedTypes,
          quantity: Number(values.quantity),
          outputLanguage: values.outputLanguage,
          includeHashtags: values.includeHashtags,
          toneOverride: values.toneOverride,
          mockScenario: values.mockScenario,
          ...(values.campaignName ? { campaignName: values.campaignName } : {}),
          ...(values.campaignDescription
            ? { campaignDescription: values.campaignDescription }
            : {}),
          ...(values.primaryCallToAction
            ? { primaryCallToAction: values.primaryCallToAction }
            : {}),
          ...(values.topic ? { topic: values.topic } : {}),
          ...(values.productOrServiceFocus
            ? { productOrServiceFocus: values.productOrServiceFocus }
            : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        });
        if (!request.success) {
          setMessage(
            request.error.issues[0]?.message ?? "Check the Social setup.",
          );
          return;
        }
        startTransition(async () => {
          const configured = await configureSocialAction(
            projectId,
            request.data,
          );
          if (!configured.ok) {
            setMessage(configured.error.message);
            return;
          }
          const queued = await generateSocialAction(projectId);
          setMessage(
            queued.ok
              ? "Social generation queued. You can continue working."
              : queued.error.message,
          );
          router.refresh();
        });
      })}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">Social setup</h2>
        <p className="text-secondary mt-2 text-sm">
          Quantity is the total number of items across all selected platforms
          and content types.
        </p>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Platforms</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={platform}
            >
              <input
                checked={selectedPlatforms.includes(platform)}
                onChange={(event) =>
                  setSelectedPlatforms((current) =>
                    toggleValue(current, platform, event.target.checked),
                  )
                }
                type="checkbox"
              />
              {platform}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Objectives</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {objectives.map((objective) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={objective}
            >
              <input
                checked={selectedObjectives.includes(objective)}
                onChange={(event) =>
                  setSelectedObjectives((current) =>
                    toggleValue(current, objective, event.target.checked),
                  )
                }
                type="checkbox"
              />
              {objective}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Content types</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {contentTypes.map((contentType) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={contentType}
            >
              <input
                checked={selectedTypes.includes(contentType)}
                onChange={(event) =>
                  setSelectedTypes((current) =>
                    toggleValue(current, contentType, event.target.checked),
                  )
                }
                type="checkbox"
              />
              {contentType.replace("SOCIAL_", "").replaceAll("_", " ")}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Total quantity
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            max={20}
            min={1}
            type="number"
            {...register("quantity", { valueAsNumber: true })}
          />
        </label>
        <label className="text-sm font-semibold">
          Output language
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("outputLanguage")}
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
          Topic, optional
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("topic")}
          />
        </label>
        <label className="text-sm font-semibold">
          Product or service focus, optional
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("productOrServiceFocus")}
          />
        </label>
        <label className="text-sm font-semibold">
          Primary call to action, optional
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("primaryCallToAction")}
          />
        </label>
        <label className="text-sm font-semibold">
          Tone
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("toneOverride")}
          >
            {[
              "INHERIT",
              "PROFESSIONAL",
              "CONVERSATIONAL",
              "DIRECT",
              "WARM",
            ].map((tone) => (
              <option key={tone}>{tone}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Mock scenario
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("mockScenario")}
          >
            <option value="success">Success</option>
            <option value="one-item-failure">One-item failure</option>
            <option value="invalid-carousel">Invalid carousel</option>
            <option value="timeout-linkedin-post">LinkedIn timeout</option>
            <option value="invalid-hashtags">Invalid hashtags</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Campaign description, optional
        <textarea
          className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
          {...register("campaignDescription")}
        />
      </label>
      <label className="block text-sm font-semibold">
        Notes, optional
        <textarea
          className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
          {...register("notes")}
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" {...register("includeHashtags")} />
        Include hashtags
      </label>
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
          : "Save setup and generate Social content"}
      </button>
    </form>
  );
}
