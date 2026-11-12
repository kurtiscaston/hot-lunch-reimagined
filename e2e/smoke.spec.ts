import { expect, test } from "@playwright/test";

const disclaimer = "Unofficial concept, not affiliated with any school or PAC";

test("home loads and shows the disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Order lunch before the cutoff." }),
  ).toBeVisible();
  await expect(page.getByText(disclaimer)).toBeVisible();
  await expect(page.getByText("Demo only — not a sign-in")).toBeVisible();
});

test("volunteer page loads and shows the disclaimer", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { level: 1, name: "Volunteer workspace" }),
  ).toBeVisible();
  await expect(page.getByText(disclaimer)).toBeVisible();
});

test("demo role switcher moves between parent and volunteer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Parent" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Volunteer" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Volunteer workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Parent" }).click();
  await expect(page).toHaveURL("/");
});

test("disclaimer stays visible on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText(disclaimer)).toBeVisible();
  await expect(page.getByRole("button", { name: "Volunteer" })).toBeVisible();
});
