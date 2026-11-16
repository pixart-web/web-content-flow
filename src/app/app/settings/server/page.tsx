import { PrivateServerConnect } from "@/features/desktop/private-server-connect";
import { requireUser } from "@/server/auth/require-user";

export default async function PrivateServerSettingsPage() {
  await requireUser("/app/settings/server");
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">Private server</h1>
      <p className="text-secondary mt-3">
        Work on projects stored on your team&apos;s own Web Content Flow server
        instead of this computer.
      </p>
      <PrivateServerConnect />
    </div>
  );
}
