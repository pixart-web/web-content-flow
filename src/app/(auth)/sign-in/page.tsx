import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";
import { signInAction } from "@/features/auth/auth-actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; signedOut?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Sign in</h1>
        <p className="text-secondary text-sm">
          Continue to your Web Content Flow workspace.
        </p>
      </header>
      {params.signedOut ? (
        <p
          className="border-default bg-surface-subtle rounded-control mt-5 border p-3 text-sm"
          role="status"
        >
          You have signed out.
        </p>
      ) : null}
      <div className="mt-6">
        <AuthForm
          action={signInAction}
          mode="sign-in"
          returnTo={params.returnTo}
        />
      </div>
      <div className="text-secondary mt-6 space-y-3 text-sm">
        <p>
          Password recovery is not available until secure email delivery is
          configured.
        </p>
        <p>
          New to Web Content Flow?{" "}
          <Link className="text-link font-semibold underline" href="/sign-up">
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
