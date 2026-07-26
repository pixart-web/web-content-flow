import Link from "next/link";

import { resetPasswordAction } from "@/features/auth/password-recovery-actions";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">
          Choose a new password
        </h1>
        <p className="text-secondary text-sm">
          Reset links are one-time and expire after 30 minutes.
        </p>
      </header>
      <div className="mt-6">
        <PasswordRecoveryForm
          action={resetPasswordAction}
          mode="reset"
          {...(token ? { token } : {})}
        />
      </div>
      <Link
        className="text-link mt-6 inline-block text-sm underline"
        href="/forgot-password"
      >
        Request another link
      </Link>
    </>
  );
}
