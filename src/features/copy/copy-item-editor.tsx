"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import {
  COPY_FIELD_COMPATIBILITY,
  GeneralCopySnapshotSchema,
  SECTION_COPY_TYPES,
  type CopyFieldTarget,
  type CopyRegenerationTarget,
  type GeneralCopySnapshot,
} from "@/domain/copy/copy-schemas";
import { formatGeneralCopyForCopy } from "@/domain/content/content-registry";
import {
  restoreContentAction,
  saveContentAction,
} from "@/features/content/content-actions";
import { regenerateCopyAction } from "./copy-actions";

type Version = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  brandProfileVersion: number;
  mock: boolean;
  current: boolean;
};
type Path = readonly (string | number)[];
const protectedKeys = new Set([
  "schemaVersion",
  "contentType",
  "purpose",
  "tone",
  "length",
  "audienceAwareness",
  "provenance",
  "id",
  "ordinal",
]);
const labels: Record<string, string> = {
  callToAction: "Call to action",
  metaDescription: "Meta description",
  previewText: "Preview text",
  subjectLine: "Subject line",
  shortDescription: "Short description",
  fullDescription: "Full description",
  keyBenefits: "Key benefits",
  shortBio: "Short bio",
  longBio: "Long bio",
};
const label = (key: string) =>
  labels[key] ??
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^\w/, (value) => value.toUpperCase());
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const fieldTargets: Record<string, CopyFieldTarget> = {
  subjectLine: "SUBJECT_LINE",
  previewText: "PREVIEW_TEXT",
  opening: "OPENING",
  callToAction: "CALL_TO_ACTION",
  shortDescription: "SHORT_DESCRIPTION",
  fullDescription: "FULL_DESCRIPTION",
  keyBenefits: "KEY_BENEFITS",
  headline: "HEADLINE",
  introduction: "INTRODUCTION",
  conclusion: "CONCLUSION",
  metaDescription: "META_DESCRIPTION",
  answer: "FAQ_ANSWER",
  boilerplate: "BOILERPLATE",
  valueProposition: "VALUE_PROPOSITION",
  shortBio: "BIO_SHORT",
  longBio: "BIO_LONG",
};
const sectionCollectionKeys = new Set([
  "bodySections",
  "sections",
  "details",
  "entries",
]);

function replaceAtPath(
  snapshot: GeneralCopySnapshot,
  path: Path,
  value: unknown,
) {
  const next: unknown = structuredClone(snapshot);
  let cursor: unknown = next;
  for (const part of path.slice(0, -1)) {
    if (Array.isArray(cursor) && typeof part === "number")
      cursor = cursor[part];
    else if (isRecord(cursor) && typeof part === "string")
      cursor = cursor[part];
  }
  const last = path.at(-1);
  if (Array.isArray(cursor) && typeof last === "number") cursor[last] = value;
  else if (isRecord(cursor) && typeof last === "string") cursor[last] = value;
  return next as GeneralCopySnapshot;
}

