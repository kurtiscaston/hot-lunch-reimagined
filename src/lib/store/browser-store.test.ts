import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/domain/seed";
import { dateAtZone, zonedDate } from "@/lib/domain/time-zone";

import {
  clearDemoState,
  DEMO_STORAGE_KEY,
  loadDemoState,
  resolveDemoState,
  saveDemoState,
  type KeyValueStorage,
} from "./browser-store";

const NOW = new Date("2026-11-12T15:00:00.000Z");

function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

describe("browser demo store", () => {
  it("seeds when storage is empty and round-trips a change", () => {
    const storage = memoryStorage();
    const loaded = loadDemoState(storage, NOW);
    expect(loaded.snapshot).toEqual(createSeed(NOW));
    expect(loaded.householdId).toBe("hh-brindle");

    const next = {
      ...loaded,
      householdId: "hh-dunlow",
      snapshot: { ...loaded.snapshot, rolloverApplied: true },
    };
    saveDemoState(storage, next);
    expect(loadDemoState(storage, NOW)).toEqual(next);
  });

  it("reseeds when the saved JSON is unusable", () => {
    const storage = memoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, "{");
    expect(loadDemoState(storage, NOW).snapshot.schoolName).toBe("Maple Hollow Elementary");

    storage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, snapshot: { schoolName: "Other" }, householdId: "x" }),
    );
    expect(loadDemoState(storage, NOW).householdId).toBe("hh-brindle");
  });

  it("does not throw when storage reads and writes fail", () => {
    const storage: KeyValueStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };
    const loaded = loadDemoState(storage, NOW);
    expect(loaded.snapshot).toEqual(createSeed(NOW));
    expect(loaded.seededOn).toBe(zonedDate(NOW));
    expect(() => saveDemoState(storage, { ...loaded, householdId: "hh-dunlow" })).not.toThrow();
    expect(() => clearDemoState(storage)).not.toThrow();
    expect(loadDemoState(storage, NOW).householdId).toBe("hh-brindle");
  });

  it("reseeds when the stored Vancouver date is no longer today", () => {
    const storage = memoryStorage();
    const loaded = loadDemoState(storage, NOW);
    saveDemoState(storage, { ...loaded, householdId: "hh-dunlow" });

    const later = new Date("2026-11-14T20:00:00.000Z");
    const refreshed = loadDemoState(storage, later);
    expect(refreshed.seededOn).toBe(zonedDate(later));
    expect(refreshed.householdId).toBe("hh-dunlow");
    expect(refreshed.snapshot).toEqual(createSeed(later));
    expect(refreshed.snapshot.menuDays.map((day) => day.cutoffAt)).not.toEqual(
      loaded.snapshot.menuDays.map((day) => day.cutoffAt),
    );
  });

  it("reseeds a saved snapshot that has no Vancouver date", () => {
    const storage = memoryStorage();
    const loaded = loadDemoState(storage, NOW);
    storage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        householdId: "hh-dunlow",
        snapshot: { ...loaded.snapshot, rolloverApplied: true },
      }),
    );
    const refreshed = loadDemoState(storage, NOW);
    expect(refreshed.seededOn).toBe(zonedDate(NOW));
    expect(refreshed.snapshot.rolloverApplied).toBe(false);
    expect(refreshed.householdId).toBe("hh-dunlow");
  });

  it("discards a stored snapshot whose dates or records cannot render", () => {
    const storage = memoryStorage();
    const loaded = loadDemoState(storage, NOW);
    const [firstDay, ...otherDays] = loaded.snapshot.menuDays;
    if (!firstDay) {
      throw new Error("expected a menu day");
    }
    storage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        seededOn: loaded.seededOn,
        householdId: "hh-dunlow",
        snapshot: {
          ...loaded.snapshot,
          menuDays: [
            { ...firstDay, cutoffAt: "tomorrow", serviceDate: "2026-02-31" },
            ...otherDays,
          ],
          orders: [{ id: "bad" }],
          vendors: ["Birch & Rye Kitchen"],
          menuItems: [{ id: "item", name: "Melt" }],
        },
      }),
    );

    const refreshed = loadDemoState(storage, NOW);
    expect(refreshed.snapshot).toEqual(createSeed(NOW));
    expect(refreshed.householdId).toBe("hh-dunlow");
    expect(refreshed.snapshot.menuDays.some((day) => day.cutoffAt === "tomorrow")).toBe(false);
  });

  it("keeps the cached board until the America/Vancouver date changes", () => {
    const storage = memoryStorage();
    const evening = dateAtZone(2026, 11, 12, 23, 0);
    const cached = loadDemoState(storage, evening);
    const edited = { ...cached, snapshot: { ...cached.snapshot, rolloverApplied: true } };
    saveDemoState(storage, edited);

    const stillToday = resolveDemoState(edited, dateAtZone(2026, 11, 12, 23, 40), storage);
    expect(stillToday).toBe(edited);

    const nextMorning = dateAtZone(2026, 11, 13, 0, 10);
    const refreshed = resolveDemoState(edited, nextMorning, storage);
    expect(refreshed.seededOn).toBe(zonedDate(nextMorning));
    expect(refreshed.snapshot).toEqual(createSeed(nextMorning));
    expect(refreshed.snapshot.rolloverApplied).toBe(false);
  });

  it("clears back to a fresh seed", () => {
    const storage = memoryStorage();
    const loaded = loadDemoState(storage, NOW);
    saveDemoState(storage, { ...loaded, householdId: "hh-dunlow" });
    clearDemoState(storage);
    expect(loadDemoState(storage, NOW).householdId).toBe("hh-brindle");
  });
});
