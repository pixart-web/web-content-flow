import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from "@playwright/test";

import { writeOfflineGuard } from "./offline-guard";

// LF-21: end-to-end test of the desktop edition. It launches the same
// dist/desktop bundle the installers package (pnpm build:desktop first), with
// a throwaway data directory and an offline guard that refuses every
// connection leaving this computer, and walks the owner journey across two
// launches: set up the computer, create a project, generate with the mock
// provider through the worker, export the workspace, quit, reopen.

const root = process.cwd();
const electronBinary = join(
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
// Linux CI runs under xvfb without a GPU or the setuid sandbox. On macOS the
// test uses Chromium's mock keychain: the real Keychain would ask the person
// at the computer for access and block the launch.
const extraArgs = [
  ...(process.platform === "darwin" ? ["--use-mock-keychain"] : []),
  ...(process.env.WCF_DESKTOP_E2E_ARGS ?? "").split(" ").filter(Boolean),
];
const owner = {
  name: "Desktop Owner",
  email: "owner@desktop.test",
  password: "Desktop-e2e-password-2026!",
};
// Sentinels the test sends itself to prove the guard is active.
const PROBE_HOST = "offline-probe.invalid";

const dataDir = mkdtempSync(join(tmpdir(), "wcf-desktop-e2e-"));
const userData = join(dataDir, "user-data");
const guard = writeOfflineGuard(dataDir);
const desktopLog = () =>
  readFileSync(join(userData, "logs", "desktop.log"), "utf8");
const lines = (file: string) =>
  existsSync(file)
    ? readFileSync(file, "utf8").split("\n").filter(Boolean)
    : [];

async function launch() {
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [
      join(root, "dist", "desktop"),
      `--user-data-dir=${userData}`,
      ...extraArgs,
    ],
    env: { ...process.env, WCF_DESKTOP_OFFLINE_GUARD: guard.file },
    timeout: 60_000,
  });
  const window = await app.firstWindow();
  await window.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\//, { timeout: 240_000 });
  return { app, window };
}

async function quit(app: ElectronApplication) {
  await app.close();
}

async function createProject(page: Page) {
  await page.getByRole("button", { name: "Create first project" }).click();
  await page.getByLabel("Project name").fill("Desktop Launch");
  await page.getByLabel("Brand name").fill("UrbanStride");
  await page
    .getByLabel("Business description")
    .fill("A fictional online footwear business for urban commuters.");
  await page
    .getByLabel("Product or service")
    .fill("Comfortable walking shoes designed for daily city use.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Target audience")
    .fill("Urban professionals who walk or commute daily");
  await page
    .getByLabel("Customer problem")
    .fill("Daily footwear is uncomfortable or visually generic.");
  await page
    .getByLabel("Value proposition")
    .fill("Comfort and considered design for every city journey.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Primary objective")
    .fill("Launch the first direct-to-consumer collection");
  await page
    .getByLabel("Desired customer action")
    .fill("Explore the collection");
  await page
    .getByLabel("Primary offer")
    .fill("Versatile city shoes with all-day comfort");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Tone of voice").fill("Clear, confident, practical");
  await page.getByLabel("Visual style").fill("Editorial and structured");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Output language").fill("English");
  await page.getByLabel("WEBSITE").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("button", { name: "Create project and generate Brand Profile" })
    .click();
}

