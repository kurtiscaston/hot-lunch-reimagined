import { expect, type Locator, test } from "@playwright/test";

import { menuDayStatus } from "../src/lib/domain/cutoff";
import { createSeed, MENU_DAY_IDS } from "../src/lib/domain/seed";
import { zonedDate } from "../src/lib/domain/time-zone";

/** Frozen instant. Day counts and the next cutoff come from createSeed in src/lib/domain/seed.ts. */
const FROZEN_AT = "2026-11-12T20:00:00.000Z";

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("a household can order before the cutoff and not after it", async ({ page }) => {
  const now = new Date(FROZEN_AT);
  const seed = createSeed(now);
  const lockedCount = seed.menuDays.filter(
    (day) => menuDayStatus(day.cutoffAt, now) === "locked",
  ).length;
  const nextCutoff = [...seed.menuDays]
    .filter((day) => menuDayStatus(day.cutoffAt, now) !== "locked")
    .sort((left, right) => left.cutoffAt.localeCompare(right.cutoffAt))[0];
  const openDaySeed = seed.menuDays.find((day) => day.id === MENU_DAY_IDS.open);
  if (!nextCutoff || !openDaySeed) {
    throw new Error("Seed is missing an upcoming cutoff or the open day");
  }
  expect(zonedDate(new Date(nextCutoff.cutoffAt))).toBe(zonedDate(now));
  const meals = openDaySeed.itemIds.map((itemId) => {
    const item = seed.menuItems.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error(`Seed is missing ${itemId}`);
    }
    return item.name;
  });
  const crossing = seed.menuDays.filter(
    (day) =>
      menuDayStatus(day.cutoffAt, now) !== "locked" &&
      Date.parse(day.cutoffAt) <= Date.parse(nextCutoff.cutoffAt),
  ).length;

  // Frozen so a cutoff or Vancouver midnight cannot move mid-run.
  await page.clock.setFixedTime(FROZEN_AT);
  await page.goto("/orders");
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
  await expect(lockedDays).toHaveCount(lockedCount);
  const lockedDay = lockedDays.first();
  await expect(lockedDay.getByRole("button", { name: /Place order/ })).toHaveCount(0);
  const lockNotices = page.locator("[aria-live=polite]");
  await expect(lockNotices).toHaveCount(seed.menuDays.length);
  await expect(lockNotices.filter({ hasText: /.+/ })).toHaveCount(0);

  await page.clock.setFixedTime(new Date(nextCutoff.cutoffAt));
  await page.clock.fastForward(1000);
  await expect(lockNotices.filter({ hasText: "is locked." })).toHaveCount(crossing);

  await page.getByLabel("Household", { exact: true }).selectOption({ label: "Brindle" });
  const openDay = page.locator(`#${MENU_DAY_IDS.open}`);
  const ada = openDay.getByRole("region", { name: "Ada Brindle" });
  for (const meal of meals) {
    await expectTouchTarget(ada.getByRole("button", { name: meal }));
  }
  const placeOrder = ada.getByRole("button", { name: "Place order for Ada" });
  await expectTouchTarget(placeOrder);
  await placeOrder.click();
  const ordered = ada.getByText(/^Ordered:/);
  await expect(ordered).toBeVisible();
  await expect(ordered).toBeFocused();
  await expect(ada.getByRole("button", { name: "Place order for Ada" })).toHaveCount(0);

  page.once("dialog", (dialog) => {
    void dialog.dismiss();
  });
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(ordered).toBeVisible();

  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await page.getByRole("button", { name: "Reset demo data" }).click();
  const adaAfterReset = page
    .locator(`#${MENU_DAY_IDS.open}`)
    .getByRole("region", { name: "Ada Brindle" });
  await expect(adaAfterReset.getByRole("button", { name: "Place order for Ada" })).toBeVisible();
  await expect(adaAfterReset.getByText(/Ordered:/)).toHaveCount(0);
});
