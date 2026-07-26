import Link from "next/link";

import { forgotPasswordAction } from "@/features/auth/password-recovery-actions";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";

export default function ForgotPasswordPage() {
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
