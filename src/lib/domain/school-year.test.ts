import { describe, expect, it } from "vitest";

import { schoolYearLabel } from "@/lib/domain/school-year";

describe("school year label", () => {
  it("turns over on July 1 in America/Vancouver, not UTC", () => {
    expect(schoolYearLabel(new Date("2026-07-01T06:59:59.000Z"))).toBe("2025–2026");
    expect(schoolYearLabel(new Date("2026-07-01T00:00:00.000Z"))).toBe("2025–2026");
    expect(schoolYearLabel(new Date("2026-07-01T07:00:00.000Z"))).toBe("2026–2027");
    expect(schoolYearLabel(new Date("2026-11-12T15:00:00.000Z"))).toBe("2026–2027");
  });
});
