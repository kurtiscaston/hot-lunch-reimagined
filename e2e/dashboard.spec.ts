import { readFileSync } from "node:fs";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { unorderedStudents } from "../src/lib/domain/dashboard";
import { DEMO_NOW } from "../src/lib/domain/demo-now";
import { createSeed } from "../src/lib/domain/seed";

const missingLabels = [
  ...new Set(
    unorderedStudents(createSeed(DEMO_NOW), DEMO_NOW).map(
      (row) => `${row.name}, ${row.gradeLabel}`,
    ),
  ),
];

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

async function readDownload(page: Page, name: string) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("maple-hollow-orders.csv");
  const csvPath = await download.path();
  expect(csvPath).toBeTruthy();
  return readFileSync(csvPath ?? "", "utf8");
}

test("a volunteer can total orders, reconcile payments, and export CSV", async ({ page }) => {
  expect(missingLabels.length).toBeGreaterThan(0);

  await page.clock.setFixedTime(DEMO_NOW.toISOString());
  await page.goto("/admin");

  for (const id of ["totals", "payments", "missing", "outbox", "year"]) {
    const margin = await page.locator(`#${id}`).evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).scrollMarginTop),
    );
    expect(margin).toBeGreaterThanOrEqual(72);
  }

  const board = page.getByRole("region", { name: "Volunteer totals" });
  await expect(board.getByRole("heading", { name: "By vendor" })).toBeVisible();
  await expect(board.getByText("Lantern Taco Cart")).toBeVisible();
  await expect(board.getByRole("heading", { name: "Reconciliation" })).toBeVisible();
  await expect(board.getByText("Brindle").first()).toBeVisible();
  await expect(board.getByText("Paid", { exact: true }).first()).toBeVisible();
  await expect(board.getByText("Short", { exact: true }).first()).toBeVisible();
  await expect(board.getByText("Credit", { exact: true }).first()).toBeVisible();
  await expect(board.getByText(/\+\$/).first()).toBeVisible();
  await expect(board.getByRole("heading", { name: "No order yet" })).toBeVisible();
  for (const label of missingLabels) {
    await expect(board.getByText(label).first()).toBeVisible();
  }

  const exportOrders = page.getByRole("button", { name: "Export orders" });
  await expectTouchTarget(exportOrders);
  const before = await readDownload(page, "Export orders");
  expect(before.startsWith("\uFEFFHousehold,Student,Day,Vendor,Meal,Price,Placed at\r\n")).toBe(
    true,
  );
  expect(before).toContain("Ada Brindle");
  expect(before).toContain("Moss Hearthwell");

  await page.getByRole("button", { name: "Preview rollover" }).click();
  await page.getByRole("button", { name: "Apply rollover" }).click();
  await expect(page.getByText("2027–2028 is the current school year.")).toBeVisible();

  const after = await readDownload(page, "Export orders");
  expect(after.startsWith("\uFEFFHousehold,Student,Day,Vendor,Meal,Price,Placed at\r\n")).toBe(
    true,
  );
  expect(after).not.toContain("Moss Hearthwell");
});
