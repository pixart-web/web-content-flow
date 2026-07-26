"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { retryCopyAssetAction } from "./copy-actions";

export function CopyFailedAssets({
  projectId,
  assets,
}: {
  projectId: string;
  assets: { jobId: string; label: string }[];
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!assets.length) return null;
  return (
    <section className="border-error bg-surface rounded-card border p-5">
      <h2 className="font-display text-lg font-semibold">
        Copy needing attention
      </h2>
      <p className="text-secondary mt-2 text-sm">
        Completed assets are available. A failed asset did not replace any
        current content.
      </p>
      <ul className="mt-3 space-y-2">
        {assets.map((asset) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3"
            key={asset.jobId}
          >
            <span>{asset.label}</span>
            <button
              className="border-default rounded-control min-h-11 border px-3 text-sm font-semibold"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await retryCopyAssetAction(
                    projectId,
                    asset.jobId,
                  );
                  setMessage(
                    result.ok
                      ? "Retry queued. Completed assets are unchanged."
                      : result.error.message,
                  );
                  if (result.ok) router.refresh();
                })
              }
              type="button"
            >
              Retry asset
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