function StructuredField({
  fieldKey,
  value,
  path,
  editing,
  onChange,
  onCopy,
  onRegenerate,
  sectionId,
}: {
  fieldKey: string;
  value: unknown;
  path: Path;
  editing: boolean;
  onChange: (path: Path, value: unknown) => void;
  onCopy: (value: string, scope: string) => void;
  onRegenerate: (target: CopyRegenerationTarget) => void;
  sectionId?: string | undefined;
}) {
  const id = useId();
  if (typeof value === "string") {
    const multiline = value.length > 100 || /\n/.test(value);
    const target = fieldTargets[fieldKey];
    return (
      <div className="text-sm font-semibold">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={id}>{label(fieldKey)}</label>
          <span>
            <button
              className="text-link min-h-11 px-2 text-xs"
              onClick={() => onCopy(value, label(fieldKey))}
              type="button"
            >
              Copy
            </button>
            {target ? (
              <button
                className="text-link min-h-11 px-2 text-xs"
                onClick={() =>
                  onRegenerate({
                    kind: "FIELD",
                    field: target,
                    ...(sectionId ? { sectionId } : {}),
                  })
                }
                type="button"
              >
                Regenerate
              </button>
            ) : null}
          </span>
        </span>
        {multiline ? (
          <textarea
            className="border-default rounded-control disabled:bg-surface-subtle mt-1 min-h-24 w-full border p-3 font-normal"
            disabled={!editing}
            id={id}
            onChange={(event) => onChange(path, event.target.value)}
            value={value}
          />
        ) : (
          <input
            className="border-default rounded-control disabled:bg-surface-subtle mt-1 min-h-11 w-full border px-3 font-normal"
            disabled={!editing}
            id={id}
            onChange={(event) => onChange(path, event.target.value)}
            value={value}
          />
        )}
      </div>
    );
  }
  if (typeof value === "number") {
    return (
      <label className="text-sm font-semibold">
        {label(fieldKey)}
        <input
          className="border-default rounded-control disabled:bg-surface-subtle mt-1 min-h-11 w-full border px-3 font-normal"
          disabled={!editing}
          min={0}
          onChange={(event) => onChange(path, Number(event.target.value))}
          type="number"
          value={value}
        />
      </label>
    );
  }
  if (typeof value === "boolean")
    return (
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input
          checked={value}
          disabled={!editing}
          onChange={(event) => onChange(path, event.target.checked)}
          type="checkbox"
        />
        {label(fieldKey)}
      </label>
    );
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === "string"))
      return (
        <label className="text-sm font-semibold">
          {label(fieldKey)}
          <textarea
            className="border-default rounded-control disabled:bg-surface-subtle mt-1 min-h-24 w-full border p-3 font-normal"
            disabled={!editing}
            onChange={(event) =>
              onChange(
                path,
                event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            value={value.join("\n")}
          />
        </label>
      );
    return (
      <fieldset className="border-default rounded-card space-y-3 border p-4">
        <legend className="px-1 font-semibold">{label(fieldKey)}</legend>
        {value.map((entry, index) => {
          const sectionId =
            isRecord(entry) && typeof entry.id === "string"
              ? entry.id
              : undefined;
          return (
            <div
              className="bg-surface-subtle rounded-control space-y-3 p-4"
              key={sectionId ?? index}
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm">Item {index + 1}</strong>
                {sectionId && sectionCollectionKeys.has(fieldKey) ? (
                  <button
                    className="text-link min-h-11 text-xs font-semibold"
                    onClick={() => onRegenerate({ kind: "SECTION", sectionId })}
                    type="button"
                  >
                    Regenerate section
                  </button>
                ) : null}
              </div>
              <StructuredFields
                editing={editing}
                onChange={onChange}
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                path={[...path, index]}
                sectionId={sectionId}
                value={entry}
              />
            </div>
          );
        })}
      </fieldset>
    );
  }
  if (isRecord(value))
    return (
      <fieldset className="border-default rounded-card space-y-3 border p-4">
        <legend className="px-1 font-semibold">{label(fieldKey)}</legend>
        <StructuredFields
          editing={editing}
          onChange={onChange}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          path={path}
          {...(sectionId ? { sectionId } : {})}
          value={value}
        />
      </fieldset>
    );
  return null;
}

function StructuredFields({
  value,
  path,
  ...actions
}: {
  value: unknown;
  path: Path;
  editing: boolean;
  onChange: (path: Path, value: unknown) => void;
  onCopy: (value: string, scope: string) => void;
  onRegenerate: (target: CopyRegenerationTarget) => void;
  sectionId?: string | undefined;
}) {
  if (!isRecord(value)) return null;
  const currentSectionId =
    typeof value.id === "string" ? value.id : actions.sectionId;
  return Object.entries(value)
    .filter(([key, entry]) => !protectedKeys.has(key) && entry != null)
    .map(([key, entry]) => (
      <StructuredField
        {...actions}
        fieldKey={key}
        key={key}
        path={[...path, key]}
        {...(currentSectionId ? { sectionId: currentSectionId } : {})}
        value={entry}
      />
    ));
}

