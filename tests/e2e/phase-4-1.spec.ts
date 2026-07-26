import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page, email = "demo@webcontentflow.local") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("UrbanStride-demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("opens Website setup, page content, copy, edit, and versions", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/website");
  await expect(
    page.getByRole("heading", { name: "Website", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Copy only — Web Content Flow does not build or publish the website.",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: /Home/ }).click();
  await expect(page.getByRole("button", { name: "Copy page" })).toBeVisible();
  await page.getByRole("button", { name: "Copy section" }).first().click();
  await expect(page.getByRole("status")).toHaveText(/Section .* copied/);
  await page.getByRole("button", { name: "Edit page" }).click();
  await expect(page.getByLabel("Page name")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save new version" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Version history" }),
  ).toBeVisible();
});

test("Website route is neutral across users", async ({ page }) => {
  await signIn(page, "empty@webcontentflow.local");
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/website/phase4-urbanstride-home",
  );
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("Website setup and page editor remain usable at mobile width", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  await page.goto("/app/projects/phase1-urbanstride-project/content/website");
  await expect(page.getByLabel("Website objective")).toBeVisible();
  await page.getByRole("link", { name: /Home/ }).click();
  await expect(page.getByRole("button", { name: "Edit page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy page" })).toBeVisible();
});
