import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-canvas text-primary flex min-h-screen items-center justify-center px-4 py-12">
      <section
        aria-labelledby="not-found-heading"
        className="rounded-panel border-default bg-surface shadow-card w-full max-w-lg border p-6"
      >
        <h1
          id="not-found-heading"
          className="font-display text-2xl font-semibold"
        >
          This page is not available
        </h1>
        <p className="text-secondary mt-3">
          Check the address or return to the repository foundation page.
        </p>
        <Link
          href="/"
          className="rounded-control bg-action-primary text-inverse hover:bg-action-primary-hover mt-6 inline-flex min-h-11 items-center px-4 py-2 font-semibold"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
