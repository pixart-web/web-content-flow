import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const semanticTokens = [
  { label: "Canvas", className: "bg-canvas border-default" },
  { label: "Surface", className: "bg-surface border-strong" },
  { label: "Subtle", className: "bg-surface-subtle border-default" },
] as const;

export default function FoundationPage() {
  return (
    <main className="bg-canvas text-primary min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="space-y-3">
          <p className="font-interface text-link text-sm font-semibold">
            Phase 0
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Web Content Flow
          </h1>
          <div className="text-secondary flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-5" />
            <p>Repository foundation ready</p>
          </div>
          <nav
            aria-label="Account access"
            className="flex flex-wrap gap-3 pt-2"
          >
            <Link
              className="bg-action-primary text-inverse hover:bg-action-primary-hover rounded-control inline-flex min-h-11 items-center px-4 text-sm font-semibold"
              href="/sign-in"
            >
              Sign in
            </Link>
            <Link
              className="border-default bg-surface text-primary hover:bg-surface-subtle rounded-control inline-flex min-h-11 items-center border px-4 text-sm font-semibold"
              href="/sign-up"
            >
              Create account
            </Link>
          </nav>
        </header>

        <section
          aria-labelledby="token-validation-heading"
          className="rounded-panel border-default bg-surface shadow-card border p-6"
        >
          <div className="space-y-2">
            <h2
              id="token-validation-heading"
              className="font-display text-xl font-semibold"
            >
              Semantic token validation
            </h2>
            <p className="text-secondary max-w-prose text-sm leading-6">
              These foundation surfaces are rendered from the canonical design
              token variables.
            </p>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {semanticTokens.map((token) => (
              <li
                key={token.label}
                className={`rounded-card border p-4 text-sm font-medium ${token.className}`}
              >
                {token.label}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-pill bg-action-primary text-inverse px-4 py-2 text-sm font-semibold">
              Primary action token
            </span>
            <span className="text-link text-sm underline underline-offset-4">
              Link token
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
