import Link from "next/link";

import { getServerEnv } from "@/lib/env/server";
import { forgotPasswordAction } from "@/features/auth/password-recovery-actions";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";

export default function ForgotPasswordPage() {
  if (getServerEnv().APP_MODE === "local")
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">Reset password</h1>
        <p className="text-secondary mt-3 text-sm">
          The desktop edition does not send email. Password recovery for this
          installation is done from the desktop app itself.
        </p>
        <Link
          className="text-link mt-6 inline-block text-sm underline"
          href="/sign-in"
        >
          Return to sign in
        </Link>
      </>
    );
  return (
    <>
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Reset password</h1>
        <p className="text-secondary text-sm">
          Enter your account email. The confirmation is the same whether or not
          an account exists.
        </p>
      </header>
      <div className="mt-6">
        <PasswordRecoveryForm action={forgotPasswordAction} mode="request" />
      </div>
      <Link
        className="text-link mt-6 inline-block text-sm underline"
        href="/sign-in"
      >
        Return to sign in
      </Link>
    </>
  );
}
