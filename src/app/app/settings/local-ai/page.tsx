import { LocalAiSetup } from "@/features/desktop/local-ai-setup";
import { requireUser } from "@/server/auth/require-user";

export default async function LocalAiSettingsPage() {
  await requireUser("/app/settings/local-ai");
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">Local AI</h1>
      <p className="text-secondary mt-3">
        Generate content with a model that runs on this computer. Project
        content never leaves it, and no account or API key is needed.
      </p>
      <LocalAiSetup />
    </div>
  );
}
