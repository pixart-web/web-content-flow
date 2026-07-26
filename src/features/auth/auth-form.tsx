"use client";

import { useActionState } from "react";

import type { AuthFormState } from "./auth-actions";

type AuthFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  mode: "sign-in" | "sign-up";
  returnTo?: string | undefined;
};

const initialState: AuthFormState = {};

function FieldError({ errors }: { errors?: string[] | undefined }) {
  if (!errors?.length) return null;
  return (
    <p className="text-error text-sm" role="alert">
      {errors[0]}
    </p>
  );
}

export function AuthForm({ action, mode, returnTo }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignUp = mode === "sign-up";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {returnTo ? (
        <input type="hidden" name="returnTo" value={returnTo} />
      ) : null}

      {isSignUp ? (
        <div className="space-y-2">
          <label className="text-primary text-sm font-semibold" htmlFor="name">
            Display name
          </label>
          <input
            autoComplete="name"
            className="border-default bg-surface text-primary focus:border-focus rounded-control min-h-11 w-full border px-3"
            id="name"
            name="name"
            required
          />
          <FieldError errors={state.fieldErrors?.name} />
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-primary text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="border-default bg-surface text-primary focus:border-focus rounded-control min-h-11 w-full border px-3"
          id="email"
          name="email"
          required
          type="email"
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div className="space-y-2">
        <label
          className="text-primary text-sm font-semibold"
          htmlFor="password"
        >
          Password
        </label>
        <input
          aria-describedby={isSignUp ? "password-help" : undefined}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="border-default bg-surface text-primary focus:border-focus rounded-control min-h-11 w-full border px-3"
          id="password"
          name="password"
          required
          type="password"
        />
        {isSignUp ? (
          <p className="text-secondary text-sm" id="password-help">
            Use at least 12 characters.
          </p>
        ) : null}
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      {state.message ? (
        <p
          className="border-error bg-error-subtle text-error rounded-control border p-3 text-sm"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="bg-action-primary text-inverse hover:bg-action-primary-hover rounded-control min-h-11 w-full px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending
          ? isSignUp
            ? "Creating account…"
            : "Signing in…"
          : isSignUp
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
  );
}
