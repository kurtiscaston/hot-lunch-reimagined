import { zonedDate } from "@/lib/domain/time-zone";

/** A write is allowed only for the America/Vancouver day this demo was seeded. */
export function canPersistDemo(seededOn: string, now: Date): boolean {
  return seededOn === zonedDate(now);
}
