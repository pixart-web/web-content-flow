// L5: packages dist/desktop (built ON Linux) into a .tar.gz and a .deb.
// Same approach as package-macos.mjs: copy Electron, rename, ship the app as
// built. Electron's chrome-sandbox must be setuid root, which the .deb sets.
// Usage: pnpm build:desktop && node scripts/package-linux.mjs
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

if (process.platform !== "linux") throw new Error("Linux only.");
const root = process.cwd();
const desktop = join(root, "dist", "desktop");
if (!existsSync(join(desktop, "main.mjs")))
  throw new Error("Run pnpm build:desktop first.");

const name = "web-content-flow";
const product = "Web Content Flow";
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const arch = process.arch === "arm64" ? "arm64" : "x64";
const debArch = arch === "arm64" ? "arm64" : "amd64";
const release = join(root, "dist", "release");
const appDir = join(release, `${name}-linux-${arch}`);
const run = (command, args, cwd) =>
  execFileSync(command, args, { stdio: "inherit", cwd });

rmSync(release, { recursive: true, force: true });
mkdirSync(release, { recursive: true });

console.warn("1/3 app directory");
cpSync(join(root, "node_modules", "electron", "dist"), appDir, {
  recursive: true,
  verbatimSymlinks: true,
});
renameSync(join(appDir, "electron"), join(appDir, name));
rmSync(join(appDir, "resources", "default_app.asar"), { force: true });
cpSync(desktop, join(appDir, "resources", "app"), {
  recursive: true,
  verbatimSymlinks: true,
});

console.warn("2/3 tar.gz");
run(
  "tar",
  [
    "-czf",
    join(release, `${name}-${version}-linux-${arch}.tar.gz`),
    `${name}-linux-${arch}`,
  ],
  release,
);

console.warn("3/3 .deb");
const deb = join(release, "deb");
const installDir = join(deb, "opt", name);
cpSync(appDir, installDir, { recursive: true, verbatimSymlinks: true });
mkdirSync(join(deb, "usr", "share", "applications"), { recursive: true });
writeFileSync(
  join(deb, "usr", "share", "applications", `${name}.desktop`),
  `[Desktop Entry]\nName=${product}\nExec=/opt/${name}/${name} %U\nTerminal=false\nType=Application\nCategories=Office;\n`,
);
mkdirSync(join(deb, "DEBIAN"), { recursive: true });
writeFileSync(
  join(deb, "DEBIAN", "control"),
  [
    `Package: ${name}`,
    `Version: ${version}`,
    `Architecture: ${debArch}`,
    "Maintainer: Web Content Flow <support@webcontentflow.com>",
    "Depends: libgtk-3-0, libnss3, libxss1, libasound2 | libasound2t64, libsecret-1-0",
    "Section: office",
    "Priority: optional",
    `Description: ${product} desktop edition (local-first, local AI)`,
    "",
  ].join("\n"),
);
writeFileSync(
  join(deb, "DEBIAN", "postinst"),
  `#!/bin/sh\nset -e\nchown root:root /opt/${name}/chrome-sandbox\nchmod 4755 /opt/${name}/chrome-sandbox\n`,
);
chmodSync(join(deb, "DEBIAN", "postinst"), 0o755);
run("dpkg-deb", [
  "--root-owner-group",
  "--build",
  deb,
  join(release, `${name}_${version}_${debArch}.deb`),
]);
rmSync(deb, { recursive: true, force: true });
console.warn(`Ready: ${release}`);
