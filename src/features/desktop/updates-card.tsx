"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type {
  DesktopUpdateCheck,
  WcfDesktopApi,
} from "@/desktop/shell/desktop-api";
import { updateMessage } from "@/desktop/shell/updates";

// LF-20 update notice: the check runs only when the person presses the button.
// Installing stays manual (unsigned builds cannot update themselves safely).

export function UpdatesCard() {
  const api = useSyncExternalStore<WcfDesktopApi | null | undefined>(
    () => () => {},
    () =>
      (window as Window & { wcfDesktop?: WcfDesktopApi }).wcfDesktop ?? null,
    () => undefined,
  );
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DesktopUpdateCheck | null>(null);

  useEffect(() => {
    if (!api?.appVersion) return;
    void api.appVersion().then(setVersion, () => setVersion(null));
  }, [api]);

  // Outside the desktop app (or an older shell without the call) there is
  // nothing to check.
  if (!api?.checkForUpdates) return null;
  return (
    <section
      aria-labelledby="updates-heading"
      className="border-default bg-surface rounded-panel mt-6 border p-6"
    >
      <h2 className="font-display text-xl font-semibold" id="updates-heading">
        Updates
      </h2>
      <p className="text-secondary mt-2 text-sm">
        {version ? `Version ${version}. ` : ""}The app only contacts GitHub when
        you check, and it never installs anything by itself.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="border-strong bg-surface hover:bg-surface-subtle rounded-control min-h-11 border px-4 text-sm font-semibold disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void api
              .checkForUpdates()
              .then(setResult)
              .catch(() =>
                setResult({
                  state: "unavailable",
                  current: version ?? "",
                  reason: "failed",
                }),
              )
              .finally(() => setBusy(false));
          }}
          type="button"
        >
          {busy ? "Checking…" : "Check for updates"}
        </button>
        {result?.state === "available" ? (
          <button
            className="rounded-control min-h-11 bg-[var(--color-action-primary,#4f46e5)] px-4 text-sm font-semibold text-white"
            onClick={() => void api.openExternal(result.url)}
            type="button"
          >
            Open release page
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-sm" role="status">
        {result
          ? `${updateMessage(result)}${result.state === "available" ? " Download it from the release page and install it over this one; your projects stay on this computer." : ""}`
          : ""}
      </p>
    </section>
  );
}
