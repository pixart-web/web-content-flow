import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const demo = {
  email: "demo@webcontentflow.local",
  password: "UrbanStride-demo-2026!",
};
const empty = {
  email: "empty@webcontentflow.local",
  password: "UrbanStride-demo-2026!",
};

async function signIn(page: Page, account = demo) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("edits, regenerates, restores, and discovers shared content", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/copy/phase3-urbanstride-foundation-copy",
  );
  await expect(
    page.getByText("Foundation content · platform proof"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy headline" }).click();
  await expect(page.getByRole("status")).toHaveText(/Headline copied/);

  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .getByLabel("Headline")
    .fill("Comfort for every fictional city journey");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByRole("status")).toHaveText(/Version \d+ saved/);
  await expect(
    page.getByText("Comfort for every fictional city journey"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Regenerate item" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Regeneration queued. Previous version retained.",
  );
  await expect(page.getByText(/Mock content job/)).toBeVisible();
  await expect(page.getByText(/Version history/)).toBeVisible();
  await expect(page.getByText(/regenerated/).first()).toBeVisible({
    timeout: 15_000,
  });

  const restore = page
    .getByRole("button", { name: "Restore as new version" })
    .first();
  page.once("dialog", (dialog) => dialog.accept());
  await restore.click();
  await expect(page.getByRole("status")).toHaveText(/Restored as version/);

  await page.getByRole("link", { name: "Library" }).first().click();
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByText("UrbanStride foundation copy")).toBeVisible();
  await page.getByLabel("Search").fill("does-not-match");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "No content matches these filters" }),
  ).toBeVisible();
});

test("content route is neutral for another user", async ({ page }) => {
  await signIn(page, empty);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/copy/phase3-urbanstride-foundation-copy",
  );
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("mobile Library and structured editor remain usable", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/library");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await page
    .locator("article")
    .filter({ hasText: "UrbanStride foundation copy" })
    .getByRole("link", { name: "Open content" })
    .click();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Body")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save new version" }),
  ).toBeVisible();
});
