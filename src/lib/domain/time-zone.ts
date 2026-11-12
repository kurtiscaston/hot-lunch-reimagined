export const LUNCH_TIME_ZONE = "America/Vancouver";

const calendarFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LUNCH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LUNCH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const serviceDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const cutoffFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LUNCH_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const priceFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
  timeZone: string,
): string {
  const found = parts.find((entry) => entry.type === type);
  if (!found) {
    throw new Error(`Missing ${type} for ${timeZone}`);
  }
  return found.value;
}

/** Year, month, and day from one formatToParts call. Month is 1–12. */
export function zonedCalendar(
  instant: Date,
  timeZone = LUNCH_TIME_ZONE,
): { year: number; month: number; day: number } {
  const formatter =
    timeZone === LUNCH_TIME_ZONE
      ? calendarFormatter
      : new Intl.DateTimeFormat("en-US", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  const parts = formatter.formatToParts(instant);
  return {
    year: Number(partValue(parts, "year", timeZone)),
    month: Number(partValue(parts, "month", timeZone)),
    day: Number(partValue(parts, "day", timeZone)),
  };
}

/** YYYY-MM-DD for an instant's calendar day in the lunch time zone. */
export function zonedDate(instant: Date, timeZone = LUNCH_TIME_ZONE): string {
  const { year, month, day } = zonedCalendar(instant, timeZone);
  const monthText = String(month).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter =
    timeZone === LUNCH_TIME_ZONE
      ? offsetFormatter
      : new Intl.DateTimeFormat("en-US", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        });
  const parts = formatter.formatToParts(instant);
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
  return serviceDateFormatter.format(noonUtc);
}

/** Vancouver date and time for any instant, including when an order was placed. */
export function formatDateTime(instant: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${instant}`);
  }
  return cutoffFormatter.format(date);
}

export function formatCutoff(cutoffAt: string): string {
  const instant = new Date(cutoffAt);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid cutoff: ${cutoffAt}`);
  }
  return formatDateTime(cutoffAt);
}

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}
