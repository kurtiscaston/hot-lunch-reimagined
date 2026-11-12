import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/domain/seed";

import {
  clearDemoState,
  DEMO_STORAGE_KEY,
  loadDemoState,
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

  it("clears back to a fresh seed", () => {
    const storage = memoryStorage();
    const loaded = loadDemoState(storage, NOW);
    saveDemoState(storage, { ...loaded, householdId: "hh-dunlow" });
    clearDemoState(storage);
    expect(loadDemoState(storage, NOW).householdId).toBe("hh-brindle");
  });
});
