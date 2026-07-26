"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="bg-canvas text-primary flex min-h-screen items-center justify-center px-4 py-12">
      <section
        aria-labelledby="error-heading"
        className="rounded-panel border-default bg-surface shadow-card w-full max-w-lg border p-6"
      >
        <h1 id="error-heading" className="font-display text-2xl font-semibold">
          This page could not be loaded
        </h1>
        <p className="text-secondary mt-3">
          Your work has not been changed. Try loading the page again or return
          to the foundation page.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-control bg-action-primary text-inverse hover:bg-action-primary-hover min-h-11 px-4 py-2 font-semibold"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-control border-strong bg-surface text-primary inline-flex min-h-11 items-center border px-4 py-2 font-semibold"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
