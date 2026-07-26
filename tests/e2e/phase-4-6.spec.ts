import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page, email = "demo@webcontentflow.local") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("UrbanStride-demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("reviews, filters, copies and edits the seeded Calendar", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  await signIn(page);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/calendar?view=MONTH",
  );
  await expect(
    page.getByRole("heading", { name: "Content Calendar" }),
  ).toBeVisible();
  await expect(page.getByText(/no content was published/i)).toBeVisible();
  await expect(page.getByLabel("Month calendar")).toBeVisible();
  await page.getByLabel("Channel").selectOption("INSTAGRAM");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("Comfort for the city journey")).toBeVisible();

  await page.getByRole("link", { name: "Open structured editor" }).click();
  await page.getByRole("button", { name: "Copy complete Calendar" }).click();
  await expect(page.getByRole("status")).toContainText("copied");
  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .getByLabel("Strategy summary")
    .fill("A reviewed fictional editorial plan for UrbanStride.");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByRole("status")).toHaveText(/Version \d+ saved/);
});

test("Calendar item route is neutral across users", async ({ page }) => {
  await signIn(page, "empty@webcontentflow.local");
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/calendar/phase4-6-urbanstride-calendar",
  );
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("Calendar remains usable at mobile width", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  await page.goto(
    "/app/projects/phase1-urbanstride-project/content/calendar/phase4-6-urbanstride-calendar",
  );
  await expect(
    page.getByRole("button", { name: "Copy complete Calendar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Regenerate Calendar" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});
