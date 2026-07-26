"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { retryProfileJobAction } from "./project-actions";

type Job = {
  id: string;
  status: string;
  mode: string;
  attempt: number;
  maxAttempts: number;
  safeErrorCode: string | null;
  steps: { key: string; label: string; status: string }[];
};

export function GenerationStatus({
  projectId,
  initialJob,
}: {
  projectId: string;
  initialJob: Job;
}) {
  const [job, setJob] = useState(initialJob);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const terminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(job.status);

  useEffect(() => {
    if (terminal) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(
        `/api/projects/${projectId}/generation-jobs/${job.id}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const next = (await response.json()) as Job;
      setJob(next);
      if (next.status === "COMPLETED") router.refresh();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [job.id, projectId, router, terminal]);

  return (
    <div className="mt-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-surface-selected rounded-pill px-3 py-1 text-xs font-semibold">
          Mock mode
        </span>
        <strong>{job.status.replaceAll("_", " ").toLowerCase()}</strong>
      </div>
      <ol className="mt-4 grid gap-2">
        {job.steps.map((step) => (
          <li className="text-secondary text-sm" key={step.key}>
            {step.status === "COMPLETED"
              ? "✓"
              : step.status === "FAILED"
                ? "×"
                : "•"}{" "}
            {step.label}
          </li>
        ))}
      </ol>
      {job.status === "FAILED" ? (
        <div className="mt-4">
          <p className="text-error text-sm">
            The Brand Profile could not be generated. Your brief was retained.
          </p>
          <button
            className="border-default rounded-control mt-3 min-h-11 border px-4 text-sm font-semibold"
            disabled={pending || job.attempt >= job.maxAttempts}
            onClick={() =>
              startTransition(async () => {
                const result = await retryProfileJobAction(projectId);
                if (result.ok) {
                  setJob((value) => ({ ...value, status: "QUEUED" }));
                }
              })
            }
            type="button"
          >
            {pending ? "Retrying…" : "Retry generation"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
