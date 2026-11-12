import { describe, expect, it } from "vitest";

import { selectedMealId } from "@/lib/domain/selected-meal";

describe("selected meal", () => {
  const lantern = ["item-lantern-citrus", "item-lantern-bean"];

  it("keeps the current meal when that day still serves it", () => {
    expect(selectedMealId("item-lantern-bean", lantern)).toBe("item-lantern-bean");
  });

  it("resets to the first meal when a reseed drops the current id", () => {
    expect(selectedMealId("item-birch-melt", lantern)).toBe("item-lantern-citrus");
    expect(selectedMealId("item-birch-melt", [])).toBe("");
  });
});
