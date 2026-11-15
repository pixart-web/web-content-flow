// L4d: packages dist/desktop (from `pnpm build:desktop`) into an unsigned
// macOS app and .dmg, without a packaging framework: the app is already
// self-contained, so this only copies Electron, renames it and builds the
// image with the system's hdiutil. Ad-hoc signed (required on Apple
// Silicon); real signing and notarization need an Apple Developer account.
// Usage: pnpm desktop:dmg
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";

if (process.platform !== "darwin") throw new Error("macOS only.");
const root = process.cwd();
const desktop = join(root, "dist", "desktop");
if (!existsSync(join(desktop, "main.mjs")))
  throw new Error("Run pnpm build:desktop first.");

const product = "Web Content Flow";
const identifier = "com.webcontentflow.desktop";
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const electronApp = join(
  root,
  "node_modules",
  "electron",
  "dist",
  "Electron.app",
);
const release = join(root, "dist", "release");
const app = join(release, `${product}.app`);
const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit" });
const plist = (key, value) =>
  run("/usr/libexec/PlistBuddy", [
    "-c",
    `Set :${key} ${value}`,
    join(app, "Contents", "Info.plist"),
  ]);

rmSync(release, { recursive: true, force: true });
mkdirSync(release, { recursive: true });

console.warn("1/4 app bundle");
run("ditto", [electronApp, app]);
plist("CFBundleName", product);
plist("CFBundleDisplayName", product);
plist("CFBundleIdentifier", identifier);
plist("CFBundleShortVersionString", version);
plist("CFBundleVersion", version);
rmSync(join(app, "Contents", "Resources", "default_app.asar"), { force: true });

console.warn("2/4 application files");
// ditto keeps symlinks and permissions (PostgreSQL binaries, helper).
run("ditto", [desktop, join(app, "Contents", "Resources", "app")]);

console.warn("3/4 ad-hoc signature");
run("codesign", ["--force", "--deep", "--sign", "-", app]);
run("codesign", ["--verify", "--deep", "--strict", app]);

console.warn("4/4 disk image");
const staging = join(release, "dmg");
mkdirSync(staging);
run("ditto", [app, join(staging, `${product}.app`)]);
symlinkSync("/Applications", join(staging, "Applications"));
const dmg = join(release, `${product}-${version}-arm64.dmg`);
run("hdiutil", [
  "create",
  "-volname",
  product,
  "-srcfolder",
  staging,
  "-ov",
  "-format",
  "UDZO",
  "-quiet",
  dmg,
]);
rmSync(staging, { recursive: true, force: true });
console.warn(`Ready: ${dmg}`);
