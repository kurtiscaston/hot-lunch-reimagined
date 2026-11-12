import { describe, expect, it } from "vitest";

import { shouldFocusOrderedLine } from "@/lib/domain/ordered-focus";

describe("ordered line focus", () => {
  it("moves focus after this form's own successful submit", () => {
    expect(shouldFocusOrderedLine(true, true)).toBe(true);
  });

  it("leaves focus alone when an order arrives from another tab or a reseed", () => {
    expect(shouldFocusOrderedLine(false, true)).toBe(false);
    expect(shouldFocusOrderedLine(true, false)).toBe(false);
    expect(shouldFocusOrderedLine(false, false)).toBe(false);
  });
});
