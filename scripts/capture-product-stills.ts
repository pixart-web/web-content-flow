import { chromium, type Page } from "@playwright/test";

const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
const output = "public/marketing/product/stills";
const projectId = "phase1-urbanstride-project";
const password = "UrbanStride-demo-2026!";

const routes = [
  ["hero-flow-demo", `/app/projects/${projectId}`],
  ["brief-to-brand", `/app/projects/${projectId}/brand-profile`],
  ["website-generation", `/app/projects/${projectId}/content/website`],
  ["social-studio", `/app/projects/${projectId}/content/social`],
  ["ads-creative", `/app/projects/${projectId}/content/ads`],
  ["video-scripts", `/app/projects/${projectId}/content/video`],
  ["calendar-planning", `/app/projects/${projectId}/content/calendar`],
  ["library-export", `/app/projects/${projectId}/library`],
] as const;

async function signIn(page: Page) {
  await page.goto(`${baseUrl}/sign-in`);
  await page.getByLabel("Email").fill("capture@webcontentflow.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app/);
}

async function prepareFrame(page: Page) {
  await page
    .getByText("capture@webcontentflow.local", { exact: true })
    .evaluateAll((elements) => {
      for (const element of elements)
        (element as HTMLElement).style.visibility = "hidden";
    });
}

async function main() {
  const browser = await chromium.launch();
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await desktop.newPage();
    await signIn(page);
    for (const [name, route] of routes) {
      await page.goto(`${baseUrl}${route}`);
      await page.waitForLoadState("networkidle");
      await prepareFrame(page);
      await page.screenshot({
        path: `${output}/${name}.png`,
        fullPage: false,
      });
    }
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const mobilePage = await mobile.newPage();
    await signIn(mobilePage);
    for (const [name, route] of routes) {
      await mobilePage.goto(`${baseUrl}${route}`);
      await mobilePage.waitForLoadState("networkidle");
      await prepareFrame(mobilePage);
      await mobilePage.screenshot({
        path: `${output}/${name}-mobile.png`,
        fullPage: false,
      });
    }
    await mobile.close();
  } finally {
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Product capture failed."}\n`,
  );
  process.exitCode = 1;
});
