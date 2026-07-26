"use client";

import { useActionState } from "react";

import type { RecoveryState } from "./password-recovery-actions";

export function PasswordRecoveryForm({
  action,
  mode,
  token,
}: {
  action: (state: RecoveryState, formData: FormData) => Promise<RecoveryState>;
  mode: "request" | "reset";
  token?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5" noValidate>
      {mode === "request" ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Email</span>
          <input
            className="border-default bg-surface rounded-control min-h-11 w-full border px-3"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          {state.fieldErrors?.email?.[0] ? (
            <span className="text-error text-sm" role="alert">
              {state.fieldErrors.email[0]}
            </span>
          ) : null}
        </label>
      ) : (
        <>
          <input name="token" type="hidden" value={token ?? ""} />
          <label className="block space-y-2">
            <span className="text-sm font-semibold">New password</span>
            <input
              className="border-default bg-surface rounded-control min-h-11 w-full border px-3"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            <span className="text-secondary text-sm">
              Use at least 12 characters.
            </span>
            {state.fieldErrors?.password?.[0] ? (
              <span className="text-error text-sm" role="alert">
                {state.fieldErrors.password[0]}
              </span>
            ) : null}
          </label>
        </>
      )}
      {state.message ? (
        <p
          className="border-default bg-surface-subtle rounded-control border p-3 text-sm"
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="bg-action-primary text-inverse rounded-control min-h-11 w-full px-4 font-semibold disabled:opacity-60"
        disabled={pending || state.success}
      >
        {pending
          ? "Submitting…"
          : mode === "request"
            ? "Send reset instructions"
            : "Reset password"}
      </button>
    </form>
  );
}
