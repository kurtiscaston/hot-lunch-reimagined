import { expect, type Locator, test } from "@playwright/test";

const disclaimer = "Unofficial concept, not affiliated with any school or PAC";

type Rgb = { r: number; g: number; b: number };

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(color: Rgb): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** Read sRGB by painting computed colors, including oklch(), through a canvas. */
function readElementColors(element: Element): { color: Rgb; backgroundColor: Rgb } {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas is unavailable");
  }
  const ctx = context;

  function pixel(): { r: number; g: number; b: number; a: number } {
    const data = ctx.getImageData(0, 0, 1, 1).data;
    const r = data[0];
    const g = data[1];
    const b = data[2];
    const a = data[3];
    if (r === undefined || g === undefined || b === undefined || a === undefined) {
      throw new Error("Canvas returned no pixel");
    }
    return { r, g, b, a };
  }

  function paint(color: string) {
    const sentinel = "#010203";
    ctx.fillStyle = sentinel;
    ctx.fillStyle = color;
    if (ctx.fillStyle === sentinel) {
      throw new Error(`Browser rejected color ${color}`);
    }
    ctx.fillRect(0, 0, 1, 1);
  }

  function sample(color: string) {
    ctx.clearRect(0, 0, 1, 1);
    paint(color);
    return pixel();
  }

  const layers: string[] = [];
  let node: Element | null = element;
  while (node) {
    const background = getComputedStyle(node).backgroundColor;
    layers.push(background);
    if (sample(background).a === 255) {
      break;
    }
    node = node.parentElement;
  }

  ctx.clearRect(0, 0, 1, 1);
  for (const background of layers.reverse()) {
    paint(background);
  }
  const backgroundPixel = pixel();
  if (backgroundPixel.a !== 255) {
    throw new Error(`Background is still translucent (alpha ${backgroundPixel.a / 255})`);
  }

  const foreground = sample(getComputedStyle(element).color);
  const alpha = foreground.a / 255;
  const color =
    foreground.a === 255
      ? { r: foreground.r, g: foreground.g, b: foreground.b }
      : {
          r: Math.round(foreground.r * alpha + backgroundPixel.r * (1 - alpha)),
          g: Math.round(foreground.g * alpha + backgroundPixel.g * (1 - alpha)),
          b: Math.round(foreground.b * alpha + backgroundPixel.b * (1 - alpha)),
        };

  return {
    color,
    backgroundColor: {
      r: backgroundPixel.r,
      g: backgroundPixel.g,
      b: backgroundPixel.b,
    },
  };
}

function readColors(locator: Locator): Promise<{ color: Rgb; backgroundColor: Rgb }> {
  return locator.evaluate(readElementColors);
}

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("home loads and shows the disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.getByText(disclaimer)).toBeVisible();
  await expect(page.getByText("Demo only — not a sign-in")).toBeVisible();
  await expect(page.getByText("Unofficial concept · Maple Hollow Elementary")).toBeVisible();
});

test("volunteer page loads and shows the disclaimer", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { level: 1, name: "Volunteer workspace" }),
  ).toBeVisible();
  await expect(page.getByText(disclaimer)).toBeVisible();
});

test("contrast sampling composites alpha and accepts oklch", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "contrast-probe-host";
    host.style.backgroundColor = "rgb(255, 255, 255)";

    const transparent = document.createElement("div");
    transparent.id = "contrast-probe-transparent";
    transparent.style.backgroundColor = "rgba(0, 0, 0, 0)";
    transparent.textContent = "transparent";

    const veil = document.createElement("div");
    veil.id = "contrast-probe-veil";
    veil.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    veil.textContent = "veil";

    const oklch = document.createElement("div");
    oklch.id = "contrast-probe-oklch";
    oklch.style.backgroundColor = "oklch(0.7 0.17 150)";
    oklch.style.color = "oklch(0.25 0.03 150)";
    oklch.textContent = "oklch";

    host.append(transparent, veil, oklch);
    document.body.append(host);
  });

  const transparent = await page.locator("#contrast-probe-transparent").evaluate(readElementColors);
  expect(transparent.backgroundColor).toEqual({ r: 255, g: 255, b: 255 });

  const veil = await page.locator("#contrast-probe-veil").evaluate(readElementColors);
  expect(veil.backgroundColor.r).toBeGreaterThan(100);
  expect(veil.backgroundColor.r).toBeLessThan(160);
  expect(veil.backgroundColor.g).toBe(veil.backgroundColor.r);
  expect(veil.backgroundColor.b).toBe(veil.backgroundColor.r);

  const oklch = await page.locator("#contrast-probe-oklch").evaluate(readElementColors);
  expect(oklch.backgroundColor.g).toBeGreaterThan(oklch.backgroundColor.r);
  expect(oklch.backgroundColor.g).toBeGreaterThan(80);
});

test("demo role switcher moves between parent and volunteer", async ({ page }) => {
  await page.goto("/");
  const parent = page.getByRole("link", { name: "Parent" });
  const volunteer = page.getByRole("link", { name: "Volunteer" });
  await expect(parent).toHaveAttribute("aria-current", "page");
  await expect(volunteer).not.toHaveAttribute("aria-current");
  await expectTouchTarget(parent);
  await expectTouchTarget(volunteer);

  const selected = await readColors(parent);
  const unselected = await readColors(volunteer);
  expect(contrastRatio(selected.color, selected.backgroundColor)).toBeGreaterThanOrEqual(7);
  // Guards that the selected fill is distinct from the unselected fill, not only that the label is readable.
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

test("selected controls keep a visible focus ring", async ({ page }) => {
  await page.goto("/orders?student=stu-ada-brindle");
  const ada = page.getByRole("navigation", { name: "Student" }).getByRole("link", { name: "Ada" });
  await expect(ada).toBeVisible();
  await focusVisible(ada);
  await expectVisibleRing(ada);

  await page.goto("/admin#outbox");
  const channel = page.getByRole("group", { name: "Channel" }).getByRole("button", { name: /^All / });
  await expect(channel).toBeVisible();
  await focusVisible(channel);
  await expectVisibleRing(channel);
});

async function focusVisible(locator: Locator) {
  await locator.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Expected an element");
    }
    const options: FocusOptions = { preventScroll: true };
    Object.assign(options, { focusVisible: true });
    element.focus(options);
  });
}

async function expectVisibleRing(locator: Locator) {
  const ring = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
  });
  expect(ring.outlineStyle).not.toBe("none");
  expect(ring.outlineWidth).toBeGreaterThanOrEqual(2);
}

test("unofficial concept labelling is visible on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const label = "Unofficial concept · Maple Hollow Elementary";
  await page.goto("/");
  await expect(page.getByText(label)).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText(label)).toBeVisible();
});
