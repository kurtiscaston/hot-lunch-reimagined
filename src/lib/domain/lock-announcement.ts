import type { MenuDayStatus } from "@/lib/domain/cutoff";

/**
 * Polite announcement when a menu day becomes locked.
 * Returns null on the first observation and on every other status, including
 * a countdown tick that leaves the status unchanged.
 */
export function lockAnnouncement(
  previous: MenuDayStatus | null,
  next: MenuDayStatus,
  dayLabel: string,
): string | null {
  if (previous === null || previous === next || next !== "locked") {
    return null;
  }
  return `${dayLabel} is locked.`;
}
