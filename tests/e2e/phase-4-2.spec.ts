import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page, email = "demo@webcontentflow.local") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("UrbanStride-demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("opens Social setup, edits a post, copies fields, and filters Library", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/social");
  await expect(
    page.getByRole("heading", { name: "Social", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Content only — Web Content Flow does not publish or schedule Social posts.",
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Instagram city movement post/ })
    .click();
  await expect(page.getByRole("button", { name: "Copy item" })).toBeVisible();
  await page.getByRole("button", { name: "Copy hashtags" }).click();
  await expect(page.getByRole("status")).toHaveText("Hashtags copied.");
  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .getByLabel("Body")
    .fill("Fictional edited Social content for daily city movement.");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByRole("status")).toHaveText(/Version \d+ saved/);
  await page.getByRole("link", { name: "Library" }).first().click();
  await page.getByLabel("Module").selectOption("SOCIAL");
  await page.getByLabel("Social platform").selectOption("INSTAGRAM");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("Instagram city movement post")).toBeVisible();
});

test("reorders carousel slides with keyboard-operable controls", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/social/phase4-2-seed-instagram-carousel",
  );
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(
    page.getByRole("button", { name: "Move slide 1 down" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move slide 1 down" }).click();
  await expect(
    page.getByRole("button", { name: "Copy slide" }).first(),
  ).toBeVisible();
});

test("Social item route is neutral across users", async ({ page }) => {
  await signIn(page, "empty@webcontentflow.local");
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/social/phase4-2-seed-instagram-post",
  );
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("Social setup and editor remain usable at mobile width", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/social");
  await expect(page.getByLabel("Total quantity")).toBeVisible();
  await page
    .getByRole("link", { name: /Instagram city movement post/ })
    .click();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy hashtags" }),
  ).toBeVisible();
});
