"use client";

import { useRef, useState } from "react";

// Workspace package (doc 52, LF-12): download every project as one file, or
// import a file made on another computer or server as new projects.

type Summary = {
  projects: number;
  contentItems: number;
  contentVersions: number;
  brandProfileVersions: number;
  knowledgeDocuments: number;
  jobs: number;
};

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function WorkspacePackagePanel({ enabled }: { enabled: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  if (!enabled)
    return (
      <p className="text-secondary mt-6">
        Workspace export and import are not enabled on this installation.
      </p>
    );

  async function download() {
    setBusy("export");
    setMessage(null);
    try {
      const response = await fetch("/api/workspace/package", {
        method: "POST",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage({
          tone: "error",
          text: body?.error ?? "The workspace could not be exported.",
        });
        return;
      }
      const filename =
        /filename="([^"]+)"/.exec(
          response.headers.get("content-disposition") ?? "",
        )?.[1] ?? "web-content-flow-workspace.json.gz";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ tone: "success", text: `Saved ${filename}.` });
    } catch {
      setMessage({
        tone: "error",
        text: "The workspace could not be exported.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("import");
    setMessage(null);
    try {
      const response = await fetch("/api/workspace/package/import", {
        method: "POST",
        headers: { "Content-Type": "application/gzip" },
        body: file,
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        summary?: Summary;
      } | null;
      if (!response.ok || !body?.summary) {
        setMessage({
          tone: "error",
          text: body?.error ?? "The package could not be imported.",
        });
        return;
      }
      const s = body.summary;
      setMessage({
        tone: "success",
        text: `Imported ${plural(s.projects, "project", "projects")} with ${plural(s.contentItems, "content item", "content items")}, ${plural(s.contentVersions, "version", "versions")} and ${plural(s.knowledgeDocuments, "knowledge document", "knowledge documents")}.`,
      });
    } catch {
      setMessage({ tone: "error", text: "The package could not be imported." });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">Export</h2>
        <p className="text-secondary mt-2 text-sm">
          One file with every project: Brief, Brand Profile and content with all
          their versions, generation history and client knowledge. Your
          password, sessions and settings are not included.
        </p>
        <button
          className="border-strong bg-surface hover:bg-surface-subtle rounded-control mt-4 min-h-11 border px-4 text-sm font-semibold disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => void download()}
          type="button"
        >
          {busy === "export" ? "Preparing…" : "Download workspace package"}
        </button>
      </section>
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">Import</h2>
        <p className="text-secondary mt-2 text-sm">
          Adds the projects in a package as new projects. Nothing already here
          is changed or replaced. If the file is damaged, nothing is imported.
        </p>
        <label className="mt-4 block text-sm font-semibold">
          Workspace package (.json.gz)
          <input
            accept=".gz,application/gzip"
            className="mt-2 block text-sm"
            disabled={busy !== null}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
            ref={fileInput}
            type="file"
          />
        </label>
        {busy === "import" ? (
          <p className="text-secondary mt-3 text-sm">Importing…</p>
        ) : null}
      </section>
      {message ? (
        <p
          className={
            message.tone === "error"
              ? "text-error text-sm font-medium"
              : "text-sm font-medium"
          }
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
