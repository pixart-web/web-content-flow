// L5: packages dist/desktop (built ON Windows) into a portable .zip.
// Unsigned: Windows SmartScreen warns until a code-signing certificate is
// used. Usage: pnpm build:desktop && node scripts/package-windows.mjs
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

if (process.platform !== "win32") throw new Error("Windows only.");
const root = process.cwd();
const desktop = join(root, "dist", "desktop");
if (!existsSync(join(desktop, "main.mjs")))
  throw new Error("Run pnpm build:desktop first.");

const product = "Web Content Flow";
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const release = join(root, "dist", "release");
const appDir = join(release, `${product}-win32-x64`);

rmSync(release, { recursive: true, force: true });
mkdirSync(release, { recursive: true });

console.warn("1/2 app directory");
cpSync(join(root, "node_modules", "electron", "dist"), appDir, {
  recursive: true,
});
renameSync(join(appDir, "electron.exe"), join(appDir, `${product}.exe`));
rmSync(join(appDir, "resources", "default_app.asar"), { force: true });
cpSync(desktop, join(appDir, "resources", "app"), { recursive: true });

console.warn("2/2 zip");
const zip = join(release, `web-content-flow-${version}-win32-x64.zip`);
execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${appDir}' -DestinationPath '${zip}' -Force`,
  ],
  { stdio: "inherit" },
);
console.warn(`Ready: ${zip}`);
