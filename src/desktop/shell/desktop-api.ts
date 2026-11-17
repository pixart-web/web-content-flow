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
  deactivateModel: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}>;
