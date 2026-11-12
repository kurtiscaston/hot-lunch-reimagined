import { zonedMonth, zonedYear } from "@/lib/domain/time-zone";

/** School year turns over on July 1 in America/Vancouver. */
export function schoolYearLabel(now: Date): string {
  const year = zonedYear(now);
  const start = zonedMonth(now) >= 7 ? year : year - 1;
  return `${start}–${start + 1}`;
}
