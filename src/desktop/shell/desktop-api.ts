// L4b: the contract between the app pages and the desktop shell, exposed as
// window.wcfDesktop by the preload script. Types only: safe to import from
// client components.

export type DesktopModelOffer = Readonly<{
  id: string;
  displayName: string;
  tag: string;
  sizeBytes: number;
  license: string;
  licenseUrl: string;
  evaluationStatus: "candidate" | "not_recommended" | "rejected";
  evaluationSummary: string;
  recommended: boolean;
  fitsOnDisk: boolean;
  installed: boolean;
  digestMatches: boolean;
}>;

export type DesktopAiOverview = Readonly<{
  hardware: Readonly<{
    cpu: string;
    memoryGb: number;
    freeDiskGb: number | null;
    profile: "essential" | "standard" | "advanced" | "none";
  }>;
  ollama:
    | { state: "running"; version: string; supported: boolean }
    | { state: "installed" }
    | { state: "not_installed"; downloadUrl: string };
  offers: readonly DesktopModelOffer[];
  active: Readonly<{
    catalogId: string;
    tag: string;
    evaluatedAt: string;
  }> | null;
  // Embedding model for client knowledge (bge-m3).
  knowledge: Readonly<{
    id: "bge-m3";
    displayName: string;
    sizeBytes: number;
    license: "MIT";
    licenseUrl: string;
    installed: boolean;
    digestMatches: boolean;
    active: boolean;
  }>;
}>;

export type DesktopDownloadProgress = Readonly<{
  id: string;
  status: string;
  percent: number | null;
}>;

export type DesktopEvaluationResult = Readonly<{
  id: string;
  approved: boolean;
  reasons: readonly string[];
  claimFlags: readonly { caseId: string; terms: readonly string[] }[];
  durationMs: number;
}>;

export type DesktopPasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        "invalid_password" | "denied" | "unavailable" | "no_owner" | "failed";
    };

export type DesktopRemoteServerResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid_url" | "unreachable" | "not_web_content_flow";
    };

// LF-20 update notice: asked on demand, never installed by the app.
export type DesktopUpdateCheck =
  | { state: "up_to_date"; current: string; latest: string }
  | {
      state: "available";
      current: string;
      latest: string;
      url: string;
      publishedAt: string | null;
    }
  | {
      state: "unavailable";
      current: string;
      reason: "offline" | "no_releases" | "failed";
    };

export type DesktopPlatform = "darwin" | "win32" | "linux" | "other";

export type WcfDesktopApi = Readonly<{
  platform: DesktopPlatform;
  connectRemoteServer: (url: string) => Promise<DesktopRemoteServerResult>;
  resetOwnerPassword: (password: string) => Promise<DesktopPasswordResetResult>;
  aiOverview: () => Promise<DesktopAiOverview>;
  startOllama: () => Promise<DesktopAiOverview>;
  downloadModel: (id: string, licenseAccepted: boolean) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  onDownloadProgress: (
    listener: (progress: DesktopDownloadProgress) => void,
  ) => () => void;
  evaluateModel: (id: string) => Promise<DesktopEvaluationResult>;
  activateModel: (id: string) => Promise<void>;
  downloadKnowledgeModel: (licenseAccepted: boolean) => Promise<void>;
  removeKnowledgeModel: () => Promise<void>;
  deactivateModel: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  appVersion: () => Promise<string>;
  checkForUpdates: () => Promise<DesktopUpdateCheck>;
}>;
