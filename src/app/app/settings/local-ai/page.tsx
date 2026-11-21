import Link from "next/link";

import { LocalAiSetup } from "@/features/desktop/local-ai-setup";
import { requireUser } from "@/server/auth/require-user";

export default async function LocalAiSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("/app/settings/local-ai");
  // LF-20: reached from the first-run setup; offer the way back to it.
  const fromOnboarding = (await searchParams).from === "onboarding";
  return (
    <div className="max-w-3xl">
      {fromOnboarding ? (
        <Link
          className="text-link inline-block min-h-11 text-sm font-semibold underline"
          href="/app/onboarding"
        >
          ← Back to first project setup
        </Link>
      ) : null}
      <h1 className="font-display text-3xl font-semibold">Local AI</h1>
      <p className="text-secondary mt-3">
        Generate content with a model that runs on this computer. Project
        content never leaves it, and no account or API key is needed.
      </p>
      <LocalAiSetup />
    </div>
  );
}
