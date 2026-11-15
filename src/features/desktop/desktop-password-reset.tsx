"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import type {
  DesktopPasswordResetResult,
  WcfDesktopApi,
} from "@/desktop/shell/desktop-api";

// L4c: owner password reset in the desktop edition. The desktop app asks
// macOS to confirm it is you (Touch ID or your Mac password) before changing
// anything; no email is involved.

const messages: Record<
  Exclude<DesktopPasswordResetResult, { ok: true }>["reason"],
  string
> = {
  invalid_password: "Use between 12 and 128 characters.",
  denied: "macOS did not confirm your identity. Nothing was changed.",
  unavailable:
    "This Mac cannot confirm your identity (Touch ID or account password).",
  no_owner: "This computer has no owner profile yet.",
  failed: "The password could not be changed. Please try again.",
};

export function DesktopPasswordReset() {
  const api = useSyncExternalStore<WcfDesktopApi | null | undefined>(
    () => () => {},
    () =>
      (window as Window & { wcfDesktop?: WcfDesktopApi }).wcfDesktop ?? null,
    () => undefined,
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (api === undefined) return null;
  if (api === null)
    return (
      <p className="text-secondary mt-3 text-sm">
        The desktop edition does not send email. Open Web Content Flow on this
        computer to reset the password.
      </p>
    );
  if (done)
    return (
      <div className="mt-4 space-y-4" role="status">
        <p className="text-sm">Password changed. Sign in with the new one.</p>
        <Link
          className="text-link text-sm font-semibold underline"
          href="/sign-in"
        >
          Sign in
        </Link>
      </div>
    );

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (password !== confirmation) {
          setMessage("The two passwords do not match.");
          return;
        }
        setBusy(true);
        setMessage(null);
        void api
          .resetOwnerPassword(password)
          .then((result) => {
            if (result.ok) setDone(true);
            else setMessage(messages[result.reason]);
          })
          .catch(() => setMessage(messages.failed))
          .finally(() => setBusy(false));
      }}
    >
      <p className="text-secondary text-sm">
        macOS will ask you to confirm it is you with Touch ID or your Mac
        password.
      </p>
      <label className="block text-sm font-semibold">
        New password
        <input
          className="border-default rounded-control mt-1 block min-h-11 w-full border px-3"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Confirm new password
        <input
          className="border-default rounded-control mt-1 block min-h-11 w-full border px-3"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <button
        className="rounded-control min-h-11 w-full bg-[var(--color-action-primary,#4f46e5)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        {busy ? "Waiting for macOS…" : "Change password"}
      </button>
      {message ? (
        <p className="text-sm" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