test("desktop edition works end to end without leaving this computer", async () => {
  test.setTimeout(12 * 60_000);

  await test.step("first launch: set up this computer", async () => {
    const { app, window } = await launch();
    await expect(window).toHaveURL(/\/sign-up/);
    await expect(
      window.getByRole("heading", { level: 1, name: "Set up this computer" }),
    ).toBeVisible();
    await window.getByLabel("Display name").fill(owner.name);
    await window.getByLabel("Email").fill(owner.email);
    await window.getByLabel("Password").fill(owner.password);
    await window.getByRole("button", { name: "Create account" }).click();
    await expect(window).toHaveURL(/\/app\/onboarding$/);

    await test.step("project and mock generation through the worker", async () => {
      await createProject(window);
      await expect(window).toHaveURL(/\/app\/projects\/[^/]+$/);
      await expect(
        window.getByRole("link", { name: "Review Brand Profile" }),
      ).toBeVisible({ timeout: 60_000 });
      await window.getByRole("link", { name: "Review Brand Profile" }).click();
      await expect(
        window.getByRole("heading", { name: "Brand summary" }),
      ).toBeVisible();
      await window.getByRole("link", { name: "Overview" }).click();
      await window
        .getByRole("button", { name: "Generate foundation copy" })
        .click();
      await window.getByRole("link", { name: "Open Library" }).click();
      await expect(
        window.getByRole("link", { name: "Open content" }).first(),
      ).toBeVisible({ timeout: 60_000 });
    });

    await test.step("workspace package export", async () => {
      // The export waits for every job to finish (409 while one is active).
      const exportOnce = () =>
        window.evaluate(async () => {
          const response = await fetch("/api/workspace/package", {
            method: "POST",
          });
          return {
            status: response.status,
            type: response.headers.get("content-type"),
            size: (await response.arrayBuffer()).byteLength,
          };
        });
      let result = await exportOnce();
      await expect
        .poll(
          async () => {
            result = await exportOnce();
            return result.status;
          },
          { timeout: 120_000, intervals: [2_000] },
        )
        .toBe(200);
      expect(result.status).toBe(200);
      expect(result.type).toBe("application/gzip");
      expect(result.size).toBeGreaterThan(500);
    });

    await test.step("the offline guard is active", async () => {
      // Window: a request elsewhere is cancelled by the shell.
      const windowProbe = await window.evaluate(
        (host) =>
          fetch(`https://${host}/`).then(
            () => "reached",
            () => "refused",
          ),
        PROBE_HOST,
      );
      expect(windowProbe).toBe("refused");
      // Main process: the guard refuses the lookup.
      const mainProbe = await app.evaluate(
        (_electron, host) =>
          fetch(`https://${host}/`).then(
            () => "reached",
            () => "refused",
          ),
        PROBE_HOST,
      );
      expect(mainProbe).toBe("refused");
      // The page's CSP may refuse the fetch above before the shell sees it;
      // a navigation in the same session proves the shell's filter itself.
      const navigationProbe = await app.evaluate(
        async ({ BrowserWindow }, host) => {
          const probe = new BrowserWindow({ show: false });
          try {
            await probe.loadURL(`https://${host}/`);
            return "reached";
          } catch {
            return "refused";
          } finally {
            probe.destroy();
          }
        },
        PROBE_HOST,
      );
      expect(navigationProbe).toBe("refused");
      expect(desktopLog()).toContain(
        `Offline guard blocked (window): https://${PROBE_HOST}/`,
      );
      expect(lines(guard.blockedLog).join("\n")).toContain(PROBE_HOST);
    });

    await quit(app);
    expect(desktopLog()).toContain("First run: secrets created.");
    expect(desktopLog()).toContain("Stopped cleanly.");
  });

  await test.step("second launch: same data, nothing to migrate", async () => {
    const { app, window } = await launch();
    if (/\/sign-in/.test(window.url())) {
      await window.getByLabel("Email").fill(owner.email);
      await window.getByLabel("Password").fill(owner.password);
      await window.getByRole("button", { name: "Sign in" }).click();
    }
    await expect(window).toHaveURL(/\/app$/);
    await expect(
      window.getByText("UrbanStride", { exact: true }).first(),
    ).toBeVisible();
    await window.getByRole("link", { name: "Open project" }).first().click();
    await expect(
      window.getByRole("heading", { level: 1, name: "Desktop Launch" }),
    ).toBeVisible();
    await quit(app);
    expect(desktopLog()).toContain("Secrets loaded.");
    expect(desktopLog()).toMatch(/migrations applied now: 0;/);
    expect(desktopLog().match(/Stopped cleanly\./g)?.length).toBe(2);
  });

  await test.step("no connection left this computer", () => {
    // Every process loaded the guard: shell, web server, worker, maintenance.
    const loaded = lines(guard.loadedLog).join("\n");
    for (const entry of ["main", "wcf-web", "wcf-worker", "wcf-maintenance"])
      expect(loaded).toContain(entry);
    const blocked = lines(guard.blockedLog).filter(
      (line) => !line.includes(PROBE_HOST),
    );
    const windowBlocked = desktopLog()
      .split("\n")
      .filter(
        (line) =>
          line.includes("Offline guard blocked") && !line.includes(PROBE_HOST),
      );
    expect([...blocked, ...windowBlocked]).toEqual([]);
  });
});
