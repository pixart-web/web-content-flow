"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import type {
  DesktopAiOverview,
  WcfDesktopApi,
} from "@/desktop/shell/desktop-api";

import { firstRunAiState } from "./first-run-ai";

const gb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;

// LF-20: the local AI part of the first-run setup. It reads the same overview
// as Settings → Local AI and sends the owner there to download, evaluate and
// activate a model; the first project never waits for it.
export function FirstRunAiStep() {
  // undefined while rendering on the server; null outside the desktop app.
  const api = useSyncExternalStore<WcfDesktopApi | null | undefined>(
    () => () => {},
    () => window.wcfDesktop ?? null,
    () => undefined,
  );
  const [overview, setOverview] = useState<DesktopAiOverview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!api) return;
    let live = true;
    api
      .aiOverview()
      .then((next) => {
        if (live) setOverview(next);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [api]);

  if (!api) return null;
  if (failed)
    return (
      <p className="text-secondary text-sm">
        This computer could not be checked right now. You can set up local AI
        later in Settings → Local AI.
      </p>
    );
  if (!overview)
    return (
      <p className="text-secondary text-sm" role="status">
        Checking this computer…
      </p>
    );

  const state = firstRunAiState(overview);
  if (state.kind === "ready")
    return (
      <p className="text-sm">
        Local AI is ready (<strong>{state.tag}</strong>). Generation runs on
        this computer.
      </p>
    );
  if (state.kind === "unsupported")
    return (
      <p className="text-secondary text-sm">
        This computer has {state.memoryGb} GB of memory, less than local models
        need (16 GB). You can still create projects: generation stays in mock
        mode, or you can connect a private server in Settings → Server.
      </p>
    );
  return (
    <div className="space-y-3 text-sm">
      <p className="text-secondary">
        {state.offer
          ? `Recommended for this computer: ${state.offer.displayName} (${gb(state.offer.sizeBytes)} download, ${state.offer.license} licence).`
          : "No recommended model fits the free disk space right now."}{" "}
        {state.ollamaInstalled
          ? "The model runtime (Ollama) is installed."
          : "It needs the free Ollama runtime, which the setup guides you to install."}
      </p>
      <Link
        className="text-link inline-flex min-h-11 items-center font-semibold underline"
        href="/app/settings/local-ai?from=onboarding"
      >
        Set up local AI
      </Link>
      <p className="text-secondary">
        Or continue now in mock mode: it writes example content without a model,
        so you can try the whole flow. You can set up local AI at any time in
        Settings → Local AI.
      </p>
    </div>
  );
}
