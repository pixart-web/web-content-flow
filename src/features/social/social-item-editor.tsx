"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  formatSocialContentForCopy,
  getSocialDefinition,
} from "@/domain/content/content-registry";
import {
  SocialSnapshotSchema,
  formatHashtags,
  type SocialRegenerationTarget,
  type SocialSnapshot,
} from "@/domain/social/social-schemas";
import {
  restoreContentAction,
  saveContentAction,
} from "@/features/content/content-actions";

import { regenerateSocialAction } from "./social-actions";

type Version = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  brandProfileVersion: number;
  mock: boolean;
  current: boolean;
};

type FormFields = {
  title: string;
  hook: string;
  main: string;
  callToAction: string;
  hashtags: string;
  notes: string;
};

function initialFields(snapshot: SocialSnapshot): FormFields {
  return {
    title: snapshot.title,
    hook: snapshot.contentType === "SOCIAL_POST" ? snapshot.hook : "",
    main:
      snapshot.contentType === "SOCIAL_POST"
        ? snapshot.body
        : snapshot.contentType === "SOCIAL_CAROUSEL" ||
            snapshot.contentType === "SOCIAL_CAPTION"
          ? snapshot.caption
          : "",
    callToAction:
      snapshot.contentType === "SOCIAL_POST" ||
      snapshot.contentType === "SOCIAL_CAPTION"
        ? (snapshot.callToAction ?? "")
        : snapshot.contentType === "SOCIAL_CAROUSEL"
          ? (snapshot.closingCallToAction ?? "")
          : (snapshot.finalCallToAction ?? ""),
    hashtags: "hashtags" in snapshot ? formatHashtags(snapshot.hashtags) : "",
    notes: snapshot.notes ?? "",
  };
}

function parseHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function SocialItemEditor({
  projectId,
  itemId,
  currentVersionId,
  snapshot,
  versions,
}: {
  projectId: string;
  itemId: string;
  currentVersionId: string;
  snapshot: SocialSnapshot;
  versions: Version[];
}) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState(
    snapshot.contentType === "SOCIAL_CAROUSEL" ? snapshot.slides : [],
  );
  const [frames, setFrames] = useState(
    snapshot.contentType === "SOCIAL_STORY" ? snapshot.frames : [],
  );
  const router = useRouter();
  const definition = getSocialDefinition(snapshot.contentType);
  if (!definition) throw new Error("Social content definition is unavailable.");
  const {
    register,
    getValues,
    reset,
    formState: { isDirty },
  } = useForm<FormFields>({ defaultValues: initialFields(snapshot) });

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (editing && isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [editing, isDirty]);

  async function copy(text: string, scope: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${scope} copied.`);
    } catch {
      setMessage(`${scope} could not be copied.`);
    }
  }

  function candidateFromForm(): unknown {
    const values = getValues();
    const common = {
      ...snapshot,
      title: values.title,
      ...(values.notes ? { notes: values.notes } : { notes: undefined }),
    };
    if (snapshot.contentType === "SOCIAL_POST")
      return {
        ...common,
        hook: values.hook,
        body: values.main,
        callToAction: values.callToAction || undefined,
        hashtags: parseHashtags(values.hashtags),
      };
    if (snapshot.contentType === "SOCIAL_CAROUSEL")
      return {
        ...common,
        slides: slides.map((slide, index) => ({
          ...slide,
          ordinal: index + 1,
        })),
        caption: values.main,
        closingCallToAction: values.callToAction || undefined,
        hashtags: parseHashtags(values.hashtags),
      };
    if (snapshot.contentType === "SOCIAL_STORY")
      return {
        ...common,
        frames: frames.map((frame, index) => ({
          ...frame,
          ordinal: index + 1,
        })),
        finalCallToAction: values.callToAction || undefined,
      };
    return {
      ...common,
      caption: values.main,
      callToAction: values.callToAction || undefined,
      hashtags: parseHashtags(values.hashtags),
    };
  }

  function save() {
    const parsed = SocialSnapshotSchema.safeParse(candidateFromForm());
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Check the Social fields.");
      return;
    }
    startTransition(async () => {
      const result = await saveContentAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        snapshot: parsed.data,
      });
      if (!result.ok) {
        setMessage(
          result.error.code === "CONFLICT"
            ? "A newer version exists. Your draft is still here; copy your changes or reload latest."
            : "Changes could not be saved. Your draft is still here.",
        );
        return;
      }
      setMessage(`Version ${result.value.versionNumber} saved.`);
      setEditing(false);
      router.refresh();
    });
  }

  function regenerate(target?: SocialRegenerationTarget) {
    startTransition(async () => {
      const result = await regenerateSocialAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        ...(target ? { target } : {}),
      });
      setMessage(
        result.ok
          ? `${target ? "Field" : "Item"} regeneration queued. Previous version retained.`
          : result.error.message,
      );
      if (result.ok) router.refresh();
    });
  }

  function move(
    collection: "slides" | "frames",
    index: number,
    direction: -1 | 1,
  ) {
    if (collection === "slides") {
      const next = [...slides];
      const target = index + direction;
      if (!next[index] || !next[target]) return;
      [next[index], next[target]] = [next[target], next[index]];
      setSlides(next);
    } else {
      const next = [...frames];
      const target = index + direction;
      if (!next[index] || !next[target]) return;
      [next[index], next[target]] = [next[target], next[index]];
      setFrames(next);
    }
  }

  const fieldTarget =
    snapshot.contentType === "SOCIAL_POST"
      ? "POST_BODY"
      : snapshot.contentType === "SOCIAL_CAROUSEL"
        ? "CAROUSEL_CAPTION"
        : snapshot.contentType === "SOCIAL_CAPTION"
          ? "STANDALONE_CAPTION"
          : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,60rem)_18rem]">
      <section className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            onClick={() =>
              void copy(formatSocialContentForCopy(snapshot), "Social item")
            }
            type="button"
          >
            Copy item
          </button>
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            disabled={pending}
            onClick={() => regenerate()}
            type="button"
          >
            Regenerate item
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
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <fieldset className="border-default bg-surface rounded-card grid gap-4 border p-5">
            <legend className="px-1 font-semibold">Content</legend>
            <label className="text-sm font-semibold">
              Title
              {editing ? (
                <input
                  className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                  {...register("title")}
                />
              ) : (
                <span className="text-secondary mt-1 block font-normal">
                  {snapshot.title}
                </span>
              )}
            </label>
            {snapshot.contentType === "SOCIAL_POST" ? (
              <label className="text-sm font-semibold">
                Hook
                {editing ? (
                  <textarea
                    className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
                    {...register("hook")}
                  />
                ) : (
                  <span className="text-secondary mt-1 block font-normal whitespace-pre-wrap">
                    {snapshot.hook}
                  </span>
                )}
              </label>
            ) : null}
            {snapshot.contentType !== "SOCIAL_STORY" ? (
              <label className="text-sm font-semibold">
                {snapshot.contentType === "SOCIAL_POST" ? "Body" : "Caption"}
                {editing ? (
                  <textarea
                    className="border-default rounded-control mt-1 min-h-36 w-full border p-3 font-normal"
                    {...register("main")}
                  />
                ) : (
                  <span className="text-secondary mt-1 block font-normal whitespace-pre-wrap">
                    {snapshot.contentType === "SOCIAL_POST"
                      ? snapshot.body
                      : snapshot.caption}
                  </span>
                )}
              </label>
            ) : null}
            <label className="text-sm font-semibold">
              Call to action
              {editing ? (
                <input
                  className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                  {...register("callToAction")}
                />
              ) : (
                <span className="text-secondary mt-1 block font-normal">
                  {initialFields(snapshot).callToAction || "—"}
                </span>
              )}
            </label>
            {fieldTarget ? (
              <button
                className="text-link min-h-11 w-fit text-sm font-semibold"
                disabled={pending}
                onClick={() => regenerate(fieldTarget)}
                type="button"
              >
                Regenerate{" "}
                {snapshot.contentType === "SOCIAL_POST" ? "body" : "caption"}
              </button>
            ) : null}
          </fieldset>
          {snapshot.contentType === "SOCIAL_CAROUSEL"
            ? slides.map((slide, index) => (
                <fieldset
                  className="border-default bg-surface rounded-card border p-5"
                  key={slide.id}
                >
                  <legend className="px-1 font-semibold">
                    Slide {index + 1}
                  </legend>
                  <label className="block text-sm font-semibold">
                    Headline
                    <input
                      className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                      disabled={!editing}
                      onChange={(event) =>
                        setSlides((current) =>
                          current.map((candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, headline: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                      value={slide.headline}
                    />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Body
                    <textarea
                      className="border-default rounded-control mt-1 min-h-24 w-full border p-3 font-normal"
                      disabled={!editing}
                      onChange={(event) =>
                        setSlides((current) =>
                          current.map((candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, body: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                      value={slide.body}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="text-link min-h-11 text-sm font-semibold"
                      onClick={() =>
                        void copy(
                          `${slide.headline}\n${slide.body}`,
                          `Slide ${index + 1}`,
                        )
                      }
                      type="button"
                    >
                      Copy slide
                    </button>
                    {editing ? (
                      <>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === 0}
                          onClick={() => move("slides", index, -1)}
                          type="button"
                        >
                          Move slide {index + 1} up
                        </button>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === slides.length - 1}
                          onClick={() => move("slides", index, 1)}
                          type="button"
                        >
                          Move slide {index + 1} down
                        </button>
                      </>
                    ) : null}
                  </div>
                </fieldset>
              ))
            : null}
          {snapshot.contentType === "SOCIAL_STORY"
            ? frames.map((frame, index) => (
                <fieldset
                  className="border-default bg-surface rounded-card border p-5"
                  key={frame.id}
                >
                  <legend className="px-1 font-semibold">
                    Frame {index + 1}
                  </legend>
                  <label className="block text-sm font-semibold">
                    Headline
                    <input
                      className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                      disabled={!editing}
                      onChange={(event) =>
                        setFrames((current) =>
                          current.map((candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, headline: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                      value={frame.headline ?? ""}
                    />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Body
                    <textarea
                      className="border-default rounded-control mt-1 min-h-24 w-full border p-3 font-normal"
                      disabled={!editing}
                      onChange={(event) =>
                        setFrames((current) =>
                          current.map((candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, body: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                      value={frame.body}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="text-link min-h-11 text-sm font-semibold"
                      onClick={() =>
                        void copy(
                          `${frame.headline ?? ""}\n${frame.body}\n${frame.callToAction ?? ""}`,
                          `Frame ${index + 1}`,
                        )
                      }
                      type="button"
                    >
                      Copy frame
                    </button>
                    {editing ? (
                      <>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === 0}
                          onClick={() => move("frames", index, -1)}
                          type="button"
                        >
                          Move frame {index + 1} up
                        </button>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === frames.length - 1}
                          onClick={() => move("frames", index, 1)}
                          type="button"
                        >
                          Move frame {index + 1} down
                        </button>
                      </>
                    ) : null}
                  </div>
                </fieldset>
              ))
            : null}
          {"hashtags" in snapshot ? (
            <fieldset className="border-default bg-surface rounded-card border p-5">
              <legend className="px-1 font-semibold">Hashtags</legend>
              {editing ? (
                <textarea
                  className="border-default rounded-control mt-1 min-h-20 w-full border p-3"
                  {...register("hashtags")}
                />
              ) : (
                <p className="text-secondary mt-2 break-words">
                  {formatHashtags(snapshot.hashtags) || "No hashtags"}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="text-link min-h-11 text-sm font-semibold"
                  onClick={() =>
                    void copy(formatHashtags(snapshot.hashtags), "Hashtags")
                  }
                  type="button"
                >
                  Copy hashtags
                </button>
                <button
                  className="text-link min-h-11 text-sm font-semibold"
                  disabled={pending}
                  onClick={() => regenerate("HASHTAGS")}
                  type="button"
                >
                  Regenerate hashtags
                </button>
              </div>
            </fieldset>
          ) : null}
          <label className="border-default bg-surface rounded-card block border p-5 text-sm font-semibold">
            Notes
            {editing ? (
              <textarea
                className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
                {...register("notes")}
              />
            ) : (
              <span className="text-secondary mt-1 block font-normal">
                {snapshot.notes ?? "—"}
              </span>
            )}
          </label>
          {editing ? (
            <div className="bg-surface border-default sticky bottom-0 flex justify-end gap-2 border-t p-3">
              <button
                className="min-h-11 px-4 text-sm font-semibold"
                onClick={() => {
                  reset(initialFields(snapshot));
                  setSlides(
                    snapshot.contentType === "SOCIAL_CAROUSEL"
                      ? snapshot.slides
                      : [],
                  );
                  setFrames(
                    snapshot.contentType === "SOCIAL_STORY"
                      ? snapshot.frames
                      : [],
                  );
                  setEditing(false);
                  setMessage("Edits cancelled.");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
                disabled={pending}
                type="submit"
              >
                {pending ? "Saving…" : "Save new version"}
              </button>
            </div>
          ) : null}
        </form>
      </section>
      <aside className="border-default bg-surface rounded-card h-fit border p-5">
        <h2 className="font-display text-lg font-semibold">Version history</h2>
        <ol className="mt-4 space-y-4">
          {versions.map((version) => (
            <li
              className="border-default border-b pb-4 last:border-0"
              key={version.id}
            >
              <p className="font-semibold">
                Version {version.versionNumber}
                {version.current ? " · Current" : ""}
              </p>
              <p className="text-secondary mt-1 text-xs">
                {version.source.replaceAll("_", " ").toLowerCase()} · Brand
                Profile v{version.brandProfileVersion}
                {version.mock ? " · Mock" : ""}
              </p>
              <p className="text-secondary mt-1 text-xs">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                }).format(new Date(version.createdAt))}
              </p>
              {!version.current ? (
                <button
                  className="text-link mt-2 min-h-11 text-sm font-semibold"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      if (
                        !window.confirm(
                          `Restore version ${version.versionNumber} as a new version?`,
                        )
                      )
                        return;
                      const result = await restoreContentAction({
                        projectId,
                        itemId,
                        versionId: version.id,
                        expectedCurrentVersionId: currentVersionId,
                      });
                      setMessage(
                        result.ok
                          ? `Restored as version ${result.value.versionNumber}.`
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
