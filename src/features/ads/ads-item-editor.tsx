"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  AdsSnapshotSchema,
  type AdsRegenerationTarget,
  type AdsSnapshot,
} from "@/domain/ads/ads-schemas";
import { formatAdsContentForCopy } from "@/domain/content/content-registry";
import {
  restoreContentAction,
  saveContentAction,
} from "@/features/content/content-actions";
import { regenerateAdsAction } from "./ads-actions";

type Version = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  brandProfileVersion: number;
  mock: boolean;
  current: boolean;
};
const lines = (value: readonly string[]) => value.join("\n");
const parseLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export function AdsItemEditor({
  projectId,
  itemId,
  currentVersionId,
  snapshot,
  versions,
}: {
  projectId: string;
  itemId: string;
  currentVersionId: string;
  snapshot: AdsSnapshot;
  versions: Version[];
}) {
  const [draft, setDraft] = useState<AdsSnapshot>(snapshot);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (editing && dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, editing]);
  const update = (next: AdsSnapshot) => {
    setDraft(next);
    setDirty(true);
  };
  async function copy(text: string, scope: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${scope} copied.`);
    } catch {
      setMessage(`${scope} could not be copied.`);
    }
  }
  function save() {
    const parsed = AdsSnapshotSchema.safeParse(draft);
    if (!parsed.success)
      return setMessage(
        parsed.error.issues[0]?.message ?? "Check the advertising fields.",
      );
    startTransition(async () => {
      const result = await saveContentAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        snapshot: parsed.data,
      });
      if (!result.ok)
        return setMessage(
          result.error.code === "CONFLICT"
            ? "A newer version exists. Your draft is still here; copy your changes or reload latest."
            : "Changes could not be saved. Your draft is still here.",
        );
      setMessage(`Version ${result.value.versionNumber} saved.`);
      setEditing(false);
      setDirty(false);
      router.refresh();
    });
  }
  function regenerate(target?: AdsRegenerationTarget) {
    startTransition(async () => {
      const result = await regenerateAdsAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        ...(target ? { target } : {}),
      });
      setMessage(
        result.ok
          ? `${target ? "Targeted" : "Asset"} regeneration queued. Previous version retained.`
          : result.error.message,
      );
      if (result.ok) router.refresh();
    });
  }
  const setTitle = (title: string) =>
    update({ ...draft, title } as AdsSnapshot);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,60rem)_18rem]">
      <section className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            onClick={() =>
              void copy(formatAdsContentForCopy(snapshot), "Advertising asset")
            }
            type="button"
          >
            Copy asset
          </button>
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            disabled={pending}
            onClick={() => regenerate()}
            type="button"
          >
            Regenerate asset
          </button>
          {!editing ? (
            <button
              className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
              onClick={() => setEditing(true)}
              type="button"
            >
              Edit
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
        <fieldset className="border-default bg-surface rounded-card border p-5">
          <legend className="px-1 font-semibold">Asset</legend>
          <label className="block text-sm font-semibold">
            Title
            {editing ? (
              <input
                className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                onChange={(event) => setTitle(event.target.value)}
                value={draft.title}
              />
            ) : (
              <span className="text-secondary mt-1 block font-normal">
                {snapshot.title}
              </span>
            )}
          </label>
        </fieldset>
        {"variants" in draft ? (
          <>
            <p className="text-secondary text-sm">
              Compare editorial alternatives. Performance is not predicted.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {draft.variants.map((variant, index) => (
                <fieldset
                  className="border-default bg-surface rounded-card space-y-3 border p-5"
                  key={variant.id}
                >
                  <legend className="px-1 font-semibold">
                    {variant.label}
                  </legend>
                  {"headlines" in variant ? (
                    <>
                      <label className="block text-sm font-semibold">
                        Headlines
                        <textarea
                          className="border-default rounded-control mt-1 min-h-28 w-full border p-3 font-normal"
                          disabled={!editing}
                          onChange={(event) =>
                            update({
                              ...draft,
                              variants: draft.variants.map((value, i) =>
                                i === index
                                  ? {
                                      ...variant,
                                      headlines: parseLines(event.target.value),
                                    }
                                  : value,
                              ),
                            } as AdsSnapshot)
                          }
                          value={lines(variant.headlines)}
                        />
                      </label>
                      <label className="block text-sm font-semibold">
                        Descriptions
                        <textarea
                          className="border-default rounded-control mt-1 min-h-24 w-full border p-3 font-normal"
                          disabled={!editing}
                          onChange={(event) =>
                            update({
                              ...draft,
                              variants: draft.variants.map((value, i) =>
                                i === index
                                  ? {
                                      ...variant,
                                      descriptions: parseLines(
                                        event.target.value,
                                      ),
                                    }
                                  : value,
                              ),
                            } as AdsSnapshot)
                          }
                          value={lines(variant.descriptions)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-semibold">
                        {draft.contentType === "LINKEDIN_AD"
                          ? "Introductory text"
                          : "Primary text"}
                        <textarea
                          className="border-default rounded-control mt-1 min-h-28 w-full border p-3 font-normal"
                          disabled={!editing}
                          onChange={(event) =>
                            update({
                              ...draft,
                              variants: draft.variants.map((value, i) =>
                                i === index
                                  ? {
                                      ...variant,
                                      ...(draft.contentType === "LINKEDIN_AD"
                                        ? {
                                            introductoryText:
                                              event.target.value,
                                          }
                                        : { primaryText: event.target.value }),
                                    }
                                  : value,
                              ),
                            } as AdsSnapshot)
                          }
                          value={
                            "introductoryText" in variant
                              ? variant.introductoryText
                              : variant.primaryText
                          }
                        />
                      </label>
                      <label className="block text-sm font-semibold">
                        Headline
                        <input
                          className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                          disabled={!editing}
                          onChange={(event) =>
                            update({
                              ...draft,
                              variants: draft.variants.map((value, i) =>
                                i === index
                                  ? { ...variant, headline: event.target.value }
                                  : value,
                              ),
                            } as AdsSnapshot)
                          }
                          value={variant.headline}
                        />
                      </label>
                    </>
                  )}
                  <label className="block text-sm font-semibold">
                    Call to action
                    <input
                      className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                      disabled={!editing}
                      onChange={(event) =>
                        update({
                          ...draft,
                          variants: draft.variants.map((value, i) =>
                            i === index
                              ? { ...variant, callToAction: event.target.value }
                              : value,
                          ),
                        } as AdsSnapshot)
                      }
                      value={variant.callToAction ?? ""}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-link min-h-11 text-sm font-semibold"
                      onClick={() =>
                        void copy(
                          formatAdsContentForCopy({
                            ...snapshot,
                            variants: [variant],
                          } as AdsSnapshot),
                          variant.label,
                        )
                      }
                      type="button"
                    >
                      Copy {variant.label}
                    </button>
                    <button
                      className="text-link min-h-11 text-sm font-semibold"
                      disabled={pending}
                      onClick={() =>
                        regenerate({ kind: "VARIANT", variantId: variant.id })
                      }
                      type="button"
                    >
                      Regenerate {variant.label}
                    </button>
                    {editing ? (
                      <>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...draft.variants];
                            const previous = next[index - 1];
                            if (!previous) return;
                            next[index - 1] = variant;
                            next[index] = previous;
                            update({ ...draft, variants: next } as AdsSnapshot);
                          }}
                          type="button"
                        >
                          Move {variant.label} up
                        </button>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === draft.variants.length - 1}
                          onClick={() => {
                            const next = [...draft.variants];
                            const following = next[index + 1];
                            if (!following) return;
                            next[index + 1] = variant;
                            next[index] = following;
                            update({ ...draft, variants: next } as AdsSnapshot);
                          }}
                          type="button"
                        >
                          Move {variant.label} down
                        </button>
                      </>
                    ) : null}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="border-default bg-surface rounded-card flex flex-wrap gap-2 border p-4">
              {draft.contentType === "GOOGLE_SEARCH_AD" ? (
                <>
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    disabled={pending}
                    onClick={() =>
                      regenerate({ kind: "FIELD", field: "HEADLINES" })
                    }
                    type="button"
                  >
                    Regenerate headlines
                  </button>
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    disabled={pending}
                    onClick={() =>
                      regenerate({ kind: "FIELD", field: "DESCRIPTIONS" })
                    }
                    type="button"
                  >
                    Regenerate descriptions
                  </button>
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    disabled={pending}
                    onClick={() =>
                      regenerate({ kind: "FIELD", field: "KEYWORD_THEMES" })
                    }
                    type="button"
                  >
                    Regenerate keyword themes
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    disabled={pending}
                    onClick={() =>
                      regenerate({ kind: "FIELD", field: "PRIMARY_TEXT" })
                    }
                    type="button"
                  >
                    Regenerate primary text
                  </button>
                  {draft.contentType === "META_AD" ? (
                    <button
                      className="text-link min-h-11 text-sm font-semibold"
                      disabled={pending}
                      onClick={() =>
                        regenerate({
                          kind: "FIELD",
                          field: "CREATIVE_DIRECTION",
                        })
                      }
                      type="button"
                    >
                      Regenerate creative direction
                    </button>
                  ) : null}
                </>
              )}
              <button
                className="text-link min-h-11 text-sm font-semibold"
                disabled={pending}
                onClick={() =>
                  regenerate({ kind: "FIELD", field: "CALL_TO_ACTION" })
                }
                type="button"
              >
                Regenerate calls to action
              </button>
            </div>
          </>
        ) : draft.contentType === "CREATIVE_BRIEF" ? (
          <fieldset className="border-default bg-surface rounded-card grid gap-4 border p-5">
            <legend className="px-1 font-semibold">Creative direction</legend>
            {(
              [
                ["audienceInsight", "Audience insight"],
                ["campaignPromise", "Campaign promise"],
                ["keyMessage", "Key message"],
                ["emotionalAngle", "Emotional angle"],
              ] as const
            ).map(([key, label]) => (
              <label className="text-sm font-semibold" key={key}>
                {label}
                <textarea
                  className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
                  disabled={!editing}
                  onChange={(event) =>
                    update({
                      ...draft,
                      [key]: event.target.value,
                    } as AdsSnapshot)
                  }
                  value={String(draft[key as keyof typeof draft] ?? "")}
                />
              </label>
            ))}
            <label className="text-sm font-semibold">
              Visual concept
              <textarea
                className="border-default rounded-control mt-1 min-h-24 w-full border p-3 font-normal"
                disabled={!editing}
                onChange={(event) =>
                  update({
                    ...draft,
                    visualDirection: {
                      ...draft.visualDirection,
                      concept: event.target.value,
                    },
                  })
                }
                value={draft.visualDirection.concept}
              />
            </label>
            <button
              className="text-link min-h-11 w-fit text-sm font-semibold"
              disabled={pending}
              onClick={() =>
                regenerate({ kind: "FIELD", field: "VISUAL_DIRECTION" })
              }
              type="button"
            >
              Regenerate visual direction
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                className="text-link min-h-11 text-sm font-semibold"
                disabled={pending}
                onClick={() =>
                  regenerate({ kind: "FIELD", field: "KEY_MESSAGE" })
                }
                type="button"
              >
                Regenerate key message
              </button>
              <button
                className="text-link min-h-11 text-sm font-semibold"
                disabled={pending}
                onClick={() =>
                  regenerate({ kind: "FIELD", field: "COPY_DIRECTION" })
                }
                type="button"
              >
                Regenerate copy direction
              </button>
            </div>
          </fieldset>
        ) : (
          <div className="space-y-4">
            <p className="border-default bg-surface-subtle rounded-control border p-3 text-sm">
              Prompt pack only — no image was generated.
            </p>
            {draft.prompts.map((prompt, index) => (
              <fieldset
                className="border-default bg-surface rounded-card space-y-3 border p-5"
                key={prompt.id}
              >
                <legend className="px-1 font-semibold">{prompt.label}</legend>
                <label className="block text-sm font-semibold">
                  Purpose
                  <input
                    className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                    disabled={!editing}
                    onChange={(event) =>
                      update({
                        ...draft,
                        prompts: draft.prompts.map((value, i) =>
                          i === index
                            ? { ...prompt, purpose: event.target.value }
                            : value,
                        ),
                      })
                    }
                    value={prompt.purpose}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Prompt
                  <textarea
                    className="border-default rounded-control mt-1 min-h-36 w-full border p-3 font-normal"
                    disabled={!editing}
                    onChange={(event) =>
                      update({
                        ...draft,
                        prompts: draft.prompts.map((value, i) =>
                          i === index
                            ? { ...prompt, prompt: event.target.value }
                            : value,
                        ),
                      })
                    }
                    value={prompt.prompt}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    onClick={() => void copy(prompt.prompt, prompt.label)}
                    type="button"
                  >
                    Copy prompt
                  </button>
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    disabled={pending}
                    onClick={() =>
                      regenerate({ kind: "PROMPT", promptId: prompt.id })
                    }
                    type="button"
                  >
                    Regenerate prompt
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              className="text-link min-h-11 text-sm font-semibold"
              disabled={pending}
              onClick={() =>
                regenerate({ kind: "FIELD", field: "IMAGE_PROMPTS" })
              }
              type="button"
            >
              Regenerate prompt pack
            </button>
          </div>
        )}
        {editing ? (
          <div className="border-default bg-surface rounded-card sticky bottom-3 flex flex-wrap gap-2 border p-3 shadow-sm">
            <button
              className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
              disabled={pending}
              onClick={save}
              type="button"
            >
              Save new version
            </button>
            <button
              className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
              onClick={() => {
                setDraft(snapshot);
                setDirty(false);
                setEditing(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </section>
      <aside className="border-default bg-surface rounded-card h-fit border p-5">
        <h3 className="font-semibold">Version history</h3>
        <ul className="mt-3 space-y-3">
          {versions.map((version) => (
            <li
              className="border-default border-b pb-3 text-sm"
              key={version.id}
            >
              <strong>
                Version {version.versionNumber}
                {version.current ? " · Current" : ""}
              </strong>
              <p className="text-secondary mt-1">
                {version.source} · Brand Profile v{version.brandProfileVersion}
                {version.mock ? " · Mock" : ""}
              </p>
              {!version.current ? (
                <button
                  className="text-link min-h-11 text-sm font-semibold"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Restore version ${version.versionNumber}? A new version will be created.`,
                      )
                    )
                      return;
                    startTransition(async () => {
                      const result = await restoreContentAction({
                        projectId,
                        itemId,
                        versionId: version.id,
                        expectedCurrentVersionId: currentVersionId,
                      });
                      setMessage(
                        result.ok
                          ? "Version restored as a new version."
                          : result.error.message,
                      );
                      if (result.ok) router.refresh();
                    });
                  }}
                  type="button"
                >
                  Restore version
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
