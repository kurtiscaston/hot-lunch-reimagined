/** A cutoff this close, and still in the future, is "imminent". */
export const IMMINENT_WITHIN_MS = 6 * 60 * 60 * 1000;

export type MenuDayStatus = "locked" | "imminent" | "open";

function instantMs(cutoffAt: string): number {
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
  if (ms <= 0) {
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
