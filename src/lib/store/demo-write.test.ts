import { describe, expect, it } from "vitest";

import { dateAtZone, zonedDate } from "@/lib/domain/time-zone";

import { canPersistDemo } from "./demo-write";

describe("canPersistDemo", () => {
  it("refuses yesterday's snapshot once the Vancouver date has changed", () => {
    const evening = dateAtZone(2026, 11, 12, 23, 30);
    const morning = dateAtZone(2026, 11, 13, 0, 10);
    expect(canPersistDemo(zonedDate(evening), evening)).toBe(true);
    expect(canPersistDemo(zonedDate(evening), morning)).toBe(false);
  });
});