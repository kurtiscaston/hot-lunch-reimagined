import { describe, expect, it } from "vitest";

import { schoolYearLabel } from "@/lib/domain/school-year";
import { dateAtZone, formatCutoff, formatServiceDate, zonedDate } from "@/lib/domain/time-zone";

describe("America/Vancouver calendar", () => {
  it("keeps a 4 PM Pacific cutoff on that calendar day", () => {
    const fourPm = dateAtZone(2026, 11, 12, 16, 0);
    expect(zonedDate(fourPm)).toBe("2026-11-12");
    expect(schoolYearLabel(fourPm)).toBe("2026–2027");

    const label = formatCutoff(fourPm.toISOString());
    expect(label).toContain("Nov 12");
    expect(label).toContain("4:00");
    expect(label).toContain("PM");
    expect(label).not.toContain("Nov 13");
  });

  it("does not roll an evening cutoff onto the next UTC date", () => {
    let crossedUtcMidnight = false;
    for (let hour = 16; hour <= 23; hour += 1) {
      const instant = dateAtZone(2027, 1, 14, hour, 30);
      expect(zonedDate(instant)).toBe("2027-01-14");
      expect(formatCutoff(instant.toISOString())).not.toContain("Jan 15");
      if (instant.toISOString().slice(0, 10) === "2027-01-15") {
        crossedUtcMidnight = true;
      }
    }
    expect(crossedUtcMidnight).toBe(true);
  });

  it("formats a service date as that calendar day", () => {
    expect(formatServiceDate("2026-11-12")).toBe("Thursday, November 12, 2026");
  });
});
