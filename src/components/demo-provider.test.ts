import { afterEach, describe, expect, it, vi } from "vitest";

import { dateAtZone } from "@/lib/domain/time-zone";
import { DEMO_STORAGE_KEY, loadDemoState, type KeyValueStorage } from "@/lib/store/browser-store";

import { installCachedDemo, setHouseholdId } from "./demo-provider";

function memoryStorage(): { storage: KeyValueStorage; writes: () => number } {
  const values = new Map<string, string>();
  let writes = 0;
  return {
    storage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        writes += 1;
        values.set(key, value);
      },
      removeItem(key) {
        values.delete(key);
      },
    },
    writes: () => writes,
  };
}

describe("demo provider day guard", () => {
  afterEach(() => {
    installCachedDemo(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not write yesterday's household once the cached day is stale", () => {
    const evening = dateAtZone(2026, 11, 12, 23, 30);
    const morning = dateAtZone(2026, 11, 13, 0, 10);
    const { storage, writes } = memoryStorage();
    const seeded = loadDemoState(storage, evening);
    installCachedDemo({ ...seeded, householdId: "hh-brindle" });
    vi.stubGlobal("window", {
      localStorage: storage,
      addEventListener() {},
      removeEventListener() {},
      setInterval() {
        return 0;
      },
      clearInterval() {},
    });
    vi.spyOn(Date, "now").mockReturnValue(morning.getTime());

    setHouseholdId("hh-dunlow");

    expect(writes()).toBe(0);
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });
});
