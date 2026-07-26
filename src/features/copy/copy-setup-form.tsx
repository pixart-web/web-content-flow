"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  AudienceAwarenessLevelSchema,
  CopyLengthPreferenceSchema,
  CopyMockScenarioSchema,
  CopyPurposeSchema,
  CopyToneSchema,
  GeneralCopyTypeSchema,
  CopyGenerationRequestSchema,
  type CopyGenerationRequest,
  type GeneralCopyType,
} from "@/domain/copy/copy-schemas";
import {
  addCopyAssetAction,
  configureCopyAction,
  generateCopyAction,
} from "./copy-actions";

type Fields = {
  topic: string;
  audienceSummary: string;
  campaignName: string;
  primaryCallToAction: string;
  outputLanguage: string;
  purpose: CopyGenerationRequest["purpose"];
  tone: CopyGenerationRequest["toneOverride"];
  length: CopyGenerationRequest["lengthPreference"]["value"];
  customWords: number;
  awareness: NonNullable<CopyGenerationRequest["audience"]["awarenessLevel"]>;
  quantity: number;
  mockScenario: CopyGenerationRequest["mockScenario"];
};
const toggle = (values: GeneralCopyType[], value: GeneralCopyType) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
const label = (value: string) => value.replaceAll("_", " ");

export function CopySetupForm({
  projectId,
  defaultLanguage,
  initial,
}: {
  projectId: string;
  defaultLanguage: string;
  initial?: CopyGenerationRequest;
}) {
  const [types, setTypes] = useState<GeneralCopyType[]>(
    initial?.copyTypes ?? ["MARKETING_EMAIL", "PRODUCT_DESCRIPTION"],
  );
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { register, handleSubmit, control } = useForm<Fields>({
    defaultValues: {
      topic: initial?.topic ?? "",
      audienceSummary: initial?.audience.summary ?? "",
      campaignName: initial?.campaignName ?? "",
      primaryCallToAction: initial?.desiredAction ?? "",
      outputLanguage: initial?.outputLanguage ?? defaultLanguage,
      purpose: initial?.purpose ?? "INFORM",
      tone: initial?.toneOverride ?? "BRAND_DEFAULT",
      length: initial?.lengthPreference.value ?? "MEDIUM",
      customWords: initial?.lengthPreference.customWordTarget ?? 500,
      awareness: initial?.audience.awarenessLevel ?? "SOLUTION_AWARE",
      quantity: initial?.quantity ?? 2,
      mockScenario: initial?.mockScenario ?? "success",
    },
  });
  const length = useWatch({ control, name: "length" });
  const submit = handleSubmit((values) => {
    const parsed = CopyGenerationRequestSchema.safeParse({
      schemaVersion: "1.0",
      copyTypes: types,
      topic: values.topic,
      purpose: values.purpose,
      toneOverride: values.tone,
      lengthPreference: {
        value: values.length,
        ...(values.length === "CUSTOM"
          ? { customWordTarget: Number(values.customWords) }
          : {}),
      },
      audience: {
        summary: values.audienceSummary,
        awarenessLevel: values.awareness,
      },
      quantity: Number(values.quantity),
      outputLanguage: values.outputLanguage,
      mockScenario: values.mockScenario,
      ...(values.campaignName ? { campaignName: values.campaignName } : {}),
      ...(values.primaryCallToAction
        ? { desiredAction: values.primaryCallToAction }
        : {}),
    });
    if (!parsed.success)
      return setMessage(
        parsed.error.issues[0]?.message ?? "Check the Copy setup.",
      );
    startTransition(async () => {
      const configured = await configureCopyAction(projectId, parsed.data);
      if (!configured.ok) return setMessage(configured.error.message);
      const queued = await generateCopyAction(projectId);
      setMessage(
        queued.ok
          ? "Copy generation queued. You can continue working."
          : queued.error.message,
      );
      router.refresh();
    });
  });
  return (
    <form
      className="border-default bg-surface rounded-panel space-y-5 border p-5 sm:p-6"
      onSubmit={submit}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">Copy setup</h2>
        <p className="text-secondary mt-2 text-sm">
          Choose practical deliverables. Every asset uses the current Brand
          Profile and remains independently editable.
        </p>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Copy types</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GeneralCopyTypeSchema.options.map((type) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={type}
            >
              <input
                checked={types.includes(type)}
                onChange={() => setTypes((current) => toggle(current, type))}
                type="checkbox"
              />
              {label(type)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">
          Topic or offer
          <textarea
            className="border-default rounded-control mt-1 min-h-24 w-full border p-3 font-normal"
            {...register("topic")}
          />
        </label>
        <label className="text-sm font-semibold">
          Purpose
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("purpose")}
          >
            {CopyPurposeSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Tone
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("tone")}
          >
            {CopyToneSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Length
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("length")}
          >
            {CopyLengthPreferenceSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {length === "CUSTOM" ? (
          <label className="text-sm font-semibold">
            Approximate words
            <input
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              max={4000}
              min={25}
              type="number"
              {...register("customWords", { valueAsNumber: true })}
            />
          </label>
        ) : null}
        <label className="text-sm font-semibold">
          Audience awareness
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("awareness")}
          >
            {AudienceAwarenessLevelSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Assets
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            max={20}
            min={1}
            type="number"
            {...register("quantity", { valueAsNumber: true })}
          />
        </label>
        {[
          ["Audience summary, optional", "audienceSummary"],
          ["Campaign name, optional", "campaignName"],
          ["Primary call to action, optional", "primaryCallToAction"],
          ["Output language", "outputLanguage"],
        ].map(([text, name]) => (
          <label className="text-sm font-semibold" key={name}>
            {text}
            <input
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              {...register(name as keyof Fields)}
            />
          </label>
        ))}
        <label className="text-sm font-semibold">
          Mock test scenario
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            {...register("mockScenario")}
          >
            {CopyMockScenarioSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
          disabled={pending}
          type="submit"
        >
          {pending ? "Queuing copy…" : "Generate copy pack"}
        </button>
        {initial ? (
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await addCopyAssetAction(
                  projectId,
                  types[0] ?? "COPY_BLOCK",
                );
                setMessage(
                  result.ok ? "One copy asset queued." : result.error.message,
                );
                if (result.ok) router.refresh();
              })
            }
            type="button"
          >
            Add one {label(types[0] ?? "COPY_BLOCK").toLowerCase()}
          </button>
        ) : null}
      </div>
      {message ? (
        <p
          className="bg-surface-subtle rounded-control p-3 text-sm"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
