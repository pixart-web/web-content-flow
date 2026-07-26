import { expect, test } from "@playwright/test";

test("creates a project, resumes durable generation, and reviews the mock Brand Profile", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium");
  const email = `phase-two-${Date.now()}@test.invalid`;
  await page.goto("/sign-up");
  await page.getByLabel("Display name").fill("Phase Two User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Phase-two-safe-password!");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Create first project" }).click();

  await page.getByLabel("Project name").fill("UrbanStride Launch");
  await page.getByLabel("Brand name").fill("UrbanStride");
  await page
    .getByLabel("Business description")
    .fill("A fictional online footwear business for urban commuters.");
  await page
    .getByLabel("Product or service")
    .fill("Comfortable walking shoes designed for daily city use.");
  await page.getByRole("button", { name: "Continue" }).click();

  await page
    .getByLabel("Target audience")
    .fill("Urban professionals who walk or commute daily");
  await page
    .getByLabel("Customer problem")
    .fill("Daily footwear is uncomfortable or visually generic.");
  await page
    .getByLabel("Value proposition")
    .fill("Comfort and considered design for every city journey.");
  await page.getByRole("button", { name: "Continue" }).click();

  await page
    .getByLabel("Primary objective")
    .fill("Launch the first direct-to-consumer collection");
  await page
    .getByLabel("Desired customer action")
    .fill("Explore the collection");
  await page
    .getByLabel("Primary offer")
    .fill("Versatile city shoes with all-day comfort");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Tone of voice").fill("Clear, confident, practical");
  await page.getByLabel("Visual style").fill("Editorial and structured");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Output language").fill("English");
  await page.getByLabel("WEBSITE").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("button", {
      name: "Create project and generate Brand Profile",
    })
    .click();

  await expect(page).toHaveURL(/\/app\/projects\/[^/]+$/);
  await expect(
    page.getByText("Mock mode", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review Brand Profile" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: "Review Brand Profile" }).click();
  await expect(page.getByText("Mock-generated")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Brand summary" }),
  ).toBeVisible();
  await expect(page.getByText(/UrbanStride provides/)).toBeVisible();
  await page.getByRole("link", { name: "Overview" }).click();
  await page.getByRole("button", { name: "Generate foundation copy" }).click();
  await expect(page.getByText(/generation queued/)).toBeVisible();
  await page.getByRole("link", { name: "Open Library" }).click();
  await expect(page.getByRole("link", { name: "Open content" })).toBeVisible({
    timeout: 15_000,
  });
});
