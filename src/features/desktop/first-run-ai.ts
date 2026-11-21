import type {
  DesktopAiOverview,
  DesktopModelOffer,
} from "@/desktop/shell/desktop-api";

// LF-20 first-run step: what the onboarding tells the owner about local AI
// before the first project. Generation never waits for it: without an active
// model the app stays in mock mode, and the owner can set AI up later.
export type FirstRunAiState =
  | { kind: "ready"; tag: string }
  | { kind: "unsupported"; memoryGb: number }
  | {
      kind: "suggest";
      offer: DesktopModelOffer | null;
      ollamaInstalled: boolean;
    };

export function firstRunAiState(overview: DesktopAiOverview): FirstRunAiState {
  if (overview.active) return { kind: "ready", tag: overview.active.tag };
  if (overview.hardware.profile === "none")
    return { kind: "unsupported", memoryGb: overview.hardware.memoryGb };
  const offer =
    overview.offers.find((entry) => entry.recommended && entry.fitsOnDisk) ??
    null;
  return {
    kind: "suggest",
    offer,
    ollamaInstalled: overview.ollama.state !== "not_installed",
  };
}
