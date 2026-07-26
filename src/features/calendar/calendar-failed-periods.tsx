"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { retryCalendarScopeAction } from "./calendar-actions";

export function CalendarFailedPeriods({
  projectId,
  periods,
}: {
  projectId: string;
  periods: { jobId: string; label: string }[];
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!periods.length) return null;
  return (
    <section className="border-error bg-surface rounded-card border p-5">
      <h2 className="font-display text-lg font-semibold">
        Periods needing attention
      </h2>
      <p className="text-secondary mt-2 text-sm">
        Part of the editorial plan is ready. Successful periods are unchanged.
      </p>
      <ul className="mt-3 space-y-2">
        {periods.map((period) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3"
            key={period.jobId}
          >
            <span>{period.label}</span>
            <button
              className="border-default rounded-control min-h-11 border px-3 text-sm font-semibold"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await retryCalendarScopeAction(
                    projectId,
                    period.jobId,
                  );
                  setMessage(
                    result.ok
                      ? "Period retry queued. Completed entries are unchanged."
                      : result.error.message,
                  );
                  if (result.ok) router.refresh();
                })
              }
              type="button"
            >
              Retry period
            </button>
          </li>
        ))}
      </ul>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
