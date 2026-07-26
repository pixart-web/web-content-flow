import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page, email = "demo@webcontentflow.local") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("UrbanStride-demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("opens Ads assets, compares variants, edits, copies and filters Library", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/ads");
  await expect(
    page.getByRole("heading", { name: "Ads & Creative" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Content only — Web Content Flow does not launch or manage advertising campaigns.",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: /UrbanStride Instagram ad/ }).click();
  await expect(
    page.getByText(
      "Compare editorial alternatives. Performance is not predicted.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy Variant A" }).click();
  await expect(page.getByRole("status")).toHaveText("Variant A copied.");
  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .getByLabel("Headline")
    .first()
    .fill("Comfort designed for every city journey");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByRole("status")).toHaveText(/Version \d+ saved/);
  await page.getByRole("link", { name: "Library" }).first().click();
  await page.getByLabel("Module").selectOption("ADS");
  await page.getByLabel("Ads channel").selectOption("META_INSTAGRAM");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("UrbanStride Instagram ad")).toBeVisible();
});

test("image prompt pack states its boundary and copies a prompt", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/ads/phase4-3-seed-image-prompt-pack",
  );
  await expect(
    page.getByText("Prompt pack only — no image was generated."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy prompt" }).first().click();
  await expect(page.getByRole("status")).toHaveText("Prompt 1 copied.");
});

test("Ads item route is neutral across users", async ({ page }) => {
  await signIn(page, "empty@webcontentflow.local");
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/ads/phase4-3-seed-meta-instagram-ad",
  );
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("Ads setup and variant comparison remain usable at mobile width", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/ads");
  await expect(page.getByLabel("Campaign objective")).toBeVisible();
  await page.getByRole("link", { name: /UrbanStride Instagram ad/ }).click();
  await expect(
    page.getByRole("button", { name: "Copy Variant A" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});
