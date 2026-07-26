import { changePasswordAction } from "@/features/settings/settings-actions";
import { SettingsForm } from "@/features/settings/settings-form";

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">Security</h1>
      <section className="border-default bg-surface rounded-panel mt-7 border p-6">
        <h2 className="font-display text-xl font-semibold">Change password</h2>
        <p className="text-secondary mt-2 text-sm">
          Changing your password invalidates every active session, including
          this one.
        </p>
        <SettingsForm action={changePasswordAction} kind="password" />
      </section>
    </div>
  );
}
