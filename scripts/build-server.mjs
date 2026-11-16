// L7: builds the private-server edition (APP_MODE=server) into dist/server/:
//   web/            Next.js standalone server (server.js + .next/static + public)
//   worker.mjs, maintenance.mjs, migrate.mjs (bundled, no tsx/Prisma CLI)
//   migrations/     prisma/migrations
// NEXT_PUBLIC_APP_URL is compiled into the client: pass the server's public
// https URL as APP_URL. Secrets are runtime-only; the build uses placeholders.
// Usage: APP_URL=https://wcf.example.com node scripts/build-server.mjs
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { build } from "esbuild";

const appUrl = process.env.APP_URL;
if (!appUrl || !appUrl.startsWith("https://"))
  throw new Error("APP_URL must be the server's public https:// URL.");

const root = process.cwd();
const out = join(root, "dist", "server");
const placeholder = "build-time-placeholder-not-used-at-runtime-0000";
const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_OUTPUT: "standalone",
  APP_MODE: "server",
  APP_ENV: "production",
  DATABASE_ENVIRONMENT: "production",
  NEXT_PUBLIC_APP_URL: appUrl,
  AUTH_URL: appUrl,
  AUTH_SECRET: placeholder,
  RATE_LIMIT_SECRET: placeholder,
  DATABASE_URL: "postgresql://placeholder:placeholder@127.0.0.1:1/placeholder",
  EMAIL_PROVIDER: "SMTP",
  SMTP_HOST: "smtp.placeholder.invalid",
  SMTP_USER: "placeholder",
  SMTP_PASSWORD: placeholder,
  AI_REAL_GENERATION_ENABLED: "false",
  AI_FAKE_OPENAI_ENABLED: "false",
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

console.warn("1/3 next build (standalone)");
execFileSync("pnpm", ["exec", "next", "build"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js")))
  throw new Error("next build did not produce .next/standalone/server.js");
cpSync(standalone, join(out, "web"), {
  recursive: true,
  verbatimSymlinks: true,
});
cpSync(join(root, ".next", "static"), join(out, "web", ".next", "static"), {
  recursive: true,
});
cpSync(join(root, "public"), join(out, "web", "public"), { recursive: true });
rmSync(join(out, "web", ".env"), { force: true });

console.warn("2/3 bundle worker, maintenance and migrations");
await build({
  entryPoints: {
    worker: join(root, "scripts", "run-worker.ts"),
    maintenance: join(root, "scripts", "run-maintenance.ts"),
    migrate: join(root, "scripts", "migrate.ts"),
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

console.warn("3/3 migrations");
cpSync(join(root, "prisma", "migrations"), join(out, "migrations"), {
  recursive: true,
});
console.warn(`Server build ready in ${out}`);
