"use client";

import { Cpu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import type {
  DesktopAiOverview,
  WcfDesktopApi,
} from "@/desktop/shell/desktop-api";

import type { ServerAiStatus } from "./studio-data";
import styles from "./studio.module.css";

type View = {
  tone: "ready" | "idle" | "off";
  badge: string;
  body: string;
  chips: string[];
  chipsLabel?: string;
  action?: { href: string; label: string };
};

const localAi = { href: "/app/settings/local-ai", label: "Manage local AI" };

function fromServer(status: ServerAiStatus, localMode: boolean): View {
  if (status.kind === "local-runtime")
    return {
      tone: "ready",
      badge: "Active",
      body: "Generation runs on a model on this machine.",
      chips: status.model ? [status.model] : [],
      chipsLabel: "Configured model",
    };
  if (status.kind === "external")
    return {
      tone: "ready",
      badge: "External",
      body: `Generation uses ${status.provider}. Project context is sent to it when you generate.`,
      chips: [],
    };
  return {
    tone: "off",
    badge: "Mock mode",
    body: "No model is active, so generation writes example content. Nothing is sent anywhere.",
    chips: [],
    ...(localMode ? { action: localAi } : {}),
  };
}

function fromDesktop(overview: DesktopAiOverview): View {
  const installed = overview.offers
    .filter((offer) => offer.installed)
    .map((offer) => offer.displayName);
  if (overview.knowledge.installed)
    installed.push(overview.knowledge.displayName);
  if (overview.active)
    return {
      tone: overview.ollama.state === "running" ? "ready" : "idle",
      badge: overview.ollama.state === "running" ? "Online" : "Runtime stopped",
      body:
        overview.ollama.state === "running"
          ? "Generation runs on this computer. Nothing leaves it."
          : "The model runtime (Ollama) is not running. Start it from Local AI.",
      chips: installed,
      chipsLabel: "Installed on this computer",
      action: localAi,
    };
  return {
    tone: "off",
    badge: "Not set up",
    body:
      overview.hardware.profile === "none"
        ? `This computer has ${overview.hardware.memoryGb} GB of memory, below the 16 GB local models need. Generation stays in mock mode.`
        : "No model is active yet, so generation writes example content.",
    chips: installed,
    chipsLabel: "Installed on this computer",
    action: { href: "/app/settings/local-ai", label: "Set up local AI" },
  };
}

// The quiet model-status panel: what is really installed and active. In the
// desktop app it reads the shell's overview; elsewhere, the server's AI
// configuration. It never lists a model that is not installed.
export function ModelStatus({
  server,
  localMode,
}: {
  server: ServerAiStatus;
  localMode: boolean;
}) {
  const api = useSyncExternalStore<WcfDesktopApi | null | undefined>(
    () => () => {},
    () => window.wcfDesktop ?? null,
    () => undefined,
  );
  const [overview, setOverview] = useState<DesktopAiOverview | null>(null);

  useEffect(() => {
    if (!api) return;
    let live = true;
    api
      .aiOverview()
      .then((next) => {
        if (live) setOverview(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [api]);

  const view = overview ? fromDesktop(overview) : fromServer(server, localMode);
  const tone =
    view.tone === "ready"
      ? styles.statusReady
      : view.tone === "idle"
        ? styles.statusIdle
        : styles.statusOff;
  return (
    <section
      aria-labelledby="studio-ai"
      className={`${styles.panel} ${styles.aiPanel}`}
    >
      <div className={styles.aiHead}>
        <h2 className={styles.aiTitle} id="studio-ai">
          <Cpu aria-hidden className={styles.aiIcon} size={26} />
          {localMode ? "Local AI" : "AI generation"}
        </h2>
        <span className={`${styles.statusDot} ${tone}`}>{view.badge}</span>
      </div>
      <p className={styles.aiBody}>{view.body}</p>
      {view.chips.length ? (
        <>
          <p className={styles.chipsLabel}>{view.chipsLabel}</p>
          <ul className={styles.chips}>
            {view.chips.map((chip) => (
              <li className={styles.chip} key={chip}>
                {chip}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {view.action ? (
        <Link className={styles.aiAction} href={view.action.href}>
          {view.action.label} →
        </Link>
      ) : null}
    </section>
  );
}
