"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { getFoundationCopyDefinition } from "@/domain/content/content-registry";
import {
  FoundationCopySnapshotSchema,
  type FoundationCopySnapshot,
} from "@/domain/content/content-schemas";

import {
  regenerateContentAction,
  restoreContentAction,
  saveContentAction,
} from "./content-actions";
import { ContentJobStatus } from "./content-job-status";

type Version = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  brandProfileVersion: number;
  mock: boolean;
  current: boolean;
};

type Job = Parameters<typeof ContentJobStatus>[0]["initialJob"];

export function ContentItemEditor({
  projectId,
  itemId,
  currentVersionId,
  snapshot,
  versions,
  job,
}: {
  projectId: string;
  itemId: string;
  currentVersionId: string;
  snapshot: FoundationCopySnapshot;
  versions: Version[];
  job?: Job;
}) {
  const definition = getFoundationCopyDefinition();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const {
    register,
    getValues,
    reset,
    formState: { isDirty, errors },
    setError,
  } = useForm<FoundationCopySnapshot>({ defaultValues: snapshot });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!editing || !isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, isDirty]);

  async function copyText(text: string, scope: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${scope} copied.`);
    } catch {
      setMessage(`${scope} could not be copied.`);
    }
  }

  function save() {
    const parsed = FoundationCopySnapshotSchema.safeParse(getValues());
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") {
          setError(key as keyof FoundationCopySnapshot, {
            message: issue.message,
          });
        }
      }
      setMessage("Check the required fields.");
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
            : "Changes couldn’t be saved. Your draft is still here.",
        );
        return;
      }
      setMessage(`Version ${result.value.versionNumber} saved.`);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,56rem)_18rem]">
      <section className="space-y-5">
        {job ? (
          <ContentJobStatus initialJob={job} projectId={projectId} />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            onClick={() =>
              void copyText(definition.copyFormatter(snapshot), "Entire item")
            }
            type="button"
          >
            Copy item
          </button>
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await regenerateContentAction({
                  projectId,
                  itemId,
                  expectedCurrentVersionId: currentVersionId,
                });
                setMessage(
                  result.ok
                    ? "Regeneration queued. Previous version retained."
                    : result.error.message,
                );
                if (result.ok) router.refresh();
              })
            }
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
          {definition.fields
            .filter((field) => field.key !== "schemaVersion")
            .map((field) => (
              <div
                className="border-default bg-surface rounded-card border p-5"
                key={field.key}
              >
                <label
                  className="block text-sm font-semibold"
                  htmlFor={field.key}
                >
                  {field.label}
                </label>
                {editing ? (
                  field.kind === "textarea" ? (
                    <textarea
                      className="border-default rounded-control mt-2 min-h-28 w-full border p-3"
                      id={field.key}
                      {...register(field.key)}
                    />
                  ) : (
                    <input
                      className="border-default rounded-control mt-2 min-h-11 w-full border px-3"
                      id={field.key}
                      {...register(field.key)}
                    />
                  )
                ) : (
                  <p className="text-secondary mt-2 whitespace-pre-wrap">
                    {snapshot[field.key] || "—"}
                  </p>
                )}
                {errors[field.key]?.message ? (
                  <p className="text-error mt-1 text-sm" role="alert">
                    {errors[field.key]?.message}
                  </p>
                ) : null}
                {!editing && field.key !== "notes" ? (
                  <button
                    className="text-link mt-2 min-h-11 text-sm font-semibold"
                    onClick={() =>
                      void copyText(
                        String(snapshot[field.key] ?? ""),
                        field.label,
                      )
                    }
                    type="button"
                  >
                    Copy {field.label.toLowerCase()}
                  </button>
                ) : null}
              </div>
            ))}
          {editing ? (
            <div className="bg-surface border-default sticky bottom-0 flex justify-end gap-2 border-t p-3">
              <button
                className="min-h-11 px-4 text-sm font-semibold"
                onClick={() => {
                  reset(snapshot);
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
