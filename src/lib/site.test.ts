import { describe, expect, it } from "vitest";

import { DISCLAIMER, SCHOOL_NAME } from "@/lib/site";

describe("site copy", () => {
  it("uses the required portfolio disclaimer", () => {
    expect(DISCLAIMER).toBe(
      "Unofficial concept, not affiliated with any school or PAC",
    );
  });

  it("names the fictional school", () => {
    expect(SCHOOL_NAME).toBe("Maple Hollow Elementary");
  });
});
