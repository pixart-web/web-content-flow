// LF-03: desktop shell spike. Supervisor order: embedded PostgreSQL -> Next
// standalone server -> worker, all bound to 127.0.0.1. The window gets a
// per-launch token header. Captures a screenshot and quits (SPIKE_AUTOQUIT=1).
import { app, BrowserWindow, session, utilityProcess } from "electron";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url).pathname;
const { realpathSync } = require("node:fs");
const { default: EmbeddedPostgres } = await import(
  join(
    realpathSync(
      join(root, "spikes/embedded-pg/node_modules/embedded-postgres"),
    ),
    "dist/index.js",
  )
);
const dataDir = process.env.SPIKE_DATA_DIR;
const port = 47831;
const token = randomBytes(32).toString("hex");
const t0 = performance.now();
const mark = (label) =>
  console.log(
    JSON.stringify({ at: Math.round(performance.now() - t0), label }),
  );

const env = {
  ...process.env,
  APP_MODE: "local",
  NODE_ENV: "production",
  HOSTNAME: "127.0.0.1",
  PORT: String(port),
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
  AUTH_URL: `http://127.0.0.1:${port}`,
  AUTH_SECRET: "spike-only-auth-secret-with-at-least-32-chars",
  RATE_LIMIT_SECRET: "spike-only-rate-limit-secret-with-at-least-32-chars",
  EMAIL_PROVIDER: "MOCK",
  DESKTOP_TOKEN: token,
  DATABASE_URL:
    "postgresql://wcf:wcf-local-spike@127.0.0.1:5544/web_content_flow_local",
};
const children = [];
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "wcf",
  password: "wcf-local-spike",
  port: 5544,
  persistent: true,
  onLog: () => {},
});

async function waitFor(url, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return r.status;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timeout waiting for ${url}`);
}

app.whenReady().then(async () => {
  mark("electron ready");
  await pg.start();
  mark("postgres started");
  children.push(
    utilityProcess.fork(join(root, ".next/standalone/server.js"), [], {
      env,
      serviceName: "wcf-web",
      stdio: "inherit",
    }),
  );
  children.push(
    utilityProcess.fork(join(root, "spikes/electron/dist/run-worker.mjs"), [], {
      env,
      serviceName: "wcf-worker",
      stdio: "inherit",
    }),
  );
  const ready = await waitFor(`http://127.0.0.1:${port}/health/ready`);
  mark(`next ready ${ready}`);
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`http://127.0.0.1:${port}/*`] },
    (details, callback) => {
      details.requestHeaders["x-wcf-desktop-token"] = token;
      callback({ requestHeaders: details.requestHeaders });
    },
  );
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: !process.env.SPIKE_AUTOQUIT,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) event.preventDefault();
  });
  await win.loadURL(`http://127.0.0.1:${port}/sign-in`);
  mark(`window loaded: ${win.webContents.getTitle()}`);
  if (process.env.SPIKE_AUTOQUIT) {
    const image = await win.webContents.capturePage();
    writeFileSync(process.env.SPIKE_SCREENSHOT, image.toPNG());
    mark("screenshot saved");
    app.quit();
  }
});

let stopping = false;
app.on("before-quit", async (event) => {
  if (stopping) return;
  event.preventDefault();
  stopping = true;
  for (const child of children) child.kill();
  await pg.stop();
  mark("stopped cleanly");
  app.exit(0);
});
