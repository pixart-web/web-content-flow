import { appendFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  app,
  BrowserWindow,
  dialog,
  safeStorage,
  session,
  shell,
  utilityProcess,
  type UtilityProcess,
} from "electron";

import { prepareLocalDatabase } from "@/desktop/local-database";
import { portIsFree } from "@/desktop/postgres-supervisor";
import { readMigrations } from "@/server/db/migration-runner";

import { registerAiIpc } from "./ai-ipc";
import { isLoopbackUrl } from "./offline";
import { registerOwnerIpc } from "./owner-ipc";
import { registerRemoteServerIpc, startRemote } from "./remote-server";
import {
  installationPaths,
  launchTokens,
  loadOrCreateSecrets,
  readSettings,
  runtimeEnv,
  withSystemEnv,
  type Cipher,
} from "./installation";

// L4 (ADR L-2): Electron main process of the desktop edition. Launch order:
// secrets (Keychain) → PostgreSQL + migrations (snapshot first) → web server
// → worker → hourly maintenance → window. Quit order is the reverse, with the
// worker drained first. Everything listens on 127.0.0.1; the window sends the
// per-launch token on every request (APP_MODE=local proxy check).

// Fixed per build: NEXT_PUBLIC_APP_URL is compiled into the client bundle.
const PORT = Number(process.env.WCF_DESKTOP_PORT ?? 47831);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TOKEN_HEADER = "x-wcf-desktop-token";
const HOUR = 60 * 60 * 1000;

const here = dirname(fileURLToPath(import.meta.url));
const paths = installationPaths(app.getPath("userData"));
mkdirSync(paths.logsDir, { recursive: true });
const logFile = join(paths.logsDir, "desktop.log");
const log = (message: string) =>
  appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);

const cipher: Cipher = {
  encrypt: (plain) => safeStorage.encryptStringAsync(plain),
  decrypt: async (encrypted) =>
    (await safeStorage.decryptStringAsync(encrypted)).result,
};

let window: BrowserWindow | null = null;
let worker: UtilityProcess | null = null;
let web: UtilityProcess | null = null;
let maintenanceTimer: NodeJS.Timeout | null = null;
let stopDatabase: (() => Promise<void>) | null = null;
let quitting = false;

// LF-21 offline check, development builds only (never in the packaged app):
// a CommonJS guard that refuses and records every connection that does not go
// to this computer. It is loaded into the main process and every child, and
// the window's requests are filtered the same way (see installOfflineGuard).
const offlineGuard = app.isPackaged
  ? undefined
  : process.env.WCF_DESKTOP_OFFLINE_GUARD;
if (offlineGuard) {
  createRequire(import.meta.url)(offlineGuard);
  log(`Offline guard active: ${offlineGuard}`);
}

function installOfflineGuard() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed =
      isLoopbackUrl(details.url) || /^(data|devtools|blob):/.test(details.url);
    if (!allowed) log(`Offline guard blocked (window): ${details.url}`);
    callback({ cancel: !allowed });
  });
}

function fork(entry: string, env: Record<string, string>, name: string) {
  const child = utilityProcess.fork(join(here, entry), [], {
    // utilityProcess ignores --require in execArgv; NODE_OPTIONS is honoured.
    env: withSystemEnv(
      offlineGuard
        ? {
            ...env,
            NODE_OPTIONS: `--require "${offlineGuard.replaceAll("\\", "/")}"`,
            WCF_OFFLINE_GUARD_PROCESS: name,
          }
        : env,
    ),
    serviceName: name,
    stdio: "pipe",
  });
  child.stdout?.on("data", (chunk: Buffer) =>
    log(`[${name}] ${chunk.toString().trim()}`),
  );
  child.stderr?.on("data", (chunk: Buffer) =>
    log(`[${name}!] ${chunk.toString().trim()}`),
  );
  child.on("exit", (code) => log(`[${name}] exited ${code}`));
  return child;
}

