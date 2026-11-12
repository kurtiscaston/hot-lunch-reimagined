import { expect, type Locator, test } from "@playwright/test";

import { dueReminders } from "../src/lib/domain/reminders";
import { createSeed } from "../src/lib/domain/seed";

const FROZEN_AT = "2026-11-12T20:00:00.000Z";

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("mock reminders land in the volunteer outbox", async ({ page }) => {
  const now = new Date(FROZEN_AT);
  await page.clock.setFixedTime(FROZEN_AT);
  const due = dueReminders(createSeed(now), now);

  await page.goto("/admin");
  const outbox = page.getByRole("region", { name: "Mock outbox" });
  await expect(outbox.getByRole("heading", { name: "Mock outbox" })).toBeVisible();
  await expect(outbox.getByRole("listitem")).toHaveCount(due.length);
  await expect(outbox.getByText("No message was sent.").first()).toBeVisible();
  await expect(outbox.getByText("No email or text was sent.")).toBeVisible();
  await expect(outbox.getByText("Brindle · Email", { exact: true })).toBeVisible();
  await expect(outbox.getByText("Brindle · Text", { exact: true })).toHaveCount(0);
  await expect(outbox.getByText("Estervale · Email", { exact: true })).toBeVisible();
  await expect(outbox.getByText("Estervale · Text", { exact: true })).toBeVisible();
  await expect(outbox.getByText("Dunlow", { exact: true })).toHaveCount(0);

  await page.goto("/");
  await page.getByLabel("Household", { exact: true }).selectOption({ label: "Brindle" });
  await expect(page.getByText("Nothing is emailed or texted.")).toBeVisible();
  const textReminders = page.getByLabel("Text before the cutoff");
  await expectTouchTarget(textReminders);
  await textReminders.check();

  await page.goto("/admin");
  await expect(
    page.getByRole("region", { name: "Mock outbox" }).getByText("Brindle · Text", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Mock outbox" }).getByText("Brindle · Email", { exact: true }),
  ).toBeVisible();
});
