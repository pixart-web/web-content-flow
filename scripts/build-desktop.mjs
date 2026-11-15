// LF-09: build the pieces the desktop shell runs (ADR L-2), into dist/desktop/:
//   web/        Next.js standalone server (server.js + .next/static + public)
//   worker.mjs  generation worker, bundled (no tsx at runtime)
//   maintenance.mjs
//   manifest.json
// Usage: pnpm build:desktop [--port 47831]
// The port is fixed per installation because NEXT_PUBLIC_APP_URL is compiled
// into the client bundle. Secrets are NOT baked in: the build uses throwaway
// placeholders only so Next can collect route configuration; the shell
// provides real values at launch.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { build } from "esbuild";

const { values } = parseArgs({
  options: { port: { type: "string", default: "47831" } },
});
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("--port must be between 1024 and 65535.");

const root = process.cwd();
const out = join(root, "dist", "desktop");
const origin = `http://127.0.0.1:${port}`;
const placeholder = "build-time-placeholder-not-used-at-runtime-0000";
const env = {
  ...process.env,
  NEXT_OUTPUT: "standalone",
  APP_MODE: "local",
  APP_ENV: "local",
  DATABASE_ENVIRONMENT: "local",
  NEXT_PUBLIC_APP_URL: origin,
  AUTH_URL: origin,
  EMAIL_PROVIDER: "MOCK",
  AI_REAL_GENERATION_ENABLED: "false",
  AI_FAKE_OPENAI_ENABLED: "false",
  MARKETING_INDEXING_ENABLED: "false",
  MARKETING_CAPTURE_MODE: "false",
  AUTH_SECRET: placeholder,
  RATE_LIMIT_SECRET: placeholder,
  DATABASE_URL: "postgresql://placeholder:placeholder@127.0.0.1:1/placeholder",
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

console.warn("1/5 next build (standalone)");
// pnpm is a .cmd shim on Windows, which needs a shell.
execFileSync("pnpm", ["exec", "next", "build"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js")))
  throw new Error("next build did not produce .next/standalone/server.js");

console.warn("2/5 assemble web/");
cpSync(standalone, join(out, "web"), {
  recursive: true,
  verbatimSymlinks: true,
});
cpSync(join(root, ".next", "static"), join(out, "web", ".next", "static"), {
  recursive: true,
});
cpSync(join(root, "public"), join(out, "web", "public"), { recursive: true });
rmSync(join(out, "web", ".env"), { force: true });

console.warn("3/5 bundle worker and maintenance");
await build({
  entryPoints: {
    worker: join(root, "scripts", "run-worker.ts"),
    maintenance: join(root, "scripts", "run-maintenance.ts"),
    // L3: on-device evaluation before a local model is activated.
    evaluate: join(root, "scripts", "run-ai-eval.ts"),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  conditions: ["react-server"],
  outdir: out,
  outExtension: { ".js": ".mjs" },
  tsconfig: join(root, "tsconfig.json"),
  banner: {
    js: "import { createRequire as __wcfCreateRequire } from 'node:module'; const require = __wcfCreateRequire(import.meta.url);",
  },
  logLevel: "warning",
});

console.warn("4/5 desktop shell (Electron main)");
await build({
  entryPoints: { main: join(root, "src", "desktop", "shell", "main.ts") },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  outdir: out,
  outExtension: { ".js": ".mjs" },
  tsconfig: join(root, "tsconfig.json"),
  // electron is provided by the runtime; the PostgreSQL binary packages are
  // copied as-is because they locate their binaries relative to themselves.
  external: ["electron", "@embedded-postgres/*"],
  banner: {
    js: "import { createRequire as __wcfCreateRequire } from 'node:module'; const require = __wcfCreateRequire(import.meta.url);",
  },
  logLevel: "warning",
});
// macOS: native helper that asks the system to confirm the owner (L4c).
if (process.platform === "darwin") {
  mkdirSync(join(out, "bin"), { recursive: true });
  execFileSync(
    "swiftc",
    [
      "-O",
      "-o",
      join(out, "bin", "wcf-os-auth"),
      join(root, "src", "desktop", "macos", "os-auth.swift"),
    ],
    { stdio: "inherit" },
  );
} else
  console.warn(
    "   (skipping the macOS authentication helper on this platform)",
  );
// Sandboxed preload scripts must be CommonJS.
await build({
  entryPoints: [join(root, "src", "desktop", "shell", "preload.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  outfile: join(out, "preload.cjs"),
  external: ["electron"],
  logLevel: "warning",
});
cpSync(join(root, "prisma", "migrations"), join(out, "migrations"), {
  recursive: true,
});
const platformPackage = `@embedded-postgres/${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
const embedded = realpathSync(join(root, "node_modules", "embedded-postgres"));
// pnpm places the platform package next to embedded-postgres in the store.
const platformSource = realpathSync(
  join(embedded, "..", ...platformPackage.split("/")),
);
cpSync(
  platformSource,
  join(out, "node_modules", ...platformPackage.split("/")),
  {
    recursive: true,
    verbatimSymlinks: true,
  },
);
// The PostgreSQL package ships ICU/OpenSSL libraries as identical copies
// (the symlinks were hydrated); turn duplicates back into symlinks (~160 MB).
{
  const { createHash } = await import("node:crypto");
  const { readdirSync, lstatSync, symlinkSync, unlinkSync } =
    await import("node:fs");
  const lib = join(
    out,
    "node_modules",
    ...platformPackage.split("/"),
    "native",
    "lib",
  );
  // Windows: symlinks need extra privileges; keep the copies there.
  if (existsSync(lib) && process.platform !== "win32") {
    const byHash = new Map();
    for (const name of readdirSync(lib)) {
      const file = join(lib, name);
      if (!lstatSync(file).isFile()) continue;
      const hash = createHash("sha256")
        .update(readFileSync(file))
        .digest("hex");
      byHash.set(hash, [...(byHash.get(hash) ?? []), name]);
    }
    for (const names of byHash.values()) {
      if (names.length < 2) continue;
      // Keep the most specific name (e.g. libicudata.68.2.dylib) as the file.
      const [real, ...copies] = names.sort((a, b) => b.length - a.length);
      for (const copy of copies) {
        unlinkSync(join(lib, copy));
        symlinkSync(real, join(lib, copy));
      }
    }
  }
}
writeFileSync(
  join(out, "package.json"),
  `${JSON.stringify(
    {
      name: "web-content-flow-desktop",
      productName: "Web Content Flow",
      version: JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
        .version,
      private: true,
      type: "module",
      main: "main.mjs",
    },
    null,
    2,
  )}\n`,
);

console.warn("5/5 manifest");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
let commit = "unknown";
try {
  commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
  }).trim();
} catch {}
writeFileSync(
  join(out, "manifest.json"),
  `${JSON.stringify(
    {
      app: "web-content-flow",
      version: pkg.version,
      commit,
      builtAt: new Date().toISOString(),
      node: pkg.engines.node,
      port,
      origin,
      entries: {
        web: "web/server.js",
        worker: "worker.mjs",
        maintenance: "maintenance.mjs",
        evaluate: "evaluate.mjs",
      },
      runtimeEnv: [
        `NEXT_PUBLIC_APP_URL=${origin}`,
        `AUTH_URL=${origin}`,
        "DATABASE_URL",
        "AUTH_SECRET",
        "RATE_LIMIT_SECRET",
        "DESKTOP_TOKEN",
        "APP_MODE=local",
        "APP_ENV=local",
        "DATABASE_ENVIRONMENT=local",
        "NODE_ENV=production",
        "HOSTNAME=127.0.0.1",
        `PORT=${port}`,
      ],
    },
    null,
    2,
  )}\n`,
);
console.warn(`Desktop build ready in ${out}`);
