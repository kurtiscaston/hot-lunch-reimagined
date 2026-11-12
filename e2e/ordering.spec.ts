import { expect, test } from "@playwright/test";

test("a household can order before the cutoff and not after it", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Times shown in Pacific Time (America/Vancouver).", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Household")).toBeVisible();

  const lockedDays = page.locator("article").filter({
    has: page.getByText("Locked", { exact: true }),
  });
  await expect(lockedDays).toHaveCount(1);
  const lockedDay = lockedDays.first();
  await expect(lockedDay.getByRole("button", { name: /Place order/ })).toHaveCount(0);

  await page.getByLabel("Household").selectOption({ label: "Brindle" });
  const openDay = page
    .locator("article")
    .filter({ has: page.getByText("Open", { exact: true }) })
    .first();
  const ada = openDay.getByRole("region", { name: "Ada Brindle" });
  await ada.getByRole("button", { name: "Place order for Ada" }).click();
  const ordered = ada.getByText(/^Ordered:/);
  await expect(ordered).toBeVisible();
  await expect(ordered).toBeFocused();
  await expect(ada.getByRole("button", { name: "Place order for Ada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Reset demo data" }).click();
  const adaAfterReset = page
    .locator("article")
    .filter({ has: page.getByText("Open", { exact: true }) })
    .first()
    .getByRole("region", { name: "Ada Brindle" });
  await expect(adaAfterReset.getByRole("button", { name: "Place order for Ada" })).toBeVisible();
  await expect(adaAfterReset.getByText(/Ordered:/)).toHaveCount(0);
});
