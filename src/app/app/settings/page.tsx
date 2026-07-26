import { signOutAction } from "@/features/auth/auth-actions";
import { requireUser } from "@/server/auth/require-user";
import { getGenerationAvailability } from "@/server/ai/provider-registry";
import { listOwnedUsage } from "@/server/ai/usage-service";
import { getPrisma } from "@/server/db/prisma";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await requireUser("/app/settings");
  const availability = getGenerationAvailability();
  const usage = await listOwnedUsage(getPrisma(), user.id);
  const totalTokens = usage.reduce(
    (total, record) => total + (record.totalTokens ?? 0),
    0,
  );
  return (
    <div className="max-w-2xl">
      <header>
        <p className="text-secondary text-sm">Account</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Settings</h1>
      </header>
      <nav
        className="mt-6 grid gap-3 sm:grid-cols-2"
        aria-label="Settings sections"
      >
        {[
          ["Account", "/app/settings/account"],
          ["Security", "/app/settings/security"],
          ["Usage", "/app/settings/usage"],
          ["Privacy", "/app/settings/privacy"],
        ].map(([label, href]) => (
          <Link
            className="border-default bg-surface hover:bg-surface-subtle rounded-control min-h-11 border p-3 font-semibold"
            href={href!}
            key={href}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="border-default bg-surface rounded-panel mt-8 border p-6">
        <h2 className="font-display text-xl font-semibold">Account identity</h2>
        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-secondary text-sm">Display name</dt>
            <dd className="mt-1 font-medium">{user.name ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-secondary text-sm">Email</dt>
            <dd className="mt-1 font-medium">{user.email}</dd>
          </div>
        </dl>
        <form
          action={signOutAction}
          className="border-default mt-6 border-t pt-6"
        >
          <button className="border-strong bg-surface hover:bg-surface-subtle rounded-control min-h-11 border px-4 text-sm font-semibold">
            Sign out
          </button>
        </form>
      </section>
      <section className="border-default bg-surface rounded-panel mt-6 border p-6">
        <h2 className="font-display text-xl font-semibold">Generation</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-secondary text-sm">Current mode</dt>
            <dd className="mt-1 font-medium">
              {availability.defaultMode === "REAL"
                ? "Real AI"
                : "Mock generation"}
            </dd>
          </div>
          <div>
            <dt className="text-secondary text-sm">Provider status</dt>
            <dd className="mt-1 font-medium">
              {availability.realAvailable
                ? "OpenAI configured"
                : "Real generation unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-secondary text-sm">Recorded real usage</dt>
            <dd className="mt-1 font-medium">
              {totalTokens.toLocaleString()} tokens
            </dd>
          </div>
        </dl>
        <p className="border-default bg-surface-subtle rounded-control mt-5 border p-4 text-sm">
          Real generation sends the necessary Brief, Brand Profile, current
          item, and selected source-content context to the configured AI
          provider. Mock generation sends no project content to an external AI
          provider. Provider retention depends on the configured provider
          contract.
        </p>
        <p className="text-secondary mt-3 text-xs">
          Provider credentials, model identifiers, prompts, retry settings, and
          internal pricing are managed securely by the deployment environment.
        </p>
      </section>
    </div>
  );
}
