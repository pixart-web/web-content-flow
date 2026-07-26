"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  VideoSnapshotSchema,
  type VideoRegenerationTarget,
  type VideoSnapshot,
} from "@/domain/video/video-schemas";
import { formatVideoContentForCopy } from "@/domain/content/content-registry";
import {
  restoreContentAction,
  saveContentAction,
} from "@/features/content/content-actions";
import { regenerateVideoAction } from "./video-actions";

type Version = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  brandProfileVersion: number;
  mock: boolean;
  current: boolean;
};
const lines = (value: readonly string[] | undefined) =>
  (value ?? []).join("\n");
const parseLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const control =
  "border-default rounded-control mt-1 min-h-11 w-full border px-3 py-2 font-normal disabled:bg-surface-subtle";

function Field({
  label,
  value,
  editing,
  multiline = false,
  onChange,
  onCopy,
}: {
  label: string;
  value: string;
  editing: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
  onCopy?: () => void;
}) {
  const id = useId();
  return (
    <div className="block text-sm font-semibold">
      <span className="flex items-center justify-between gap-3">
        <label htmlFor={id}>{label}</label>
        {onCopy ? (
          <button
            className="text-link min-h-11 text-xs font-semibold"
            onClick={onCopy}
            type="button"
          >
            Copy {label.toLocaleLowerCase()}
          </button>
        ) : null}
      </span>
      {multiline ? (
        <textarea
          className={`${control} min-h-24`}
          disabled={!editing}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        <input
          className={control}
          disabled={!editing}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      )}
    </div>
  );
}

