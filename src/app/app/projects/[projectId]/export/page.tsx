import { notFound } from "next/navigation";

import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { getRolloutPolicy } from "@/server/launch/rollout";

export default async function ProjectExportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getPrisma().project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      contentItems: {
        where: { currentVersionId: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          module: true,
          type: true,
          currentVersion: { select: { versionNumber: true } },
        },
      },
    },
  });
  if (!project) notFound();
  const enabled = getRolloutPolicy().exportsEnabled;
  return (
    <div className="max-w-4xl">
      <header>
        <p className="text-secondary text-sm">{project.name}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Export</h1>
        <p className="text-secondary mt-3 max-w-prose">
          Export validated, saved Content Item versions. Raw provider responses,
          account data and internal prompts are never included.
        </p>
      </header>

      {!enabled ? (
        <p className="border-default bg-surface-subtle rounded-control mt-8 border p-4">
          Exports are unavailable in the current launch mode.
        </p>
      ) : project.contentItems.length ? (
        <form
          action={`/api/projects/${project.id}/exports`}
          className="border-default bg-surface rounded-panel mt-8 space-y-6 border p-6"
          method="post"
        >
          <fieldset>
            <legend className="font-display text-lg font-semibold">
              Content selection
            </legend>
            <div className="mt-4 grid gap-3">
              {project.contentItems.map((item) => (
                <label
                  className="border-default rounded-control flex min-h-11 items-center gap-3 border p-3"
                  key={item.id}
                >
                  <input name="itemIds" type="checkbox" value={item.id} />
                  <span>
                    <strong>{item.title}</strong>
                    <span className="text-secondary ml-2 text-sm">
                      {item.module} · v{item.currentVersion?.versionNumber}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Scope</span>
              <select
                className="border-default bg-surface rounded-control min-h-11 w-full border px-3"
                name="scope"
                defaultValue="SELECTED_ITEMS"
              >
                <option value="SELECTED_ITEMS">Selected items</option>
                <option value="CALENDAR">All Calendar content</option>
                <option value="PROJECT_PACKAGE">Project package</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Format</span>
              <select
                className="border-default bg-surface rounded-control min-h-11 w-full border px-3"
                name="format"
                defaultValue="MARKDOWN"
              >
                <option value="PLAIN_TEXT">Plain text (.txt)</option>
                <option value="MARKDOWN">Markdown (.md)</option>
                <option value="JSON">Structured JSON (.json)</option>
                <option value="CSV">Calendar CSV (.csv)</option>
              </select>
            </label>
          </div>
          <button className="bg-action-primary text-inverse rounded-control min-h-11 px-5 font-semibold">
            Create and download export
          </button>
          <p className="text-secondary text-sm">
            Exports expire after the plan retention window. CSV is available
            only for compatible Calendar content.
          </p>
        </form>
      ) : (
        <p className="border-default bg-surface-subtle rounded-control mt-8 border p-5">
          Generate or save content before creating an export.
        </p>
      )}
    </div>
  );
}
