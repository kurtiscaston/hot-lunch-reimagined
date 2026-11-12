import { expect, type Locator, test } from "@playwright/test";

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("a household can order before the cutoff and not after it", async ({ page }) => {
  // Noon-ish Pacific Time. Frozen so a cutoff or Vancouver midnight cannot move mid-run.
  await page.clock.setFixedTime("2026-11-12T20:00:00.000Z");
  await page.goto("/");
  await expect(
    page.getByText("Times shown in Pacific Time (America/Vancouver).", { exact: true }),
  ).toBeVisible();
  const household = page.getByLabel("Household", { exact: true });
  await expect(household).toBeVisible();
  await expectTouchTarget(household);
  const reset = page.getByRole("button", { name: "Reset demo data" });
  await expectTouchTarget(reset);

  const lockedDays = page.locator("article").filter({
    has: page.getByText("Locked", { exact: true }),
  });
  await expect(lockedDays).toHaveCount(1);
  const lockedDay = lockedDays.first();
  await expect(lockedDay.getByRole("button", { name: /Place order/ })).toHaveCount(0);
  const lockNotices = page.locator("[aria-live=polite]");
  await expect(lockNotices).toHaveCount(4);
  await expect(lockNotices.filter({ hasText: /.+/ })).toHaveCount(0);

  await page.clock.setFixedTime(new Date(Date.parse("2026-11-12T20:00:00.000Z") + 90 * 60 * 1000));
  await page.clock.fastForward(1000);
  await expect(lockNotices.filter({ hasText: "is locked." })).toHaveCount(1);

  await page.getByLabel("Household", { exact: true }).selectOption({ label: "Brindle" });
  const openDay = page.locator("#day-open");
  const ada = openDay.getByRole("region", { name: "Ada Brindle" });
  await expectTouchTarget(ada.getByRole("button", { name: "Citrus chicken taco" }));
  await expectTouchTarget(ada.getByRole("button", { name: "Black bean taco" }));
  const placeOrder = ada.getByRole("button", { name: "Place order for Ada" });
  await expectTouchTarget(placeOrder);
  await placeOrder.click();
  const ordered = ada.getByText(/^Ordered:/);
  await expect(ordered).toBeVisible();
  await expect(ordered).toBeFocused();
  await expect(ada.getByRole("button", { name: "Place order for Ada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Reset demo data" }).click();
  const adaAfterReset = page.locator("#day-open").getByRole("region", { name: "Ada Brindle" });
  await expect(adaAfterReset.getByRole("button", { name: "Place order for Ada" })).toBeVisible();
  await expect(adaAfterReset.getByText(/Ordered:/)).toHaveCount(0);
});
