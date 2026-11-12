import { createSeed } from "@/lib/domain/seed";
import type { LunchSnapshot } from "@/lib/domain/types";
import { zonedDate } from "@/lib/domain/time-zone";
import { SCHOOL_NAME } from "@/lib/site";

export const DEMO_STORAGE_KEY = "hot-lunch-reimagined.demo.v1";

export interface DemoState {
  snapshot: LunchSnapshot;
  householdId: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredDemo {
  schemaVersion: 1;
  snapshot: LunchSnapshot;
  householdId: string;
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
  return { snapshot, householdId: initialHouseholdId(snapshot, now) };
}

function isSnapshot(value: unknown): value is LunchSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.schoolName === SCHOOL_NAME &&
    typeof record.schoolYearLabel === "string" &&
    Array.isArray(record.households) &&
    Array.isArray(record.students) &&
    Array.isArray(record.vendors) &&
    Array.isArray(record.menuItems) &&
    Array.isArray(record.menuDays) &&
    Array.isArray(record.orders) &&
    Array.isArray(record.payments) &&
    Array.isArray(record.reminders)
  );
}

function householdIdFor(snapshot: LunchSnapshot, requested: string): string | null {
  if (snapshot.households.some((household) => household.id === requested)) {
    return requested;
  }
  return snapshot.households[0]?.id ?? null;
}

export function loadDemoState(storage: KeyValueStorage, now: Date): DemoState {
  const raw = storage.getItem(DEMO_STORAGE_KEY);
  if (!raw) {
    return freshState(now);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return freshState(now);
    }
    const record = parsed as Partial<StoredDemo>;
    if (record.schemaVersion !== 1 || !isSnapshot(record.snapshot)) {
      return freshState(now);
    }
    const householdId = householdIdFor(record.snapshot, String(record.householdId ?? ""));
    if (!householdId) {
      return freshState(now);
    }
    return { snapshot: record.snapshot, householdId };
  } catch {
    return freshState(now);
  }
}

export function saveDemoState(storage: KeyValueStorage, state: DemoState): void {
  const stored: StoredDemo = {
    schemaVersion: 1,
    snapshot: state.snapshot,
    householdId: state.householdId,
  };
  storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(stored));
}

export function clearDemoState(storage: KeyValueStorage): void {
  storage.removeItem(DEMO_STORAGE_KEY);
}
