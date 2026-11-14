import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

// L3 (LF-15): finds, checks and starts the Ollama runtime. Installing it is
// guided (official download page), never silent: the user installs it.

const run = promisify(execFile);

// Oldest version validated with this app (structured output, `think`).
export const MINIMUM_OLLAMA_VERSION = "0.40.0";
export const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";

export type OllamaInstall =
  { kind: "mac-app"; path: string } | { kind: "binary"; path: string };

export type OllamaStatus =
  | { state: "running"; version: string; supported: boolean }
  | { state: "installed"; install: OllamaInstall }
  | { state: "not_installed"; downloadUrl: string };

export function compareVersions(a: string, b: string) {
  const parse = (value: string) =>
    value
      .split(/[.-]/)
      .slice(0, 3)
      .map((part) => Number(part) || 0);
  const [x, y] = [parse(a), parse(b)];
  for (let index = 0; index < 3; index += 1)
    if (x[index] !== y[index]) return (x[index] ?? 0) - (y[index] ?? 0);
  return 0;
}

export function candidateInstalls(
  platform: NodeJS.Platform = process.platform,
  home = homedir(),
  env: NodeJS.ProcessEnv = process.env,
): OllamaInstall[] {
  if (platform === "darwin")
    return [
      { kind: "mac-app", path: "/Applications/Ollama.app" },
      { kind: "mac-app", path: join(home, "Applications", "Ollama.app") },
      { kind: "binary", path: "/opt/homebrew/bin/ollama" },
      { kind: "binary", path: "/usr/local/bin/ollama" },
    ];
  if (platform === "win32")
    return [
      {
        kind: "binary",
        path: join(
          env.LOCALAPPDATA ?? join(home, "AppData", "Local"),
          "Programs",
          "Ollama",
          "ollama.exe",
        ),
      },
    ];
  return [
    { kind: "binary", path: "/usr/local/bin/ollama" },
    { kind: "binary", path: "/usr/bin/ollama" },
  ];
}

export async function runningVersion(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(
      new URL("api/version", withSlash(baseUrl)),
      {
        signal: AbortSignal.timeout(2_000),
      },
    );
    if (!response.ok) return null;
    return ((await response.json()) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

const withSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

export async function ollamaStatus(input: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  candidates?: OllamaInstall[];
}): Promise<OllamaStatus> {
  const version = await runningVersion(input.baseUrl, input.fetchImpl);
  if (version)
    return {
      state: "running",
      version,
      supported: compareVersions(version, MINIMUM_OLLAMA_VERSION) >= 0,
    };
  const install = (input.candidates ?? candidateInstalls()).find((candidate) =>
    existsSync(candidate.path),
  );
  if (install) return { state: "installed", install };
  return { state: "not_installed", downloadUrl: OLLAMA_DOWNLOAD_URL };
}

// Starts an installed Ollama and waits until its API answers.
export async function startOllama(input: {
  baseUrl: string;
  install: OllamaInstall;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}) {
  if (input.install.kind === "mac-app")
    await run("open", ["-a", input.install.path]);
  else
    spawn(input.install.path, ["serve"], {
      detached: true,
      stdio: "ignore",
    }).unref();
  const deadline = Date.now() + (input.timeoutMs ?? 20_000);
  while (Date.now() < deadline) {
    const version = await runningVersion(input.baseUrl, input.fetchImpl);
    if (version) return version;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Ollama did not start in time.");
}
