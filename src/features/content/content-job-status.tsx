"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  status: string;
  mode: string;
  attempt: number;
  maxAttempts: number;
  safeErrorCode: string | null;
  steps: { key: string; label: string; status: string }[];
};

export function ContentJobStatus({
  projectId,
  initialJob,
}: {
  projectId: string;
  initialJob: Job;
}) {
  const [job, setJob] = useState(initialJob);
  const router = useRouter();
  const terminal = ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes(
    job.status,
  );
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
      if (["COMPLETED", "PARTIAL", "FAILED"].includes(next.status))
        router.refresh();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [job.id, projectId, router, terminal]);
  return (
    <div
      className="border-default bg-surface-subtle rounded-card border p-4"
      aria-live="polite"
    >
      <p className="font-semibold">
        Mock content job · {job.status.replaceAll("_", " ").toLowerCase()}
      </p>
      {job.status === "FAILED" ? (
        <p className="text-error mt-2 text-sm">
          This version wasn’t created. Your current content is unchanged.
        </p>
      ) : job.status === "PARTIAL" ? (
        <p className="text-warning mt-2 text-sm">
          Some content is ready. One or more items could not be generated.
        </p>
      ) : (
        <p className="text-secondary mt-2 text-sm">
          {job.steps.find((step) => step.status === "RUNNING")?.label ??
            "Generation state is saved and you may continue navigating."}
        </p>
      )}
    </div>
  );
}
