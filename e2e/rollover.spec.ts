import { expect, type Locator, test } from "@playwright/test";

const FROZEN_AT = "2026-11-12T20:00:00.000Z";

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("a school year rolls forward after a preview", async ({ page }) => {
  await page.clock.setFixedTime(FROZEN_AT);
  await page.goto("/admin");
  await expect(page.getByText("Brindle · Email", { exact: true })).toBeVisible();

  const preview = page.getByRole("button", { name: "Preview rollover" });
  await expectTouchTarget(preview);
  await expect(page.getByRole("button", { name: "Apply rollover" })).toBeDisabled();
  await preview.click();

  await expect(page.getByText("Preview only. Applying moves 2026–2027 to 2027–2028.")).toBeVisible();
  await expect(page.getByText("Ada Brindle moves from Kindergarten to Grade 1.")).toBeVisible();
  await expect(page.getByText("Moss Hearthwell finishes Grade 5 and is archived.")).toBeVisible();
  await expect(page.getByText("Brindle: Ada eats vegetarian. Email on, text off.")).toBeVisible();

  const apply = page.getByRole("button", { name: "Apply rollover" });
  await expect(apply).toBeEnabled();
  await expectTouchTarget(apply);
  await apply.click();
  await expect(page.getByText("2027–2028 is the current school year.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview rollover" })).toBeDisabled();
  await expect(page.getByText("Archived from the previous school year")).toBeVisible();

  await page.goto("/");
  await page.getByLabel("Household", { exact: true }).selectOption({ label: "Brindle" });
  await expect(page.getByText("Ada Brindle, Grade 1")).toBeVisible();
  await expect(page.getByText("Theo Brindle, Grade 4")).toBeVisible();
  await expect(
    page.getByText("Preferences carried with this household: Ada eats vegetarian."),
  ).toBeVisible();

  await page.getByLabel("Household", { exact: true }).selectOption({ label: "Hearthwell" });
  await expect(page.getByText("Juniper Hearthwell, Grade 3")).toBeVisible();
  await expect(page.getByText("Moss Hearthwell")).toHaveCount(0);
  await expect(page.getByText("No peanuts in the house.")).toBeVisible();
});
