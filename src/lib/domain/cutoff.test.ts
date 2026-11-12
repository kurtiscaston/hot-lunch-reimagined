import { describe, expect, it } from "vitest";

import {
  formatRemaining,
  IMMINENT_WITHIN_MS,
  isOrderingLocked,
  menuDayStatus,
  remainingMs,
} from "@/lib/domain/cutoff";

const CUTOFF = "2026-11-12T15:00:00.000Z";
const cutoffMs = Date.parse(CUTOFF);

describe("ordering cutoff", () => {
  it("stays open one millisecond before the cutoff", () => {
    const now = new Date(cutoffMs - 1);
    expect(isOrderingLocked(CUTOFF, now)).toBe(false);
    expect(menuDayStatus(CUTOFF, now)).toBe("imminent");
    expect(remainingMs(CUTOFF, now)).toBe(1);
  });

  it("locks at the cutoff instant and after it", () => {
    expect(isOrderingLocked(CUTOFF, new Date(cutoffMs))).toBe(true);
    expect(menuDayStatus(CUTOFF, new Date(cutoffMs))).toBe("locked");
    expect(isOrderingLocked(CUTOFF, new Date(cutoffMs + 60_000))).toBe(true);
    expect(menuDayStatus(CUTOFF, new Date(cutoffMs + 60_000))).toBe("locked");
  });

  it("treats a cutoff inside six hours as imminent, and later as open", () => {
    const imminent = new Date(cutoffMs - IMMINENT_WITHIN_MS);
    const justInside = new Date(cutoffMs - IMMINENT_WITHIN_MS + 1);
    const open = new Date(cutoffMs - IMMINENT_WITHIN_MS - 1);

    expect(menuDayStatus(CUTOFF, imminent)).toBe("imminent");
    expect(menuDayStatus(CUTOFF, justInside)).toBe("imminent");
    expect(menuDayStatus(CUTOFF, open)).toBe("open");
  });

  it("rejects a cutoff that is not a timestamp", () => {
    expect(() => isOrderingLocked("next Friday", new Date(cutoffMs))).toThrow(
      /Invalid cutoff/,
    );
  });

  it("rejects loose Date.parse strings that are not a timezone-qualified ISO-8601 instant", () => {
    const now = new Date(cutoffMs);
    for (const loose of [
      "November 12, 2026",
      "2026/11/12",
      "2026-11-12",
      "2026-11-12 15:00:00",
      "2026-11-12T15:00:00",
      "2026-02-31T00:00:00.000Z",
      "2026-11-12T24:00:00.000Z",
      "2026-11-12T15:00:00.000+99:99",
      "2026-11-12T15:00:00.1234Z",
    ]) {
      expect(() => isOrderingLocked(loose, now), loose).toThrow(/Invalid cutoff/);
    }
  });

  it("accepts ISO-8601 instants with Z or a numeric offset", () => {
    expect(remainingMs("2026-11-12T15:00:00Z", new Date(cutoffMs))).toBe(0);
    expect(remainingMs("2026-11-12T15:00:00.1Z", new Date(cutoffMs))).toBe(100);
    expect(remainingMs("2026-11-12T07:00:00.000-08:00", new Date(cutoffMs))).toBe(0);
  });
});

describe("countdown text", () => {
  it("says ordering is locked when no time remains", () => {
    expect(formatRemaining(0)).toBe("Ordering locked");
    expect(formatRemaining(-1)).toBe("Ordering locked");
    expect(formatRemaining(Number.NaN)).toBe("Ordering locked");
    expect(formatRemaining(Number.POSITIVE_INFINITY)).toBe("Ordering locked");
    expect(formatRemaining(Number.NEGATIVE_INFINITY)).toBe("Ordering locked");
  });

  it("formats hours, and includes days once a day remains", () => {
    expect(formatRemaining(90 * 60 * 1000 + 3000)).toBe("1h 30m 3s");
    expect(formatRemaining((26 * 60 + 2) * 60 * 1000 + 1000)).toBe("1d 2h 2m 1s");
  });
});
