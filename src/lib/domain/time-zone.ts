export const LUNCH_TIME_ZONE = "America/Vancouver";

function datePart(instant: Date, type: "year" | "month" | "day", timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const found = parts.find((entry) => entry.type === type);
  if (!found) {
    throw new Error(`Missing ${type} for ${timeZone}`);
  }
  return found.value;
}

/** YYYY-MM-DD for an instant's calendar day in the lunch time zone. */
export function zonedDate(instant: Date, timeZone = LUNCH_TIME_ZONE): string {
  const year = datePart(instant, "year", timeZone);
  const month = datePart(instant, "month", timeZone);
  const day = datePart(instant, "day", timeZone);
  return `${year}-${month}-${day}`;
}

export function zonedYear(instant: Date, timeZone = LUNCH_TIME_ZONE): number {
  return Number(datePart(instant, "year", timeZone));
}

export function zonedMonth(instant: Date, timeZone = LUNCH_TIME_ZONE): number {
  return Number(datePart(instant, "month", timeZone));
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const found = parts.find((entry) => entry.type === type);
    if (!found) {
      throw new Error(`Missing ${type} for ${timeZone}`);
    }
    return Number(found.value);
  };
  const hour = read("hour") % 24;
  const wallClock = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    hour,
    read("minute"),
    read("second"),
  );
  return wallClock - instant.getTime();
}

/** The instant when that clock time is showing in the lunch time zone. */
export function dateAtZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = LUNCH_TIME_ZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const first = utcGuess - zoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - zoneOffsetMs(new Date(first), timeZone));
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function calendarParts(value: string): { year: number; month: number; day: number } | null {
  const match = CALENDAR_DATE.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** YYYY-MM-DD that is a real calendar day. */
export function isCalendarDate(value: string): boolean {
  return calendarParts(value) !== null;
}

/** Instant produced by Date.toISOString(), not a rolled-over or local timestamp. */
export function isIsoInstant(value: string): boolean {
  if (!ISO_INSTANT.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === value;
}

/** Format a Vancouver service date without shifting it through another zone. */
export function formatServiceDate(serviceDate: string): string {
  const parts = calendarParts(serviceDate);
  if (!parts) {
    throw new Error(`Invalid service date: ${serviceDate}`);
  }
  const { year, month, day } = parts;
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(noonUtc);
}

export function formatCutoff(cutoffAt: string): string {
  const instant = new Date(cutoffAt);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid cutoff: ${cutoffAt}`);
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: LUNCH_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}
