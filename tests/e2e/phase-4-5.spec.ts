import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page, email = "demo@webcontentflow.local") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("UrbanStride-demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("opens, copies, edits and filters structured General Copy", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/copy");
  await expect(
    page.getByRole("heading", { name: "General Copy" }),
  ).toBeVisible();
  await expect(page.getByText(/links are recorded as text/)).toBeVisible();
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/copy/phase4-5-copy-1",
  );
  await page.getByRole("button", { name: "Copy item" }).click();
  await expect(page.getByRole("status")).toContainText("copied");
  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .getByLabel("Opening")
    .fill("A practical next step for comfortable everyday city movement.");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByRole("status")).toHaveText(/Version \d+ saved/);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/library?module=COPY&copyType=MARKETING_EMAIL&copyPurpose=CONVERT",
  );
  await expect(
    page.getByText(/UrbanStride city footwear · marketing email/i),
  ).toBeVisible();
});

test("General Copy item route is neutral across users", async ({ page }) => {
  await signIn(page, "empty@webcontentflow.local");
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/copy/phase4-5-copy-1",
  );
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("General Copy editor remains functional at mobile width", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/copy/phase4-5-copy-1",
  );
  await expect(page.getByRole("button", { name: "Copy item" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Regenerate item" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});
