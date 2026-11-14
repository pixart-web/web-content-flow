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

console.warn("1/4 next build (standalone)");
execFileSync("pnpm", ["exec", "next", "build"], { stdio: "inherit", env });
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js")))
  throw new Error("next build did not produce .next/standalone/server.js");

console.warn("2/4 assemble web/");
cpSync(standalone, join(out, "web"), {
  recursive: true,
  verbatimSymlinks: true,
});
cpSync(join(root, ".next", "static"), join(out, "web", ".next", "static"), {
  recursive: true,
});
cpSync(join(root, "public"), join(out, "web", "public"), { recursive: true });
rmSync(join(out, "web", ".env"), { force: true });

console.warn("3/4 bundle worker and maintenance");
await build({
  entryPoints: {
    worker: join(root, "scripts", "run-worker.ts"),
    maintenance: join(root, "scripts", "run-maintenance.ts"),
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
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "warning",
});

console.warn("4/4 manifest");
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
