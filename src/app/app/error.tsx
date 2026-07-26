"use client";

import Link from "next/link";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <section className="border-default bg-surface rounded-panel border p-6">
      <h1 className="font-display text-2xl font-semibold">
        This workspace could not be loaded
      </h1>
      <p className="text-secondary mt-2">
        Your account data was not changed. Retry or return to the dashboard.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
          onClick={reset}
        >
          Retry
        </button>
        <Link
          className="border-default bg-surface rounded-control min-h-11 border px-4 py-3 text-sm font-semibold"
          href="/app"
        >
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}
