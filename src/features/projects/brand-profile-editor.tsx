"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { BrandProfile } from "@/domain/brand-profile/brand-profile-schema";

import {
  regenerateProfileAction,
  restoreProfileAction,
  saveProfileAction,
} from "./project-actions";

type VersionSummary = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  current: boolean;
};

const scalarFields = [
  ["brandSummary", "Brand summary"],
  ["positioning", "Positioning"],
  ["valueProposition", "Value proposition"],
  ["mission", "Mission"],
  ["vision", "Vision"],
  ["targetAudienceSummary", "Target audience"],
  ["customerProblem", "Customer problem"],
  ["brandPromise", "Brand promise"],
  ["slogan", "Slogan"],
  ["visualDirection", "Visual direction"],
  ["imageDirection", "Image direction"],
  ["reusableImagePrompt", "Reusable image-generation prompt"],
] as const satisfies ReadonlyArray<
  readonly [
    keyof Pick<
      BrandProfile,
      | "brandSummary"
      | "positioning"
      | "valueProposition"
      | "mission"
      | "vision"
      | "targetAudienceSummary"
      | "customerProblem"
      | "brandPromise"
      | "slogan"
      | "visualDirection"
      | "imageDirection"
      | "reusableImagePrompt"
    >,
    string,
  ]
>;

const listFields = [
  ["values", "Values"],
  ["personality", "Personality"],
  ["toneOfVoice", "Tone of voice"],
  ["writingGuidelines", "Writing guidelines"],
  ["wordsToUse", "Words to use"],
  ["wordsToAvoid", "Words to avoid"],
  ["typographyRecommendations", "Typography recommendations"],
  ["keyMarketingMessages", "Key marketing messages"],
  ["primaryCallsToAction", "Primary calls to action"],
] as const satisfies ReadonlyArray<
  readonly [
    keyof Pick<
      BrandProfile,
      | "values"
      | "personality"
      | "toneOfVoice"
      | "writingGuidelines"
      | "wordsToUse"
      | "wordsToAvoid"
      | "typographyRecommendations"
      | "keyMarketingMessages"
      | "primaryCallsToAction"
    >,
    string,
  ]
>;

export function BrandProfileEditor({
  projectId,
  initialProfile,
  versions,
}: {
  projectId: string;
  initialProfile: BrandProfile;
  versions: VersionSummary[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      const result = await saveProfileAction(projectId, profile);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      setEditing(false);
      setMessage(`Version ${result.value.versionNumber} saved.`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="bg-surface-selected rounded-pill px-3 py-1 text-xs font-semibold">
              Mock-generated
            </span>
            <p className="text-secondary mt-2 text-sm">
              Future generation uses the current saved version.
            </p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  className="min-h-11 px-4 text-sm font-semibold"
                  onClick={() => {
                    setProfile(initialProfile);
                    setEditing(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
                  disabled={pending}
                  onClick={save}
                  type="button"
                >
                  {pending ? "Saving…" : "Save new version"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await regenerateProfileAction(projectId);
                      if (!result.ok) {
                        setMessage(result.error.message);
                        return;
                      }
                      setMessage(
                        "Mock regeneration queued. The current version remains active until the new version succeeds.",
                      );
                      router.push(`/app/projects/${projectId}`);
                    })
                  }
                  type="button"
                >
                  Regenerate Brand Profile
                </button>
                <button
                  className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  Edit Brand Profile
                </button>
              </>
            )}
          </div>
        </div>
        {message ? (
          <p
            className="bg-surface-subtle rounded-control p-3 text-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}

        {scalarFields.map(([key, label]) => (
          <section
            className="border-default bg-surface rounded-card border p-5"
            key={key}
          >
            <h2 className="font-display text-lg font-semibold">{label}</h2>
            {editing ? (
              <textarea
                aria-label={label}
                className="border-default rounded-control mt-3 min-h-28 w-full border p-3"
                onChange={(event) =>
                  setProfile((value) => ({
                    ...value,
                    [key]: event.target.value,
                  }))
                }
                value={profile[key]}
              />
            ) : (
              <p className="text-secondary mt-3 whitespace-pre-wrap">
                {profile[key]}
              </p>
            )}
          </section>
        ))}

        {listFields.map(([key, label]) => (
          <section
            className="border-default bg-surface rounded-card border p-5"
            key={key}
          >
            <h2 className="font-display text-lg font-semibold">{label}</h2>
            {editing ? (
              <textarea
                aria-describedby={`${key}-help`}
                aria-label={label}
                className="border-default rounded-control mt-3 min-h-24 w-full border p-3"
                onChange={(event) =>
                  setProfile((value) => ({
                    ...value,
                    [key]: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                value={profile[key].join("\n")}
              />
            ) : (
              <ul className="text-secondary mt-3 list-disc space-y-1 pl-5">
                {profile[key].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {editing ? (
              <p className="text-secondary mt-1 text-xs" id={`${key}-help`}>
                One item per line.
              </p>
            ) : null}
          </section>
        ))}

        <section className="border-default bg-surface rounded-card border p-5">
          <h2 className="font-display text-lg font-semibold">Color palette</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {profile.colorPalette.map((color) => (
              <div
                className="border-default rounded-control border p-3"
                key={`${color.name}-${color.hex}`}
              >
                <span
                  aria-hidden="true"
                  className="mr-3 inline-block size-5 rounded-full border align-middle"
                  style={{ backgroundColor: color.hex }}
                />
                <strong>{color.name}</strong>
                <p className="text-secondary mt-1 text-sm">
                  {color.hex} · {color.role}
                </p>
              </div>
            ))}
          </div>
          {editing ? (
            <p className="text-secondary mt-3 text-sm">
              Palette editing will be added with dedicated color controls. Other
              profile fields remain editable now.
            </p>
          ) : null}
        </section>
      </div>

      <aside className="border-default bg-surface rounded-card h-fit border p-5">
        <h2 className="font-display text-lg font-semibold">Version history</h2>
        <ol className="mt-4 space-y-4">
          {versions.map((version) => (
            <li
              className="border-default border-b pb-4 last:border-0"
              key={version.id}
            >
              <p className="font-semibold">
                Version {version.versionNumber}{" "}
                {version.current ? "· Current" : ""}
              </p>
              <p className="text-secondary mt-1 text-xs">
                {version.source.replaceAll("_", " ").toLowerCase()} ·{" "}
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  new Date(version.createdAt),
                )}
              </p>
              {!version.current ? (
                <button
                  className="text-link mt-2 min-h-11 text-sm font-semibold"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await restoreProfileAction(
                        projectId,
                        version.id,
                      );
                      setMessage(
                        result.ok
                          ? `Version ${result.value.versionNumber} created from the restored snapshot.`
                          : result.error.message,
                      );
                      if (result.ok) router.refresh();
                    })
                  }
                  type="button"
                >
                  Restore as new version
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