async function waitForReady(token: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${ORIGIN}/health/ready`, {
        headers: { [TOKEN_HEADER]: token },
      });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The app server did not become ready.");
}

const loadingPage = `data:text/html;charset=utf-8,${encodeURIComponent(
  `<!doctype html><meta charset="utf-8"><title>Web Content Flow</title>
  <body style="font:15px -apple-system,system-ui;display:grid;place-items:center;height:100vh;margin:0;color:#475569;background:#f8fafc">
  <p>Starting Web Content Flow…</p></body>`,
)}`;

async function start() {
  const remote = readSettings(paths.settingsFile).remoteServer;
  if (remote) {
    // L7: client of a private server — nothing local starts.
    window = new BrowserWindow({
      width: 1360,
      height: 900,
      title: "Web Content Flow",
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    await startRemote({ window, serverUrl: remote.url, paths, log });
    // Development-only launch check, as in local mode.
    const remoteShot = app.isPackaged
      ? undefined
      : process.env.WCF_DESKTOP_SMOKE_SCREENSHOT;
    if (remoteShot) {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(
        remoteShot,
        (await window.webContents.capturePage()).toPNG(),
      );
      log(`Smoke screenshot: ${remoteShot} (${window.webContents.getURL()})`);
      app.quit();
    }
    return;
  }
  if (!(await safeStorage.isAsyncEncryptionAvailable()))
    throw new Error("Secure storage (Keychain) is not available.");
  if (!(await portIsFree(PORT)))
    throw new Error(`Port ${PORT} is already in use on this computer.`);

  window = new BrowserWindow({
    width: 1360,
    height: 900,
    title: "Web Content Flow",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: join(here, "preload.cjs"),
    },
  });
  if (offlineGuard) installOfflineGuard();
  await window.loadURL(loadingPage);

  const { secrets, created } = await loadOrCreateSecrets(
    paths.secretsFile,
    cipher,
  );
  log(created ? "First run: secrets created." : "Secrets loaded.");
  const tokens = launchTokens();
  const settings = readSettings(paths.settingsFile);

  const prepared = await prepareLocalDatabase({
    postgres: {
      dataDir: paths.dataDir,
      database: "web_content_flow",
      user: "wcf",
      password: secrets.databasePassword,
      log,
    },
    backupsDir: paths.backupsDir,
    migrations: readMigrations(join(here, "migrations")),
  });
  stopDatabase = prepared.postgres.stop;
  log(
    `Database ready on port ${prepared.postgres.port}; migrations applied now: ${prepared.appliedNow.length}; snapshot: ${prepared.snapshotDir ?? "none"}.`,
  );

  const env = runtimeEnv({
    port: PORT,
    databaseUrl: prepared.postgres.databaseUrl,
    secrets,
    tokens,
    settings,
  });
  registerAiIpc({ origin: ORIGIN, here, paths, env: () => env, log });
  registerOwnerIpc({ origin: ORIGIN, here, tokens, log });
  registerRemoteServerIpc({ origin: ORIGIN, paths, log });
  web = fork(join("web", "server.js"), env, "wcf-web");
  worker = fork("worker.mjs", env, "wcf-worker");
  const maintenance = () => fork("maintenance.mjs", env, "wcf-maintenance");
  maintenance();
  maintenanceTimer = setInterval(maintenance, HOUR);

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${ORIGIN}/*`] },
    (details, callback) => {
      details.requestHeaders[TOKEN_HEADER] = tokens.desktopToken;
      callback({ requestHeaders: details.requestHeaders });
    },
  );
  // Only the local app inside the window; links elsewhere open in the browser.
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith(ORIGIN))
      void shell.openExternal(url);
    return { action: "deny" };
  });

  await waitForReady(tokens.desktopToken);
  await window.loadURL(`${ORIGIN}/app`);
  log(`Window loaded: ${window.webContents.getURL()}`);
  // Automated checks on a developer machine only (never in the packaged app):
  // run a script in the loaded window and log its result.
  const smokeScript = app.isPackaged
    ? undefined
    : process.env.WCF_DESKTOP_SMOKE_JS;
  if (smokeScript) {
    try {
      const result: unknown =
        await window.webContents.executeJavaScript(smokeScript);
      log(`Smoke result: ${JSON.stringify(result)}`);
    } catch (error: unknown) {
      log(
        `Smoke error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  // Automated launch check (CI-style smoke test on a developer machine).
  const screenshot = app.isPackaged
    ? undefined
    : process.env.WCF_DESKTOP_SMOKE_SCREENSHOT;
  if (screenshot) {
    // A capture can fail on virtual displays without a GPU; that must not
    // turn a working launch into a startup failure.
    try {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(
        screenshot,
        (await window.webContents.capturePage()).toPNG(),
      );
      log(`Smoke screenshot: ${screenshot}`);
    } catch (error: unknown) {
      log(
        `Smoke screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    app.quit();
  }
}

async function stop() {
  if (maintenanceTimer) clearInterval(maintenanceTimer);
  if (worker) {
    const exited = new Promise((resolve) => worker!.once("exit", resolve));
    worker.postMessage({ type: "shutdown" });
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 90_000)),
    ]);
  }
  web?.kill();
  await stopDatabase?.().catch((error: unknown) =>
    log(`Database stop: ${String(error)}`),
  );
  log("Stopped cleanly.");
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.on("before-quit", (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    void stop().finally(() => app.exit(0));
  });
  app.on("window-all-closed", () => app.quit());
  void app.whenReady().then(() =>
    start().catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`Startup failed: ${message}`);
      // The dialog blocks until dismissed: skip it in automated checks.
      if (app.isPackaged || !process.env.WCF_DESKTOP_SMOKE_SCREENSHOT)
        dialog.showErrorBox(
          "Web Content Flow could not start",
          `${message}\n\nDetails: ${logFile}`,
        );
      quitting = true;
      await stop().catch(() => {});
      app.exit(1);
    }),
  );
}
