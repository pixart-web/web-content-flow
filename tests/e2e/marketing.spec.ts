import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("marketing website", () => {
  test("explains the product and exposes truthful conversion paths", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "From one brief to your entire content system.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Join the private beta" }).first(),
    ).toHaveAttribute("href", "/contact");
    await page.goto("/product");
    await expect(page).toHaveURL(/\/product$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("mobile menu is keyboard accessible at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto("/");
    const menu = page.getByText("Menu", { exact: true });
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("homepage has no automated accessibility violations", async ({
    page,
  }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("contact form exposes labelled bounded fields", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByLabel("Work email")).toHaveAttribute(
      "type",
      "email",
    );
    await expect(page.getByLabel("Primary content challenge")).toHaveAttribute(
      "maxlength",
      "1000",
    );
    await expect(
      page.getByRole("button", { name: "Request early access" }),
    ).toBeVisible();
  });

  test("legal routes are available and state factual boundaries", async ({
    page,
  }) => {
    const boundaries = {
      privacy: /require review/i,
      terms: /content drafts/i,
      cookies: /analytics remains inactive/i,
    } as const;
    for (const [route, boundary] of Object.entries(boundaries)) {
      const response = await page.goto(`/legal/${route}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByText(boundary).first()).toBeVisible();
    }
  });

  test("security page distinguishes implemented controls from operations", async ({
    page,
  }) => {
    await page.goto("/security");
    await expect(
      page.getByRole("heading", { level: 1, name: /clear controls/i }),
    ).toBeVisible();
    await expect(page.getByText(/argon2id/i)).toBeVisible();
    await expect(page.getByText(/unverified/i).first()).toBeVisible();
    await expect(page.getByText(/soc 2/i)).toHaveCount(0);
  });

  test("unknown marketing route uses the not-found boundary", async ({
    page,
  }) => {
    const response = await page.goto("/product/not-a-module");
    expect(response?.status()).toBe(404);
  });
});
