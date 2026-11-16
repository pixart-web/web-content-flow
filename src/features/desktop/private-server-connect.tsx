"use client";

import { useState, useSyncExternalStore } from "react";

import type {
  DesktopRemoteServerResult,
  WcfDesktopApi,
} from "@/desktop/shell/desktop-api";

// L7: point the desktop app at a private Web Content Flow server.

const messages: Record<
  Exclude<DesktopRemoteServerResult, { ok: true }>["reason"],
  string
> = {
  invalid_url: "Use the server's https:// address.",
  unreachable: "The server did not answer. Check the address and your network.",
  not_web_content_flow:
    "That address does not look like a Web Content Flow server.",
};

export function PrivateServerConnect() {
  const api = useSyncExternalStore<WcfDesktopApi | null | undefined>(
    () => () => {},
    () =>
      (window as Window & { wcfDesktop?: WcfDesktopApi }).wcfDesktop ?? null,
    () => undefined,
  );
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (api === undefined) return null;
  if (api === null)
    return (
      <p className="text-secondary mt-6">
        Connecting to a private server is done from the Web Content Flow desktop
        app.
      </p>
    );
  return (
    <form
      className="border-default bg-surface rounded-panel mt-6 space-y-4 border p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setMessage(null);
        void api
          .connectRemoteServer(url)
          .then((result) =>
            setMessage(
              result.ok
                ? "Connected. The app restarts and opens the server; sign in there."
                : messages[result.reason],
            ),
          )
          .catch(() => setMessage(messages.unreachable))
          .finally(() => setBusy(false));
      }}
    >
      <label className="block text-sm font-semibold">
        Server address
        <input
          className="border-default rounded-control mt-1 block min-h-11 w-full border px-3"
          type="url"
          inputMode="url"
          placeholder="https://wcf.example.com"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <p className="text-secondary text-sm">
        While connected, projects live on the server and this computer&apos;s
        workspace stays untouched. Use the Server menu to come back to it.
      </p>
      <button
        className="rounded-control min-h-11 bg-[var(--color-action-primary,#4f46e5)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        {busy ? "Checking the server…" : "Connect"}
      </button>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
