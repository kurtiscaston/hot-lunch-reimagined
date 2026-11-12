import { expect, type Locator, test } from "@playwright/test";

const disclaimer = "Unofficial concept, not affiliated with any school or PAC";

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const match = color.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
  const red = match?.[1];
  const green = match?.[2];
  const blue = match?.[3];
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Unparsed color ${color}`);
  }
  return (
    0.2126 * channel(Number(red)) +
    0.7152 * channel(Number(green)) +
    0.0722 * channel(Number(blue))
  );
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

async function paint(locator: Locator): Promise<{ color: string; backgroundColor: string }> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
}

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("home loads and shows the disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hot lunch, run from a phone." }),
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
  const parent = page.getByRole("link", { name: "Parent" });
  const volunteer = page.getByRole("link", { name: "Volunteer" });
  await expect(parent).toHaveAttribute("aria-current", "page");
  await expect(volunteer).not.toHaveAttribute("aria-current");
  await expectTouchTarget(parent);
  await expectTouchTarget(volunteer);

  const selected = await paint(parent);
  const unselected = await paint(volunteer);
  expect(contrastRatio(selected.color, selected.backgroundColor)).toBeGreaterThanOrEqual(7);
  expect(
    contrastRatio(selected.backgroundColor, unselected.backgroundColor),
  ).toBeGreaterThanOrEqual(3);

  await volunteer.click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Volunteer workspace" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Volunteer" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Parent" })).not.toHaveAttribute("aria-current");
  await page.getByRole("link", { name: "Parent" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Parent" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("disclaimer stays visible on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText(disclaimer)).toBeVisible();
  const volunteer = page.getByRole("link", { name: "Volunteer" });
  await expect(volunteer).toBeVisible();
  await expectTouchTarget(volunteer);
});
