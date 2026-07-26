import { SettingsForm } from "@/features/settings/settings-form";
import { updateNameAction } from "@/features/settings/settings-actions";
import { requireUser } from "@/server/auth/require-user";

export default async function AccountSettingsPage() {
  const user = await requireUser("/app/settings/account");
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">Account</h1>
      <section className="border-default bg-surface rounded-panel mt-7 border p-6">
        <p className="text-secondary text-sm">Email</p>
        <p className="mt-1 font-medium">{user.email}</p>
        <SettingsForm
          action={updateNameAction}
          kind="name"
          defaultName={user.name ?? ""}
        />
      </section>
    </div>
  );
}
