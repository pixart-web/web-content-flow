"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { getWebsitePageDefinition } from "@/domain/content/content-registry";
import {
  WebsitePageSnapshotSchema,
  type WebsitePageSnapshot,
} from "@/domain/website/website-schemas";
import {
  restoreContentAction,
  saveContentAction,
} from "@/features/content/content-actions";

import { regenerateWebsitePageAction } from "./website-actions";

type Version = {
  id: string;
  versionNumber: number;
  source: string;
  createdAt: string;
  brandProfileVersion: number;
  mock: boolean;
  current: boolean;
};

export function WebsitePageEditor({
  projectId,
  itemId,
  currentVersionId,
  snapshot,
  versions,
}: {
  projectId: string;
  itemId: string;
  currentVersionId: string;
  snapshot: WebsitePageSnapshot;
  versions: Version[];
}) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const {
    register,
    getValues,
    reset,
    formState: { isDirty },
  } = useForm<WebsitePageSnapshot>({ defaultValues: snapshot });
  const definition = getWebsitePageDefinition();

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

  function save() {
    const parsed = WebsitePageSnapshotSchema.safeParse(getValues());
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Check the page fields.");
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

  const sectionText = (section: WebsitePageSnapshot["sections"][number]) => {
    if ("body" in section)
      return `${section.heading}\n${section.body}${"callToAction" in section ? `\n${section.callToAction}` : ""}`;
    if ("items" in section)
      return `${section.heading}\n${section.items
        .map((item) =>
          "question" in item
            ? `${item.question}\n${item.answer}`
            : `${item.title}\n${item.description}`,
        )
        .join("\n\n")}`;
    return `${section.heading}\n${section.steps
      .map((step) => `${step.title}\n${step.description}`)
      .join("\n\n")}`;
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,60rem)_18rem]">
      <section className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            onClick={() =>
              void copy(definition.copyFormatter(snapshot), "Page")
            }
            type="button"
          >
            Copy page
          </button>
          <button
            className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await regenerateWebsitePageAction({
                  projectId,
                  itemId,
                  expectedCurrentVersionId: currentVersionId,
                });
                setMessage(
                  result.ok
                    ? "Page regeneration queued. Previous version retained."
                    : result.error.message,
                );
                if (result.ok) router.refresh();
              })
            }
            type="button"
          >
            Regenerate page
          </button>
          {!editing ? (
            <button
              className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
              onClick={() => setEditing(true)}
              type="button"
            >
              Edit page
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
            <legend className="px-1 font-semibold">Page details</legend>
            {(
              [
                ["pageName", "Page name"],
                ["purpose", "Purpose"],
                ["targetAudience", "Target audience"],
              ] as const
            ).map(([key, label]) => (
              <label className="text-sm font-semibold" key={key}>
                {label}
                {editing ? (
                  <textarea
                    className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
                    {...register(key)}
                  />
                ) : (
                  <span className="text-secondary mt-1 block font-normal whitespace-pre-wrap">
                    {snapshot[key]}
                  </span>
                )}
              </label>
            ))}
          </fieldset>
          <fieldset className="border-default bg-surface rounded-card grid gap-4 border p-5">
            <legend className="px-1 font-semibold">SEO</legend>
            <label className="text-sm font-semibold">
              Title
              {editing ? (
                <input
                  className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                  {...register("seo.title")}
                />
              ) : (
                <span className="text-secondary mt-1 block font-normal">
                  {snapshot.seo.title}
                </span>
              )}
            </label>
            <label className="text-sm font-semibold">
              Meta description
              {editing ? (
                <textarea
                  className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
                  {...register("seo.metaDescription")}
                />
              ) : (
                <span className="text-secondary mt-1 block font-normal">
                  {snapshot.seo.metaDescription}
                </span>
              )}
            </label>
          </fieldset>
          <fieldset className="border-default bg-surface rounded-card grid gap-4 border p-5">
            <legend className="px-1 font-semibold">Hero</legend>
            {(
              [
                ["hero.headline", "Headline"],
                ["hero.supportingText", "Supporting text"],
                ["hero.primaryCTA", "Primary call to action"],
              ] as const
            ).map(([key, label]) => (
              <label className="text-sm font-semibold" key={key}>
                {label}
                {editing ? (
                  <textarea
                    className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
                    {...register(key)}
                  />
                ) : (
                  <span className="text-secondary mt-1 block font-normal whitespace-pre-wrap">
                    {key === "hero.headline"
                      ? snapshot.hero.headline
                      : key === "hero.supportingText"
                        ? snapshot.hero.supportingText
                        : snapshot.hero.primaryCTA}
                  </span>
                )}
              </label>
            ))}
          </fieldset>
          {snapshot.sections.map((section, index) => (
            <fieldset
              className="border-default bg-surface rounded-card border p-5"
              key={section.id}
            >
              <legend className="px-1 font-semibold">
                {section.heading} · {section.type}
              </legend>
              {editing ? (
                <>
                  <label className="mt-2 block text-sm font-semibold">
                    Heading
                    <input
                      className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                      {...register(`sections.${index}.heading`)}
                    />
                  </label>
                  {"body" in section ? (
                    <label className="mt-3 block text-sm font-semibold">
                      Body
                      <textarea
                        className="border-default rounded-control mt-1 min-h-32 w-full border p-3 font-normal"
                        {...register(`sections.${index}.body`)}
                      />
                    </label>
                  ) : null}
                </>
              ) : (
                <p className="text-secondary mt-2 whitespace-pre-wrap">
                  {sectionText(section)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="text-link min-h-11 text-sm font-semibold"
                  onClick={() =>
                    void copy(
                      sectionText(section),
                      `Section ${section.heading}`,
                    )
                  }
                  type="button"
                >
                  Copy section
                </button>
                <button
                  className="text-link min-h-11 text-sm font-semibold"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await regenerateWebsitePageAction({
                        projectId,
                        itemId,
                        expectedCurrentVersionId: currentVersionId,
                        sectionId: section.id,
                      });
                      setMessage(
                        result.ok
                          ? "Section regeneration queued. Previous version retained."
                          : result.error.message,
                      );
                      if (result.ok) router.refresh();
                    })
                  }
                  type="button"
                >
                  Regenerate section
                </button>
              </div>
            </fieldset>
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
