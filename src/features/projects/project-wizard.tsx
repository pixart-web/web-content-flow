"use client";

import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  emptyProjectBrief,
  AudienceSectionSchema,
  DirectionSectionSchema,
  LanguageModulesSectionSchema,
  ObjectiveSectionSchema,
  ProjectSectionSchema,
  type ProjectBrief,
} from "@/domain/brief/brief-schema";
import {
  createDraftAction,
  finalizeProjectAction,
  saveBriefStepAction,
} from "./project-actions";

const steps = [
  ["project", "Project"],
  ["audience", "Audience and problem"],
  ["objective", "Objective and action"],
  ["direction", "Brand direction"],
  ["languageModules", "Language and modules"],
  ["review", "Review"],
] as const;

type Section = Exclude<(typeof steps)[number][0], "review">;

const inputClass =
  "border-default bg-surface text-primary min-h-11 w-full rounded-control border px-3";
const textareaClass = `${inputClass} min-h-28 py-3`;

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        {optional ? (
          <span className="text-secondary text-xs">Optional</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}

function CommaField({
  control,
  name,
  label,
}: {
  control: ReturnType<typeof useForm<ProjectBrief>>["control"];
  name:
    | "audience.interests"
    | "direction.preferredColors"
    | "direction.colorsToAvoid"
    | "direction.keywords"
    | "direction.competitors"
    | "direction.referenceWebsites";
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} optional>
          <input
            className={inputClass}
            onBlur={field.onBlur}
            onChange={(event) =>
              field.onChange(
                event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              )
            }
            ref={field.ref}
            value={(field.value as string[]).join(", ")}
          />
        </Field>
      )}
    />
  );
}

