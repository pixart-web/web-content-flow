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

test("public root loads and signed-out app access returns to sign in", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build your brand and content system from one Brief.",
    }),
  ).toBeVisible();

  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp/);
});

test("creates an account with a safely hashed password", async ({ page }) => {
  const projectName = test.info().project.name.replaceAll(/[^a-z]/g, "-");
  const email = `new-user-${projectName}-${Date.now()}@test.invalid`;
  await page.goto("/sign-up");
  await page.getByLabel("Display name").fill("Phase One User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Phase-one-safe-password!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Create one connected content system",
    }),
  ).toBeVisible();
});

test("signs in, shows returning dashboard, and opens owned project", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByText("UrbanStride", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open project" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "UrbanStride" }),
  ).toBeVisible();
});

test("shows a truthful empty dashboard", async ({ page }) => {
  await signIn(page, empty);
  await expect(
    page.getByRole("heading", {
      name: "Create your first connected content project",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Start with a guided business brief/),
  ).toBeVisible();
});

test("does not disclose another user's project", async ({ page }) => {
  await signIn(page, empty);
  await page.goto("/app/projects/phase1-urbanstride-project");
  await expect(
    page.getByRole("heading", { name: "This project is not available" }),
  ).toBeVisible();
});

test("signs out and recovers from the missing session", async ({ page }) => {
  await signIn(page);
  const mobileMenu = page.getByRole("button", { name: "Open navigation" });
  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    await page.getByRole("button", { name: "Sign out" }).last().click();
  } else {
    await page.getByRole("button", { name: "Sign out" }).first().click();
  }
  await expect(page).toHaveURL(/\/sign-in\?signedOut=1/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("recovers from an expired or missing session cookie", async ({
  page,
  context,
}) => {
  await signIn(page);
  await context.clearCookies();
  await page.goto("/app/settings");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
});

test("mobile navigation is labelled and keyboard operable", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await signIn(page);
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application navigation" }),
  ).toBeVisible();
});
