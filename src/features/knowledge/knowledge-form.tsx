"use client";

import { useActionState, useState } from "react";

import type { KnowledgeFormState } from "./knowledge-actions";

export function KnowledgeForm({
  action,
}: {
  action: (
    state: KnowledgeFormState,
    formData: FormData,
  ) => Promise<KnowledgeFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState("text/plain");
  return (
    <form
      action={formAction}
      className="border-default bg-surface rounded-panel mt-6 space-y-4 border p-6"
    >
      <h2 className="font-display text-xl font-semibold">Add a document</h2>
      <label className="block text-sm font-semibold">
        Text or Markdown file
        <input
          className="mt-1 block text-sm"
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setContent(await file.text());
            setTitle(
              (current) => current || file.name.replace(/\.(txt|md)$/i, ""),
            );
            setMediaType(
              file.name.toLowerCase().endsWith(".md")
                ? "text/markdown"
                : "text/plain",
            );
          }}
        />
      </label>
      <label className="block text-sm font-semibold">
        Title
        <input
          className="border-default rounded-control mt-1 block min-h-11 w-full border px-3"
          name="title"
          required
          maxLength={160}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Content
        <textarea
          className="border-default rounded-control mt-1 block min-h-40 w-full border p-3 font-normal"
          name="content"
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <input type="hidden" name="mediaType" value={mediaType} />
      <button
        className="rounded-control min-h-11 bg-[var(--color-action-primary,#4f46e5)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Adding…" : "Add document"}
      </button>
      {state.message ? (
        <p className="text-sm" role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
