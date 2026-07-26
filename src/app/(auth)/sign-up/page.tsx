import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";
import { signUpAction } from "@/features/auth/auth-actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">
          Create your account
        </h1>
        <p className="text-secondary text-sm">
          Start with a private workspace for your projects.
        </p>
      </header>
      <div className="mt-6">
        <AuthForm
          action={signUpAction}
          mode="sign-up"
          returnTo={params.returnTo}
        />
      </div>
      <p className="text-secondary mt-6 text-sm">
        Already have an account?{" "}
        <Link className="text-link font-semibold underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </>
  );
}
