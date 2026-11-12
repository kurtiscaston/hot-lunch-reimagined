import { readFileSync } from "node:fs";

import { expect, type Locator, test } from "@playwright/test";

import { reconcileHouseholds, vendorTotals } from "../src/lib/domain/dashboard";
import { createSeed } from "../src/lib/domain/seed";
import { formatPrice } from "../src/lib/domain/time-zone";

const FROZEN_AT = "2026-11-12T20:00:00.000Z";

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("a volunteer can total orders, reconcile payments, and export CSV", async ({ page }) => {
  const now = new Date(FROZEN_AT);
  const snapshot = createSeed(now);
  const vendors = vendorTotals(snapshot);
  const balances = reconcileHouseholds(snapshot);
  const brindle = balances.find((row) => row.householdId === "hh-brindle");
  const firstVendor = vendors[0];
  expect(brindle).toBeDefined();
  expect(firstVendor).toBeDefined();

  await page.clock.setFixedTime(FROZEN_AT);
  await page.goto("/admin");

  const board = page.getByRole("region", { name: "Volunteer totals" });
  await expect(board.getByRole("heading", { name: "By vendor" })).toBeVisible();
  await expect(board.getByText(firstVendor?.label ?? "")).toBeVisible();
  await expect(board.getByText(formatPrice(firstVendor?.cents ?? 0)).first()).toBeVisible();
  await expect(board.getByRole("heading", { name: "Reconciliation" })).toBeVisible();
  await expect(board.getByText("Brindle").first()).toBeVisible();
  await expect(board.getByText("Paid", { exact: true }).first()).toBeVisible();
  await expect(board.getByText("Short", { exact: true }).first()).toBeVisible();
  await expect(board.getByText("Credit", { exact: true }).first()).toBeVisible();
  await expect(board.getByText(`Paid ${formatPrice(brindle?.paidCents ?? 0)}`).first()).toBeVisible();
  await expect(board.getByRole("heading", { name: "No order yet" })).toBeVisible();
  await expect(board.getByText("Ada Brindle, Kindergarten").first()).toBeVisible();

  const exportOrders = board.getByRole("button", { name: "Export orders" });
  await expectTouchTarget(exportOrders);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportOrders.click(),
  ]);
  expect(download.suggestedFilename()).toBe("maple-hollow-orders.csv");
  const csvPath = await download.path();
  expect(csvPath).toBeTruthy();
  const csv = readFileSync(csvPath ?? "", "utf8");
  expect(csv.startsWith("Household,Student,Day,Vendor,Meal,Price,Placed at\r\n")).toBe(true);
  expect(csv).toContain("Brindle");
  expect(csv).not.toContain("prior-");
});
