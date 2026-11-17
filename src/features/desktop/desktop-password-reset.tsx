"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import type {
  DesktopPasswordResetResult,
  DesktopPlatform,
  WcfDesktopApi,
} from "@/desktop/shell/desktop-api";

// L4c / L8: owner password reset in the desktop edition. The desktop app asks
// the operating system to confirm it is you (macOS: Touch ID or your Mac
// password; Windows: Windows Hello; Linux: your account password via polkit)
// before changing anything; no email is involved.

type Reason = Exclude<DesktopPasswordResetResult, { ok: true }>["reason"];

const systems: Record<
  DesktopPlatform,
  { name: string; prompt: string; unavailable: string }
> = {
  darwin: {
    name: "macOS",
    prompt:
      "macOS will ask you to confirm it is you with Touch ID or your Mac password.",
    unavailable:
      "This Mac cannot confirm your identity (Touch ID or account password).",
  },
  win32: {
    name: "Windows",
    prompt:
      "Windows Hello will ask you to confirm it is you (PIN, face or fingerprint).",
    unavailable:
      "Windows Hello is not set up for this account. Set up a PIN in Settings › Accounts › Sign-in options, then try again.",
  },
  linux: {
    name: "the system",
    prompt:
      "The system will ask for your account password to confirm it is you.",
    unavailable:
      "This computer cannot confirm your identity: password reset needs the .deb installation (it registers the polkit rule) and a desktop session with a polkit agent.",
  },
  other: {
    name: "the system",
    prompt: "The system will ask you to confirm it is you.",
    unavailable: "This computer cannot confirm your identity.",
  },
};

function messageFor(reason: Reason, platform: DesktopPlatform) {
  const system = systems[platform];
  const messages: Record<Reason, string> = {
    invalid_password: "Use between 12 and 128 characters.",
    denied: `${system.name === "the system" ? "The system" : system.name} did not confirm your identity. Nothing was changed.`,
    unavailable: system.unavailable,
    no_owner: "This computer has no owner profile yet.",
    failed: "The password could not be changed. Please try again.",
  };
  return messages[reason];
}

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
  const platform = api.platform ?? "other";
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
            else setMessage(messageFor(result.reason, platform));
          })
          .catch(() => setMessage(messageFor("failed", platform)))
          .finally(() => setBusy(false));
      }}
    >
      <p className="text-secondary text-sm">{systems[platform].prompt}</p>
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
        {busy ? `Waiting for ${systems[platform].name}…` : "Change password"}
      </button>
      {message ? (
        <p className="text-sm" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
