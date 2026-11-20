import { WorkspacePackagePanel } from "@/features/settings/workspace-package-panel";
import { requireUser } from "@/server/auth/require-user";
import { getRolloutPolicy } from "@/server/launch/rollout";

export default async function WorkspaceSettingsPage() {
  await requireUser("/app/settings/workspace");
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">Workspace</h1>
      <p className="text-secondary mt-3">
        Move your projects to another computer, another operating system or a
        private server.
      </p>
      <WorkspacePackagePanel
        enabled={getRolloutPolicy().workspacePackageEnabled}
      />
    </div>
  );
}
