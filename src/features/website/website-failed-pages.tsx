"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { retryWebsitePageAction } from "./website-actions";

export function WebsiteFailedPages({
  projectId,
  pages,
}: {
  projectId: string;
  pages: readonly {
    jobId: string;
    pageName: string;
    errorCode: string | null;
  }[];
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!pages.length) return null;
  return (
    <section className="border-error bg-surface rounded-card border p-5">
      <h2 className="font-display text-lg font-semibold">Pages to retry</h2>
      <p className="text-secondary mt-2 text-sm">
        Some website pages are ready. One or more pages could not be generated.
      </p>
      <ul className="mt-4 space-y-3">
        {pages.map((page) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3"
            key={page.jobId}
          >
            <span className="text-sm">
              {page.pageName} could not be generated. Existing website content
              is unchanged.
            </span>
            <button
              className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await retryWebsitePageAction(
                    projectId,
                    page.jobId,
                  );
                  setMessage(
                    result.ok
                      ? `${page.pageName} retry queued.`
                      : result.error.message,
                  );
                  if (result.ok) router.refresh();
                })
              }
              type="button"
            >
              Retry {page.pageName}
            </button>
          </li>
        ))}
      </ul>
      {message ? (
        <p className="mt-3 text-sm" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
