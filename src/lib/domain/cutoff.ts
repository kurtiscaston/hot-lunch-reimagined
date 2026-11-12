/** A cutoff this close, and still in the future, is "imminent". */
export const IMMINENT_WITHIN_MS = 6 * 60 * 60 * 1000;

export type MenuDayStatus = "locked" | "imminent" | "open";

/** Timezone-qualified ISO-8601 instant. Date-only and host-local strings are not instants. */
const ISO_8601_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function instantMs(cutoffAt: string): number {
  const match = ISO_8601_INSTANT.exec(cutoffAt);
  if (!match) {
    throw new Error(`Invalid cutoff: ${cutoffAt}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offset = match[7] ?? "";
  const offsetHour = offset === "Z" ? 0 : Number(offset.slice(1, 3));
  const offsetMinute = offset === "Z" ? 0 : Number(offset.slice(4, 6));

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    throw new Error(`Invalid cutoff: ${cutoffAt}`);
  }

  const ms = Date.parse(cutoffAt);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid cutoff: ${cutoffAt}`);
  }
  return ms;
}

/** Ordering locks at the cutoff instant and stays locked after it. */
export function isOrderingLocked(cutoffAt: string, now: Date): boolean {
  return now.getTime() >= instantMs(cutoffAt);
}

export function remainingMs(cutoffAt: string, now: Date): number {
  return instantMs(cutoffAt) - now.getTime();
}

export function menuDayStatus(cutoffAt: string, now: Date): MenuDayStatus {
  const remaining = remainingMs(cutoffAt, now);
  if (remaining <= 0) {
    return "locked";
  }
  if (remaining <= IMMINENT_WITHIN_MS) {
    return "imminent";
  }
  return "open";
}

export function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "Ordering locked";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${hours}h ${minutes}m ${seconds}s`;
  return days > 0 ? `${days}d ${clock}` : clock;
}