export function ProjectWizard({
  initialProjectId,
  initialRevision,
  initialBrief,
  editMode = false,
}: {
  initialProjectId?: string;
  initialRevision?: number;
  initialBrief?: ProjectBrief;
  editMode?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [revision, setRevision] = useState(initialRevision ?? 1);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    getValues,
    formState: { errors },
  } = useForm<ProjectBrief>({
    defaultValues: initialBrief ?? emptyProjectBrief,
    mode: "onBlur",
  });

  const current = steps[step]!;

  async function ensureDraft() {
    if (projectId) return projectId;
    const created = await createDraftAction();
    if (!created.ok) {
      setMessage(created.error.message);
      return null;
    }
    setProjectId(created.value.projectId);
    setRevision(created.value.revision);
    window.history.replaceState(
      null,
      "",
      `/app/projects/new?draft=${created.value.projectId}`,
    );
    return created.value.projectId;
  }

  async function saveCurrent() {
    if (current[0] === "review") return true;
    const section = current[0] as Section;
    const schemas = {
      project: ProjectSectionSchema,
      audience: AudienceSectionSchema,
      objective: ObjectiveSectionSchema,
      direction: DirectionSectionSchema,
      languageModules: LanguageModulesSectionSchema,
    } as const;
    const valid = schemas[section].safeParse(getValues(section));
    if (!valid.success) {
      setMessage(
        valid.error.issues[0]?.message ?? "Check the fields in this step.",
      );
      return false;
    }
    const id = await ensureDraft();
    if (!id) return false;
    const saved = await saveBriefStepAction({
      projectId: id,
      revision,
      section,
      value: getValues(section),
    });
    if (!saved.ok) {
      setMessage(saved.error.message);
      return false;
    }
    setRevision(saved.value.revision);
    setMessage("Draft saved.");
    return true;
  }

  function continueStep() {
    startTransition(async () => {
      if (await saveCurrent()) {
        setStep((value) => Math.min(value + 1, 5));
        setMessage(undefined);
      }
    });
  }

  function saveAndExit() {
    startTransition(async () => {
      if (await saveCurrent()) router.push("/app");
    });
  }

  function finalize() {
    if (!projectId) return;
    if (editMode) {
      setMessage(
        "Brief saved. Existing Brand Profile versions were not changed.",
      );
      router.refresh();
      return;
    }
    startTransition(async () => {
      const result = await finalizeProjectAction({ projectId });
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      router.push(`/app/projects/${result.value.projectId}`);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[13rem_1fr]">
      <aside aria-label="Project setup steps">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {steps.map(([key, label], index) => (
            <li
              className={`rounded-control px-3 py-2 text-sm ${
                index === step
                  ? "bg-surface-selected text-link font-semibold"
                  : index < step
                    ? "text-primary"
                    : "text-secondary"
              }`}
              key={key}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </aside>
      <section className="border-default bg-surface rounded-panel border p-5 sm:p-7">
        <header>
          <p className="text-secondary text-sm">Step {step + 1} of 6</p>
          <h1 className="font-display mt-1 text-2xl font-semibold">
            {current[1]}
          </h1>
        </header>

        {message ? (
          <p
            className="border-default bg-surface-subtle rounded-control mt-5 border p-3 text-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <div className="mt-7 grid gap-5">
          {step === 0 ? (
            <>
              <Field
                label="Project name"
                error={errors.project?.projectName?.message}
              >
                <input
                  className={inputClass}
                  {...register("project.projectName")}
                />
              </Field>
              <Field
                label="Brand name"
                error={errors.project?.brandName?.message}
              >
                <input
                  className={inputClass}
                  {...register("project.brandName")}
                />
              </Field>
              <Field label="Project type">
                <select
                  className={inputClass}
                  {...register("project.projectType")}
                >
                  {[
                    "E-commerce",
                    "Service",
                    "SaaS",
                    "Personal brand",
                    "Campaign",
                    "Other",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Business description"
                error={errors.project?.businessDescription?.message}
              >
                <textarea
                  className={textareaClass}
                  {...register("project.businessDescription")}
                />
              </Field>
              <Field
                label="Product or service"
                error={errors.project?.productOrService?.message}
              >
                <textarea
                  className={textareaClass}
                  {...register("project.productOrService")}
                />
              </Field>
              <Field
                label="Current website"
                optional
                error={errors.project?.currentWebsite?.message}
              >
                <input
                  className={inputClass}
                  type="url"
                  {...register("project.currentWebsite")}
                />
              </Field>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <Field
                label="Target audience"
                error={errors.audience?.targetAudience?.message}
              >
                <textarea
                  className={textareaClass}
                  {...register("audience.targetAudience")}
                />
              </Field>
              <Field label="Age range" optional>
                <input
                  className={inputClass}
                  {...register("audience.ageRange")}
                />
              </Field>
              <Field label="Location" optional>
                <input
                  className={inputClass}
                  {...register("audience.location")}
                />
              </Field>
              <CommaField
                control={control}
                label="Interests (comma separated)"
                name="audience.interests"
              />
              <Field
                label="Customer problem"
                error={errors.audience?.customerProblem?.message}
              >
                <textarea
                  className={textareaClass}
                  {...register("audience.customerProblem")}
                />
              </Field>
              <Field
                label="Value proposition"
                error={errors.audience?.valueProposition?.message}
              >
                <textarea
                  className={textareaClass}
                  {...register("audience.valueProposition")}
                />
              </Field>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Field
                label="Primary objective"
                error={errors.objective?.primaryObjective?.message}
              >
                <textarea
                  className={textareaClass}
                  {...register("objective.primaryObjective")}
                />
              </Field>
              <Field
                label="Desired customer action"
                error={errors.objective?.desiredCustomerAction?.message}
              >
                <input
                  className={inputClass}
                  {...register("objective.desiredCustomerAction")}
                />
              </Field>
              <Field
                label="Primary offer"
                error={errors.objective?.primaryOffer?.message}
              >
                <textarea
                  className={textareaClass}
                  {...register("objective.primaryOffer")}
                />
              </Field>
              <Field label="Campaign or launch context" optional>
                <textarea
                  className={textareaClass}
                  {...register("objective.campaignContext")}
                />
              </Field>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <Field
                label="Tone of voice"
                error={errors.direction?.toneOfVoice?.message}
              >
                <input
                  className={inputClass}
                  {...register("direction.toneOfVoice")}
                />
              </Field>
              <Field label="Visual style" optional>
                <textarea
                  className={textareaClass}
                  {...register("direction.visualStyle")}
                />
              </Field>
              <CommaField
                control={control}
                label="Preferred colors"
                name="direction.preferredColors"
              />
              <CommaField
                control={control}
                label="Colors to avoid"
                name="direction.colorsToAvoid"
              />
              <CommaField
                control={control}
                label="Keywords"
                name="direction.keywords"
              />
              <CommaField
                control={control}
                label="Competitors"
                name="direction.competitors"
              />
              <CommaField
                control={control}
                label="Reference websites"
                name="direction.referenceWebsites"
              />
            </>
          ) : null}
          {step === 4 ? (
            <>
              <Field
                label="Output language"
                error={errors.languageModules?.outputLanguage?.message}
              >
                <input
                  className={inputClass}
                  {...register("languageModules.outputLanguage")}
                />
              </Field>
              <fieldset>
                <legend className="text-sm font-semibold">
                  Future content modules
                </legend>
                <p className="text-secondary mt-1 text-sm">
                  Brand Profile is always included. These selections are saved
                  for later phases.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {["WEBSITE", "SOCIAL", "ADS", "VIDEO", "COPY"].map(
                    (module) => (
                      <label
                        className="border-default rounded-control flex min-h-11 items-center gap-3 border px-3"
                        key={module}
                      >
                        <input
                          type="checkbox"
                          value={module}
                          {...register("languageModules.selectedModules")}
                        />
                        {module}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
            </>
          ) : null}
          {step === 5 ? (
            <div className="space-y-5">
              {steps.slice(0, 5).map(([key, label], index) => (
                <section
                  className="border-default rounded-card border p-4"
                  key={key}
                >
                  <div className="flex justify-between gap-4">
                    <h2 className="font-semibold">{label}</h2>
                    <button
                      className="text-link min-h-11 text-sm font-semibold"
                      onClick={() => setStep(index)}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                  <pre className="text-secondary mt-2 overflow-auto text-xs whitespace-pre-wrap">
                    {JSON.stringify(getValues(key as Section), null, 2)}
                  </pre>
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-default mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            disabled={pending}
            onClick={saveAndExit}
            type="button"
          >
            Save and exit
          </button>
          <div className="flex gap-3 sm:ml-auto">
            {step > 0 ? (
              <button
                className="min-h-11 px-4 text-sm font-semibold"
                disabled={pending}
                onClick={() => setStep((value) => value - 1)}
                type="button"
              >
                Back
              </button>
            ) : null}
            {step < 5 ? (
              <button
                className="bg-action-primary text-inverse rounded-control min-h-11 flex-1 px-4 text-sm font-semibold sm:flex-none"
                disabled={pending}
                onClick={continueStep}
                type="button"
              >
                {pending ? "Saving…" : "Continue"}
              </button>
            ) : (
              <button
                className="bg-action-primary text-inverse rounded-control min-h-11 flex-1 px-4 text-sm font-semibold sm:flex-none"
                disabled={pending || !projectId}
                onClick={finalize}
                type="button"
              >
                {pending
                  ? "Saving…"
                  : editMode
                    ? "Save brief"
                    : "Create project and generate Brand Profile"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
