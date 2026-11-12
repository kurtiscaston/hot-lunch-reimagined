import { createSeed } from "@/lib/domain/seed";
import { GRADES, type LunchSnapshot } from "@/lib/domain/types";
import { isCalendarDate, isIsoInstant, zonedDate } from "@/lib/domain/time-zone";
import { SCHOOL_NAME } from "@/lib/site";

export const DEMO_STORAGE_KEY = "hot-lunch-reimagined.demo.v1";

export interface DemoState {
  snapshot: LunchSnapshot;
  householdId: string;
  /** America/Vancouver calendar day this snapshot was seeded. */
  seededOn: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredDemo {
  schemaVersion: 1;
  seededOn: string;
  snapshot: LunchSnapshot;
  householdId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isHousehold(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.reminderOptIn) || !isRecord(value.preferences)) {
    return false;
  }
  return (
    isString(value.id) &&
    value.id.length > 0 &&
    isString(value.name) &&
    isString(value.email) &&
    isString(value.phone) &&
    typeof value.reminderOptIn.email === "boolean" &&
    typeof value.reminderOptIn.sms === "boolean" &&
    isString(value.preferences.dietaryNotes)
  );
}

function isStudent(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.id) &&
    value.id.length > 0 &&
    isString(value.householdId) &&
    isString(value.firstName) &&
    isString(value.lastName) &&
    isString(value.grade) &&
    (GRADES as readonly string[]).includes(value.grade) &&
    typeof value.archived === "boolean"
  );
}

function isMenuDay(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.itemIds)) {
    return false;
  }
  return (
    isString(value.id) &&
    isString(value.label) &&
    isString(value.serviceDate) &&
    isCalendarDate(value.serviceDate) &&
    isString(value.cutoffAt) &&
    isIsoInstant(value.cutoffAt) &&
    isString(value.vendorId) &&
    value.itemIds.every(isString)
  );
}

function isVendor(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && value.id.length > 0 && isString(value.name);
}

function isMenuItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    value.id.length > 0 &&
    isString(value.vendorId) &&
    isString(value.name) &&
    typeof value.priceCents === "number" &&
    Number.isFinite(value.priceCents)
  );
}

function isOrder(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.studentId) &&
    isString(value.menuDayId) &&
    isString(value.itemId) &&
    typeof value.priceCents === "number" &&
    Number.isFinite(value.priceCents) &&
    isString(value.placedAt) &&
    isIsoInstant(value.placedAt)
  );
}

function initialHouseholdId(snapshot: LunchSnapshot, now: Date): string {
  const today = zonedDate(now);
  const upcoming = new Set(
    snapshot.menuDays.filter((day) => day.serviceDate >= today).map((day) => day.id),
  );
  const missing = snapshot.students.find((pupil) => {
    if (pupil.archived) {
      return false;
    }
    return [...upcoming].some(
      (dayId) =>
        !snapshot.orders.some(
          (order) => order.studentId === pupil.id && order.menuDayId === dayId,
        ),
    );
  });
  const householdId = missing?.householdId ?? snapshot.households[0]?.id;
  if (!householdId) {
    throw new Error("Seed has no household");
  }
  return householdId;
}

function freshState(now: Date): DemoState {
  const snapshot = createSeed(now);
  return { snapshot, householdId: initialHouseholdId(snapshot, now), seededOn: zonedDate(now) };
}

function isSnapshot(value: unknown): value is LunchSnapshot {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.schoolName === SCHOOL_NAME &&
    isString(value.schoolYearLabel) &&
    Array.isArray(value.households) &&
    value.households.every(isHousehold) &&
    Array.isArray(value.students) &&
    value.students.every(isStudent) &&
    Array.isArray(value.vendors) &&
    value.vendors.every(isVendor) &&
    Array.isArray(value.menuItems) &&
    value.menuItems.every(isMenuItem) &&
    Array.isArray(value.menuDays) &&
    value.menuDays.every(isMenuDay) &&
    Array.isArray(value.orders) &&
    value.orders.every(isOrder) &&
    Array.isArray(value.payments) &&
    Array.isArray(value.reminders)
  );
}

function matchingHouseholdId(snapshot: LunchSnapshot, requested: string): string | null {
  if (snapshot.households.some((household) => household.id === requested)) {
    return requested;
  }
  return null;
}

function reseedKeepingHousehold(now: Date, requested: unknown): DemoState {
  const fresh = freshState(now);
  const householdId = matchingHouseholdId(fresh.snapshot, String(requested ?? ""));
  return householdId ? { ...fresh, householdId } : fresh;
}

/** Keep today's cached demo. Reseed once the America/Vancouver date has changed. */
export function resolveDemoState(
  cached: DemoState | null,
  now: Date,
  storage: KeyValueStorage,
): DemoState {
  if (cached && cached.seededOn === zonedDate(now)) {
    return cached;
  }
  return loadDemoState(storage, now);
}

export function loadDemoState(storage: KeyValueStorage, now: Date): DemoState {
  let raw: string | null;
  try {
    raw = storage.getItem(DEMO_STORAGE_KEY);
  } catch {
    return freshState(now);
  }
  if (!raw) {
    return freshState(now);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return freshState(now);
    }
    const record = parsed as Partial<StoredDemo>;
    const today = zonedDate(now);
    if (record.schemaVersion !== 1 || !isSnapshot(record.snapshot) || record.seededOn !== today) {
      return reseedKeepingHousehold(now, record.householdId);
    }
    const householdId =
      matchingHouseholdId(record.snapshot, String(record.householdId ?? "")) ??
      initialHouseholdId(record.snapshot, now);
    return { snapshot: record.snapshot, householdId, seededOn: today };
  } catch {
    return freshState(now);
  }
}

export function saveDemoState(storage: KeyValueStorage, state: DemoState): void {
  const stored: StoredDemo = {
    schemaVersion: 1,
    seededOn: state.seededOn,
    snapshot: state.snapshot,
    householdId: state.householdId,
  };
  try {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // The visit keeps `state` in memory when the browser refuses the write.
  }
}

export function clearDemoState(storage: KeyValueStorage): void {
  try {
    storage.removeItem(DEMO_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
