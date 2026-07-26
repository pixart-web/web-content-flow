"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { retrySocialItemAction } from "./social-actions";

export function SocialFailedItems({
  projectId,
  items,
}: {
  projectId: string;
  items: readonly { jobId: string; label: string }[];
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!items.length) return null;
  return (
    <section className="border-error bg-surface rounded-card border p-5">
      <h2 className="font-display text-lg font-semibold">Items to retry</h2>
      <p className="text-secondary mt-2 text-sm">
        Some Social content is ready. One or more items could not be generated.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3"
            key={item.jobId}
          >
            <span className="text-sm">
              {item.label} could not be generated. Other completed content is
              unchanged.
            </span>
            <button
              className="border-default rounded-control min-h-11 border px-4 text-sm font-semibold"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await retrySocialItemAction(
                    projectId,
                    item.jobId,
                  );
                  setMessage(
                    result.ok
                      ? `${item.label} retry queued.`
                      : result.error.message,
                  );
                  if (result.ok) router.refresh();
                })
              }
              type="button"
            >
              Retry {item.label}
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
