import { expect, test } from "@playwright/test";

test("a household can order before the cutoff and not after it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Pacific Time (America/Vancouver)")).toBeVisible();
  await expect(page.getByLabel("Household")).toBeVisible();

  const lockedDay = page.locator("article").filter({ hasText: "Ordering locked" });
  await expect(lockedDay).toBeVisible();
  await expect(lockedDay.getByRole("button", { name: /Place order/ })).toHaveCount(0);

  await page.getByLabel("Household").selectOption({ label: "Brindle" });
  const openDay = page.locator("article").filter({ hasText: "Open" }).first();
  const ada = openDay.getByRole("region", { name: "Ada Brindle" });
  await ada.getByRole("button", { name: "Place order for Ada" }).click();
  await expect(ada.getByText(/Ordered:/)).toBeVisible();
  await expect(ada.getByRole("button", { name: "Place order for Ada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Reset demo data" }).click();
  const adaAfterReset = page
    .locator("article")
    .filter({ hasText: "Open" })
    .first()
    .getByRole("region", { name: "Ada Brindle" });
  await expect(adaAfterReset.getByRole("button", { name: "Place order for Ada" })).toBeVisible();
  await expect(adaAfterReset.getByText(/Ordered:/)).toHaveCount(0);
});
