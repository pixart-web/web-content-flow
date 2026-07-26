"use client";

import { useActionState } from "react";

import type { SettingsState } from "./settings-actions";

export function SettingsForm({
  action,
  kind,
  defaultName,
}: {
  action: (state: SettingsState, data: FormData) => Promise<SettingsState>;
  kind: "name" | "password";
  defaultName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-5 space-y-4">
      {kind === "name" ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Display name</span>
          <input
            className="border-default bg-surface rounded-control min-h-11 w-full border px-3"
            defaultValue={defaultName}
            name="name"
            required
          />
        </label>
      ) : (
        <>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Current password</span>
            <input
              autoComplete="current-password"
              className="border-default bg-surface rounded-control min-h-11 w-full border px-3"
              name="currentPassword"
              type="password"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">New password</span>
            <input
              autoComplete="new-password"
              className="border-default bg-surface rounded-control min-h-11 w-full border px-3"
              name="newPassword"
              type="password"
              required
            />
            <span className="text-secondary text-sm">
              Use at least 12 characters.
            </span>
          </label>
        </>
      )}
      {state.message ? (
        <p role={state.success ? "status" : "alert"} className="text-sm">
          {state.message}
        </p>
      ) : null}
      <button
        className="bg-action-primary text-inverse rounded-control min-h-11 px-4 font-semibold disabled:opacity-60"
        disabled={pending}
      >
        {pending
          ? "Saving…"
          : kind === "name"
            ? "Save name"
            : "Change password"}
      </button>
    </form>
  );
}
