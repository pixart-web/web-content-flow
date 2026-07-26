import Link from "next/link";

import { getServerEnv } from "@/lib/env/server";

export default function PrivacySettingsPage() {
  const env = getServerEnv();
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">Privacy</h1>
      <section className="border-default bg-surface rounded-panel mt-7 border p-6">
        <p>
          Real generation sends the necessary Brief, Brand Profile and selected
          content context to the configured provider. Mock generation sends no
          content to an external AI provider.
        </p>
        <p className="text-secondary mt-4 text-sm">
          Self-service account deletion is{" "}
          {env.ACCOUNT_DELETION_ENABLED ? "enabled" : "not enabled"} for this
          launch. Contact support for a reviewed request.
        </p>
        <Link className="text-link mt-5 inline-block underline" href="/privacy">
          Read the draft privacy notice
        </Link>
      </section>
    </div>
  );
}
