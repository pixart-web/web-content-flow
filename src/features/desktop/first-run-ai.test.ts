import { describe, expect, it } from "vitest";

import type {
  DesktopAiOverview,
  DesktopModelOffer,
} from "@/desktop/shell/desktop-api";

import { firstRunAiState } from "./first-run-ai";

const offer = (
  overrides: Partial<DesktopModelOffer> = {},
): DesktopModelOffer => ({
  id: "gemma4",
  displayName: "Gemma 4",
  tag: "gemma4:latest",
  sizeBytes: 7_200_000_000,
  license: "Gemma",
  licenseUrl: "https://example.test/license",
  evaluationStatus: "candidate",
  evaluationSummary: "Passed",
  recommended: true,
  fitsOnDisk: true,
  installed: false,
  digestMatches: false,
  ...overrides,
});

const overview = (
  overrides: Partial<DesktopAiOverview> = {},
): DesktopAiOverview => ({
  hardware: {
    cpu: "Apple M3",
    memoryGb: 24,
    freeDiskGb: 200,
    profile: "standard",
  },
  ollama: {
    state: "not_installed",
    downloadUrl: "https://ollama.com/download",
  },
  offers: [offer()],
  active: null,
  knowledge: {
    id: "bge-m3",
    displayName: "BGE-M3",
    sizeBytes: 1,
    license: "MIT",
    licenseUrl: "https://example.test/mit",
    installed: false,
    digestMatches: false,
    active: false,
  },
  ...overrides,
});

describe("first-run local AI step (LF-20)", () => {
  it("reports an active model as ready", () => {
    expect(
      firstRunAiState(
        overview({
          active: {
            catalogId: "gemma4",
            tag: "gemma4:latest",
            evaluatedAt: "x",
          },
        }),
      ),
    ).toEqual({ kind: "ready", tag: "gemma4:latest" });
  });

  it("does not suggest a model below the minimum memory", () => {
    expect(
      firstRunAiState(
        overview({
          hardware: { cpu: "x", memoryGb: 8, freeDiskGb: 100, profile: "none" },
        }),
      ),
    ).toEqual({ kind: "unsupported", memoryGb: 8 });
  });

  it("suggests the recommended model that fits on disk", () => {
    const state = firstRunAiState(
      overview({
        offers: [
          offer({ id: "big", fitsOnDisk: false }),
          offer({ id: "weak", recommended: false }),
          offer({ id: "fits" }),
        ],
      }),
    );
    expect(state).toMatchObject({ kind: "suggest", ollamaInstalled: false });
    expect(state.kind === "suggest" && state.offer?.id).toBe("fits");
  });

  it("still offers setup when no model fits, and sees a running runtime", () => {
    expect(
      firstRunAiState(
        overview({
          offers: [offer({ fitsOnDisk: false })],
          ollama: { state: "running", version: "0.40.0", supported: true },
        }),
      ),
    ).toEqual({ kind: "suggest", offer: null, ollamaInstalled: true });
  });
});
