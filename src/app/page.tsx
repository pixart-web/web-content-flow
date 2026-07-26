import {
  ArrowRight,
  CalendarDays,
  FileOutput,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { getRolloutPolicy } from "@/server/launch/rollout";

const modules = [
  "Website",
  "Social",
  "Ads & Creative",
  "Video & Reels",
  "General Copy",
  "Content Calendar",
] as const;

export default function LandingPage() {
  const rollout = getRolloutPolicy();
  const primary = rollout.registrationAvailable
    ? { href: "/sign-up", label: "Create account" }
    : rollout.requestAccess
      ? { href: "/contact", label: "Request access" }
      : { href: "/sign-in", label: "Sign in" };

  return (
    <main className="bg-canvas text-primary min-h-screen">
      {rollout.appEnvironment !== "production" ? (
        <div className="bg-surface-selected text-link px-4 py-2 text-center text-sm font-semibold">
          {rollout.appEnvironment.toUpperCase()} environment ·{" "}
          {rollout.state.replaceAll("_", " ")}
        </div>
      ) : null}
      <nav
        aria-label="Public navigation"
        className="border-default bg-surface/95 sticky top-0 z-10 border-b px-4 backdrop-blur sm:px-6"
      >
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4">
          <Link className="font-display font-semibold" href="/">
            Web Content Flow
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="text-secondary min-h-11 px-3 py-3 text-sm"
              href="/pricing"
            >
              Launch access
            </Link>
            <Link
              className="text-link min-h-11 px-3 py-3 text-sm font-semibold"
              href="/sign-in"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {rollout.maintenance ? (
        <section className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-4xl font-semibold">
            Scheduled maintenance
          </h1>
          <p className="text-secondary mt-4">
            Web Content Flow is temporarily unavailable while essential work is
            completed. Existing durable generation jobs remain stored.
          </p>
          <Link
            className="text-link mt-8 inline-block underline"
            href="/status"
          >
            View service status
          </Link>
        </section>
      ) : (
        <>
          <section className="px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
              <div>
                <p className="text-link text-sm font-semibold">
                  One connected content workflow
                </p>
                <h1 className="font-display mt-4 text-4xl leading-tight font-semibold sm:text-6xl">
                  Build your brand and content system from one Brief.
                </h1>
                <p className="text-secondary mt-6 max-w-2xl text-lg leading-8">
                  Create an editable Brand Profile, then use the same
                  positioning, audience and voice across every supported content
                  module.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    className="bg-action-primary text-inverse rounded-control inline-flex min-h-11 items-center gap-2 px-5 font-semibold"
                    href={primary.href}
                  >
                    {primary.label}{" "}
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <Link
                    className="border-default bg-surface rounded-control inline-flex min-h-11 items-center px-5 font-semibold"
                    href="/pricing"
                  >
                    View launch access
                  </Link>
                </div>
              </div>
              <div className="border-default bg-surface shadow-card rounded-panel border p-6">
                <p className="text-secondary text-sm font-semibold">
                  Connected project flow
                </p>
                <ol className="mt-5 space-y-3">
                  {[
                    "Brief confirmed",
                    "Brand Profile created",
                    "Selected modules generated",
                    "Content reviewed and versioned",
                    "Calendar planned and export ready",
                  ].map((label, index) => (
                    <li
                      className="border-default rounded-control flex items-center gap-3 border p-3"
                      key={label}
                    >
                      <span className="bg-action-primary text-inverse rounded-pill grid size-7 place-items-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      {label}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section className="bg-surface-subtle px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-display text-3xl font-semibold">
                One Brand Profile across every module
              </h2>
              <p className="text-secondary mt-3 max-w-2xl">
                Existing content stays unchanged when the Brand Profile changes.
                New generations record exactly which immutable profile version
                they used.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((module) => (
                  <li
                    className="border-default bg-surface rounded-card border p-5"
                    key={module}
                  >
                    <Layers3 aria-hidden className="text-link size-5" />
                    <h3 className="mt-3 font-semibold">{module}</h3>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="px-4 py-16 sm:px-6">
            <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
              <article className="border-default rounded-panel border p-6">
                <ShieldCheck className="text-link size-6" aria-hidden />
                <h2 className="font-display mt-4 text-xl font-semibold">
                  Editing with retained history
                </h2>
                <p className="text-secondary mt-2 text-sm leading-6">
                  Explicit saves and regeneration create immutable versions.
                  Previous content remains available for restoration.
                </p>
              </article>
              <article className="border-default rounded-panel border p-6">
                <CalendarDays className="text-link size-6" aria-hidden />
                <h2 className="font-display mt-4 text-xl font-semibold">
                  Editorial planning
                </h2>
                <p className="text-secondary mt-2 text-sm leading-6">
                  Calendar statuses are planning records only. The MVP does not
                  publish automatically to external platforms.
                </p>
              </article>
              <article className="border-default rounded-panel border p-6">
                <FileOutput className="text-link size-6" aria-hidden />
                <h2 className="font-display mt-4 text-xl font-semibold">
                  Validated exports
                </h2>
                <p className="text-secondary mt-2 text-sm leading-6">
                  Download current or selected saved versions as text, Markdown,
                  JSON or compatible Calendar CSV.
                </p>
              </article>
            </div>
          </section>

          <section className="bg-primary text-inverse px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="font-display text-3xl font-semibold">
                Generation remains under your control
              </h2>
              <p className="mt-4 leading-7 opacity-80">
                Real generation sends the necessary project context to the
                configured AI provider. Mock mode makes no provider request.
                Generated claims require human factual review.
              </p>
              <Link
                className="bg-surface text-primary rounded-control mt-8 inline-flex min-h-11 items-center px-5 font-semibold"
                href={primary.href}
              >
                {primary.label}
              </Link>
            </div>
          </section>
        </>
      )}

      <footer className="border-default bg-surface border-t px-4 py-10 text-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6">
          <p className="text-secondary">© 2026 Web Content Flow</p>
          <nav aria-label="Legal and support" className="flex flex-wrap gap-5">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
            <Link href="/help">Help</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
