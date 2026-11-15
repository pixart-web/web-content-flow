// L5: launches the built desktop app (dist/desktop, not packaged) with a
// throwaway data directory, lets it reach the app page, takes a screenshot,
// quits, and checks the log on Linux, Windows and macOS. Used by CI.
// Usage: node scripts/desktop-smoke.mjs [--electron-arg ...]
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const userData = mkdtempSync(join(tmpdir(), "wcf-smoke-"));
const screenshot = join(userData, "smoke.png");
const electron = join(
  root,
  "node_modules",
  "electron",
  "dist",
  process.platform === "win32"
    ? "electron.exe"
    : process.platform === "darwin"
      ? "Electron.app/Contents/MacOS/Electron"
      : "electron",
);
const extra = process.argv.slice(2);

function launch(label) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      electron,
      [join(root, "dist", "desktop"), `--user-data-dir=${userData}`, ...extra],
      {
        env: {
          ...process.env,
          WCF_DESKTOP_SMOKE_SCREENSHOT: screenshot,
          ELECTRON_ENABLE_LOGGING: "1",
        },
        stdio: "inherit",
      },
    );
    const timer = setTimeout(() => {
      // Show where the app stopped before failing.
      try {
        console.error(log());
      } catch {
        console.error("(no desktop log written)");
      }
      child.kill();
      reject(new Error(`${label}: no exit within 4 minutes`));
    }, 240_000);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

const log = () => readFileSync(join(userData, "logs", "desktop.log"), "utf8");
const expect = (text, label) => {
  if (!log().includes(text)) {
    console.error(log());
    throw new Error(`${label}: log is missing "${text}"`);
  }
};

await launch("first run");
expect("First run: secrets created.", "first run");
expect("migrations applied now:", "first run");
expect("Window loaded: http://127.0.0.1:47831/sign-up", "first run");
expect("Stopped cleanly.", "first run");
// The screenshot is evidence, not the check: virtual displays without a GPU
// occasionally fail to capture. The log assertions above are the check.
if (!existsSync(screenshot)) console.warn("first run: no screenshot captured");

await launch("second run");
expect("Secrets loaded.", "second run");
if ((log().match(/Stopped cleanly\./g) ?? []).length < 2)
  throw new Error("second run: did not stop cleanly");
console.warn(`Desktop smoke passed on ${process.platform}-${process.arch}.`);
if (existsSync(screenshot)) console.warn(`Screenshot: ${screenshot}`);
