import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page, email = "demo@webcontentflow.local") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("UrbanStride-demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("opens, copies, edits and filters Video planning content", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/video");
  await expect(
    page.getByRole("heading", { name: "Video & Reels" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Planning content only — no video, audio or images/),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /UrbanStride 30-second Reel script/ })
    .click();
  await page.getByRole("button", { name: "Copy title" }).click();
  await expect(page.getByRole("status")).toContainText("copied");
  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .getByLabel("Concept summary")
    .fill("A practical city journey centred on everyday comfort.");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByRole("status")).toHaveText(/Version \d+ saved/);
  await page.getByRole("link", { name: "Library" }).first().click();
  await page.getByLabel("Module").selectOption("VIDEO");
  await page.getByLabel("Video platform").selectOption("INSTAGRAM_REELS");
  await page.getByLabel("Video type").selectOption("VIDEO_SCRIPT");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByText("UrbanStride 30-second Reel script"),
  ).toBeVisible();
});

test("Video route is neutral across users", async ({ page }) => {
  await signIn(page, "empty@webcontentflow.local");
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/video/phase4-4-seed-video-script",
  );
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("Video editor remains functional at mobile width", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/video/phase4-4-seed-video-script",
  );
  await expect(page.getByRole("button", { name: "Copy item" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Regenerate scene" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});