export function VideoItemEditor({
  projectId,
  itemId,
  currentVersionId,
  snapshot,
  versions,
}: {
  projectId: string;
  itemId: string;
  currentVersionId: string;
  snapshot: VideoSnapshot;
  versions: Version[];
}) {
  const [draft, setDraft] = useState<VideoSnapshot>(snapshot);
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
  const update = (next: VideoSnapshot) => {
    setDraft(next);
    setDirty(true);
  };
  async function copy(value: string, scope: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${scope} copied.`);
    } catch {
      setMessage(`${scope} could not be copied.`);
    }
  }
  const regenerate = (target?: VideoRegenerationTarget) =>
    startTransition(async () => {
      const result = await regenerateVideoAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        ...(target ? { target } : {}),
      });
      setMessage(
        result.ok
          ? `${target ? "Targeted" : "Item"} regeneration queued. Previous version retained.`
          : result.error.message,
      );
      if (result.ok) router.refresh();
    });
  const save = () => {
    const parsed = VideoSnapshotSchema.safeParse(draft);
    if (!parsed.success)
      return setMessage(
        parsed.error.issues[0]?.message ?? "Check the video planning fields.",
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
  };
  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    multiline = true,
  ) => (
    <Field
      editing={editing}
      label={label}
      multiline={multiline}
      onChange={onChange}
      onCopy={() => void copy(value, label)}
      value={value}
    />
  );
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,60rem)_18rem]">
      <section className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            onClick={() =>
              void copy(formatVideoContentForCopy(snapshot), "Video plan")
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
        <fieldset className="border-default bg-surface rounded-card grid gap-4 border p-5 sm:grid-cols-2">
          <legend className="px-1 font-semibold">Plan identity</legend>
          {field(
            "Title",
            draft.title,
            (title) => update({ ...draft, title } as VideoSnapshot),
            false,
          )}
          <div className="text-sm">
            <strong>Platform</strong>
            <p className="text-secondary mt-2">{draft.platform}</p>
          </div>
          <div className="text-sm">
            <strong>Format</strong>
            <p className="text-secondary mt-2">{draft.format}</p>
          </div>
          <div className="text-sm">
            <strong>Objective</strong>
            <p className="text-secondary mt-2">{draft.objective}</p>
          </div>
        </fieldset>

        {draft.contentType === "VIDEO_SCRIPT" ? (
          <>
            <fieldset className="border-default bg-surface rounded-card space-y-4 border p-5">
              <legend className="px-1 font-semibold">Script direction</legend>
              {field("Concept summary", draft.conceptSummary, (value) =>
                update({ ...draft, conceptSummary: value }),
              )}
              {field(
                "Hook visual direction",
                draft.hook.visualDirection,
                (value) =>
                  update({
                    ...draft,
                    hook: { ...draft.hook, visualDirection: value },
                  }),
              )}
              {field("Hook spoken text", draft.hook.spokenText ?? "", (value) =>
                update({
                  ...draft,
                  hook: { ...draft.hook, spokenText: value },
                }),
              )}
              <button
                className="text-link min-h-11 text-sm font-semibold"
                disabled={pending}
                onClick={() => regenerate({ kind: "FIELD", field: "HOOK" })}
                type="button"
              >
                Regenerate hook
              </button>
            </fieldset>
            <div className="space-y-4">
              {draft.scenes.map((scene, index) => (
                <fieldset
                  className="border-default bg-surface rounded-card space-y-4 border p-5"
                  key={scene.id}
                >
                  <legend className="px-1 font-semibold">
                    Scene {scene.ordinal} · {scene.estimatedDurationSeconds}s
                  </legend>
                  {field("Purpose", scene.purpose, (value) =>
                    update({
                      ...draft,
                      scenes: draft.scenes.map((current, i) =>
                        i === index ? { ...scene, purpose: value } : current,
                      ),
                    }),
                  )}
                  {field("Visual direction", scene.visualDirection, (value) =>
                    update({
                      ...draft,
                      scenes: draft.scenes.map((current, i) =>
                        i === index
                          ? { ...scene, visualDirection: value }
                          : current,
                      ),
                    }),
                  )}
                  {field("Spoken text", scene.spokenText ?? "", (value) =>
                    update({
                      ...draft,
                      scenes: draft.scenes.map((current, i) =>
                        i === index ? { ...scene, spokenText: value } : current,
                      ),
                    }),
                  )}
                  {field("Voice-over", scene.voiceOver ?? "", (value) =>
                    update({
                      ...draft,
                      scenes: draft.scenes.map((current, i) =>
                        i === index ? { ...scene, voiceOver: value } : current,
                      ),
                    }),
                  )}
                  {field("On-screen text", scene.onScreenText ?? "", (value) =>
                    update({
                      ...draft,
                      scenes: draft.scenes.map((current, i) =>
                        i === index
                          ? { ...scene, onScreenText: value }
                          : current,
                      ),
                    }),
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-link min-h-11 text-sm font-semibold"
                      disabled={pending}
                      onClick={() =>
                        regenerate({ kind: "SCENE", sceneId: scene.id })
                      }
                      type="button"
                    >
                      Regenerate scene
                    </button>
                    {editing ? (
                      <>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...draft.scenes];
                            [next[index - 1], next[index]] = [
                              { ...scene, ordinal: index },
                              { ...next[index - 1]!, ordinal: index + 1 },
                            ];
                            update({ ...draft, scenes: next });
                          }}
                          type="button"
                        >
                          Move scene up
                        </button>
                        <button
                          className="min-h-11 text-sm font-semibold"
                          disabled={index === draft.scenes.length - 1}
                          onClick={() => {
                            const next = [...draft.scenes];
                            [next[index], next[index + 1]] = [
                              { ...next[index + 1]!, ordinal: index + 1 },
                              { ...scene, ordinal: index + 2 },
                            ];
                            update({ ...draft, scenes: next });
                          }}
                          type="button"
                        >
                          Move scene down
                        </button>
                      </>
                    ) : null}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="border-default bg-surface rounded-card flex flex-wrap gap-2 border p-4">
              {[
                ["VOICE_OVER", "Regenerate voice-over"],
                ["ON_SCREEN_TEXT", "Regenerate on-screen text"],
                ["CALL_TO_ACTION", "Regenerate call to action"],
              ].map(([target, label]) => (
                <button
                  className="text-link min-h-11 text-sm font-semibold"
                  disabled={pending}
                  key={target}
                  onClick={() =>
                    regenerate({
                      kind: "FIELD",
                      field: target as
                        "VOICE_OVER" | "ON_SCREEN_TEXT" | "CALL_TO_ACTION",
                    })
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : draft.contentType === "SHOT_LIST" ? (
          <div className="space-y-4">
            {draft.shots.map((shot, index) => (
              <fieldset
                className="border-default bg-surface rounded-card grid gap-4 border p-5 sm:grid-cols-2"
                key={shot.id}
              >
                <legend className="px-1 font-semibold">
                  Shot {shot.ordinal} · {shot.shotType.replaceAll("_", " ")}
                </legend>
                {field("Framing", shot.framing, (value) =>
                  update({
                    ...draft,
                    shots: draft.shots.map((current, i) =>
                      i === index ? { ...shot, framing: value } : current,
                    ),
                  }),
                )}
                {field("Subject", shot.subject, (value) =>
                  update({
                    ...draft,
                    shots: draft.shots.map((current, i) =>
                      i === index ? { ...shot, subject: value } : current,
                    ),
                  }),
                )}
                <div className="sm:col-span-2">
                  {field("Action", shot.action, (value) =>
                    update({
                      ...draft,
                      shots: draft.shots.map((current, i) =>
                        i === index ? { ...shot, action: value } : current,
                      ),
                    }),
                  )}
                </div>
                <button
                  className="text-link min-h-11 w-fit text-sm font-semibold"
                  disabled={pending}
                  onClick={() => regenerate({ kind: "SHOT", shotId: shot.id })}
                  type="button"
                >
                  Regenerate shot
                </button>
                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="min-h-11 text-sm font-semibold"
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...draft.shots];
                        [next[index - 1], next[index]] = [
                          { ...shot, ordinal: index },
                          { ...next[index - 1]!, ordinal: index + 1 },
                        ];
                        update({ ...draft, shots: next });
                      }}
                      type="button"
                    >
                      Move shot up
                    </button>
                    <button
                      className="min-h-11 text-sm font-semibold"
                      disabled={index === draft.shots.length - 1}
                      onClick={() => {
                        const next = [...draft.shots];
                        [next[index], next[index + 1]] = [
                          { ...next[index + 1]!, ordinal: index + 1 },
                          { ...shot, ordinal: index + 2 },
                        ];
                        update({ ...draft, shots: next });
                      }}
                      type="button"
                    >
                      Move shot down
                    </button>
                  </div>
                ) : null}
              </fieldset>
            ))}
          </div>
        ) : draft.contentType === "VOICE_OVER_SCRIPT" ? (
          <fieldset className="border-default bg-surface rounded-card space-y-4 border p-5">
            <legend className="px-1 font-semibold">Voice-over script</legend>
            {field("Tone", draft.tone, (value) =>
              update({ ...draft, tone: value }),
            )}
            {draft.sections.map((section, index) =>
              field(`Section ${section.ordinal}`, section.text, (value) =>
                update({
                  ...draft,
                  sections: draft.sections.map((current, i) =>
                    i === index ? { ...section, text: value } : current,
                  ),
                }),
              ),
            )}
            <button
              className="text-link min-h-11 text-sm font-semibold"
              disabled={pending}
              onClick={() => regenerate({ kind: "FIELD", field: "VOICE_OVER" })}
              type="button"
            >
              Regenerate voice-over
            </button>
          </fieldset>
        ) : draft.contentType === "VIDEO_CAPTION" ? (
          <fieldset className="border-default bg-surface rounded-card space-y-4 border p-5">
            <legend className="px-1 font-semibold">Publishing copy</legend>
            {field("Caption", draft.caption, (value) =>
              update({ ...draft, caption: value }),
            )}
            {field("Call to action", draft.callToAction ?? "", (value) =>
              update({ ...draft, callToAction: value }),
            )}
            {field("Hashtags, one per line", lines(draft.hashtags), (value) =>
              update({ ...draft, hashtags: parseLines(value) }),
            )}
            <div className="flex flex-wrap gap-2">
              {[
                ["VIDEO_CAPTION", "Regenerate caption"],
                ["HASHTAGS", "Regenerate hashtags"],
                ["CALL_TO_ACTION", "Regenerate call to action"],
              ].map(([target, label]) => (
                <button
                  className="text-link min-h-11 text-sm font-semibold"
                  disabled={pending}
                  key={target}
                  onClick={() =>
                    regenerate({
                      kind: "FIELD",
                      field: target as
                        "VIDEO_CAPTION" | "HASHTAGS" | "CALL_TO_ACTION",
                    })
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <fieldset className="border-default bg-surface rounded-card space-y-4 border p-5">
            <legend className="px-1 font-semibold">Production brief</legend>
            {field("Concept", draft.concept, (value) =>
              update({ ...draft, concept: value }),
            )}
            {field("Target audience", draft.targetAudience, (value) =>
              update({ ...draft, targetAudience: value }),
            )}
            {field("Core message", draft.coreMessage, (value) =>
              update({ ...draft, coreMessage: value }),
            )}
            {field("Desired response", draft.desiredResponse, (value) =>
              update({ ...draft, desiredResponse: value }),
            )}
            {field("Visual style", draft.visualDirection.style, (value) =>
              update({
                ...draft,
                visualDirection: { ...draft.visualDirection, style: value },
              }),
            )}
            {field("Editing pace", draft.editingDirection.pace, (value) =>
              update({
                ...draft,
                editingDirection: { ...draft.editingDirection, pace: value },
              }),
            )}
            <div className="flex flex-wrap gap-2">
              <button
                className="text-link min-h-11 text-sm font-semibold"
                disabled={pending}
                onClick={() =>
                  regenerate({ kind: "FIELD", field: "VISUAL_DIRECTION" })
                }
                type="button"
              >
                Regenerate visual direction
              </button>
              <button
                className="text-link min-h-11 text-sm font-semibold"
                disabled={pending}
                onClick={() =>
                  regenerate({ kind: "FIELD", field: "EDITING_DIRECTION" })
                }
                type="button"
              >
                Regenerate editing direction
              </button>
            </div>
          </fieldset>
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
