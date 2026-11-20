import { defineConfig } from "@playwright/test";

// LF-21: end-to-end tests against the built desktop app (pnpm build:desktop
// first). No web server and no browser download: Playwright drives Electron.
export default defineConfig({
  testDir: "./tests/desktop-e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { trace: "retain-on-failure" },
});
