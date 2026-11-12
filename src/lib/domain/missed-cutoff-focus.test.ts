import { describe, expect, it } from "vitest";

import { shouldFocusMissedCutoff } from "@/lib/domain/missed-cutoff-focus";

describe("missed cutoff focus", () => {
  const inside = { name: "meal" } as unknown as Node;
  const outside = { name: "elsewhere" } as unknown as Node;
  const form = {
    contains(node: Node) {
      return node === inside;
    },
  };

  it("moves focus when the active control is inside the order form", () => {
    expect(shouldFocusMissedCutoff(form, inside)).toBe(true);
  });

  it("leaves focus alone when the order form is not the active control", () => {
    expect(shouldFocusMissedCutoff(form, outside)).toBe(false);
    expect(shouldFocusMissedCutoff(form, null)).toBe(false);
    expect(shouldFocusMissedCutoff(null, inside)).toBe(false);
  });
});
