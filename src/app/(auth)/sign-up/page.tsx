import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";
import { signUpAction } from "@/features/auth/auth-actions";
import { getServerEnv } from "@/lib/env/server";
import { localOwnerExists } from "@/server/auth/local-owner";
import { getPrisma } from "@/server/db/prisma";
import { getRolloutPolicy } from "@/server/launch/rollout";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const localMode = getServerEnv().APP_MODE === "local";
  if (localMode && (await localOwnerExists(getPrisma())))
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">
          This computer already has an owner profile
        </h1>
        <p className="text-secondary mt-3 text-sm">
          The desktop edition keeps one profile per installation.
        </p>
        <Link className="text-link mt-6 inline-block underline" href="/sign-in">
          Sign in
        </Link>
      </>
    );
  const rollout = getRolloutPolicy();
  if (!localMode && !rollout.registrationAvailable)
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">
          Account creation is currently limited
        </h1>
        <p className="text-secondary mt-3 text-sm">
          Web Content Flow is in {rollout.state.toLowerCase()} launch mode.
          Existing users can still sign in.
        </p>
        <Link className="text-link mt-6 inline-block underline" href="/sign-in">
          Sign in
        </Link>
      </>
    );
  return (
    <>
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">
          {localMode ? "Set up this computer" : "Create your account"}
        </h1>
        <p className="text-secondary text-sm">
          {localMode
            ? "Create the owner profile for this installation. Your projects stay on this computer."
            : "Start with a private workspace for your projects."}
        </p>
      </header>
      <div className="mt-6">
        <AuthForm
          action={signUpAction}
          mode="sign-up"
          returnTo={params.returnTo}
        />
      </div>
      {localMode ? null : (
        <p className="text-secondary mt-6 text-sm">
          Already have an account?{" "}
          <Link className="text-link font-semibold underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      )}
    </>
  );
}