export function CopyItemEditor({
  projectId,
  itemId,
  currentVersionId,
  snapshot,
  versions,
}: {
  projectId: string;
  itemId: string;
  currentVersionId: string;
  snapshot: GeneralCopySnapshot;
  versions: Version[];
}) {
  const { control, reset, setValue } = useForm<{
    snapshot: GeneralCopySnapshot;
  }>({ defaultValues: { snapshot } });
  const draft = useWatch({ control, name: "snapshot" }) ?? snapshot;
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
  async function copy(value: string, scope: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${scope} copied.`);
    } catch {
      setMessage(`${scope} could not be copied.`);
    }
  }
  const regenerate = (target?: CopyRegenerationTarget) => {
    if (
      target?.kind === "SECTION" &&
      !SECTION_COPY_TYPES.has(snapshot.contentType)
    )
      return setMessage("Section regeneration is not available for this type.");
    if (
      target?.kind === "FIELD" &&
      !COPY_FIELD_COMPATIBILITY[snapshot.contentType].includes(target.field)
    )
      return setMessage("That field cannot be regenerated for this type.");
    startTransition(async () => {
      const result = await regenerateCopyAction({
        projectId,
        itemId,
        expectedCurrentVersionId: currentVersionId,
        ...(target ? { target } : {}),
      });
      setMessage(
        result.ok
          ? "Regeneration queued. Previous version retained."
          : result.error.message,
      );
      if (result.ok) router.refresh();
    });
  };
  const save = () => {
    const parsed = GeneralCopySnapshotSchema.safeParse(draft);
    if (!parsed.success)
      return setMessage(
        parsed.error.issues[0]?.message ?? "Check the copy fields.",
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
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,60rem)_18rem]">
      <section className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            onClick={() =>
              void copy(formatGeneralCopyForCopy(snapshot), "Copy item")
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
        <div className="border-default bg-surface rounded-card space-y-4 border p-5">
          <StructuredFields
            editing={editing}
            onChange={(path, value) => {
              setValue("snapshot", replaceAtPath(draft, path, value), {
                shouldDirty: true,
              });
              setDirty(true);
            }}
            onCopy={(value, scope) => void copy(value, scope)}
            onRegenerate={regenerate}
            path={[]}
            value={draft}
          />
        </div>
        {editing ? (
          <div className="bg-surface border-default sticky bottom-0 flex flex-wrap gap-2 border-t p-3">
            <button
              className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
              disabled={pending || !dirty}
              onClick={save}
              type="button"
            >
              Save new version
            </button>
            <button
              className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
              disabled={pending}
              onClick={() => {
                reset({ snapshot });
                setDirty(false);
                setEditing(false);
                setMessage("Changes discarded.");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </section>
      <aside className="space-y-4">
        <div className="border-default bg-surface rounded-card border p-4">
          <h2 className="font-semibold">Provenance</h2>
          <dl className="text-secondary mt-3 space-y-2 text-sm">
            <div>
              <dt>Purpose</dt>
              <dd className="text-primary font-medium">{snapshot.purpose}</dd>
            </div>
            <div>
              <dt>Tone</dt>
              <dd className="text-primary font-medium">{snapshot.tone}</dd>
            </div>
            <div>
              <dt>Prompt</dt>
              <dd className="text-primary font-medium">
                {snapshot.provenance.promptVersion}
              </dd>
            </div>
          </dl>
        </div>
        <details className="border-default bg-surface rounded-card border p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">
            Versions ({versions.length})
          </summary>
          <ol className="mt-3 space-y-3">
            {versions.map((version) => (
              <li
                className="border-default border-t pt-3 text-sm"
                key={version.id}
              >
                <strong>
                  Version {version.versionNumber}
                  {version.current ? " · Current" : ""}
                </strong>
                <p className="text-secondary">
                  {version.source} · Brand Profile v
                  {version.brandProfileVersion}
                  {version.mock ? " · Mock" : ""}
                </p>
                <time
                  className="text-secondary block"
                  dateTime={version.createdAt}
                >
                  {new Date(version.createdAt).toLocaleString()}
                </time>
                {!version.current ? (
                  <button
                    className="text-link min-h-11 text-sm font-semibold"
                    disabled={pending}
                    onClick={() =>
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
        </details>
      </aside>
    </div>
  );
}
