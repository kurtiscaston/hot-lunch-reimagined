import { describe, expect, it } from "vitest";

import { placeOrder } from "@/lib/domain/place-order";
import { MENU_DAY_IDS } from "@/lib/domain/seed";

import { loadDemoState, saveDemoState, type KeyValueStorage } from "./browser-store";
import { commitPlaceOrder } from "./commit-order";

const NOW = new Date("2026-11-12T15:00:00.000Z");
const OTHER = {
  studentId: "stu-willa-dunlow",
  menuDayId: MENU_DAY_IDS.open,
  itemId: "item-lantern-bean",
};
const OURS = {
  studentId: "stu-ada-brindle",
  menuDayId: MENU_DAY_IDS.open,
  itemId: "item-lantern-bean",
};

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

describe("commitPlaceOrder", () => {
  it("keeps an order another tab wrote before this tab publishes", () => {
    const storage = memoryStorage();
    const initial = loadDemoState(storage, NOW);
    saveDemoState(storage, initial);
    const other = placeOrder(initial.snapshot, OTHER, NOW);
    if (!other.ok) {
      throw new Error(other.reason);
    }

    let reads = 0;
    const racing: KeyValueStorage = {
      getItem(key) {
        reads += 1;
        if (reads === 2) {
          saveDemoState(storage, { ...initial, snapshot: other.snapshot });
        }
        return storage.getItem(key);
      },
      setItem(key, value) {
        storage.setItem(key, value);
      },
      removeItem(key) {
        storage.removeItem(key);
      },
    };

    const committed = commitPlaceOrder(racing, initial, OURS, NOW);
    expect(committed.ok).toBe(true);
    const saved = loadDemoState(storage, NOW);
    const ids = saved.snapshot.orders.map((order) => `${order.studentId}:${order.menuDayId}`);
    expect(ids).toContain(`${OTHER.studentId}:${OTHER.menuDayId}`);
    expect(ids).toContain(`${OURS.studentId}:${OURS.menuDayId}`);
  });

  it("places the order on the fallback when storage is from another Vancouver day", () => {
    const storage = memoryStorage();
    const fallback = loadDemoState(storage, NOW);
    const earlier = new Date("2026-11-10T15:00:00.000Z");
    const stale = loadDemoState(memoryStorage(), earlier);
    saveDemoState(storage, stale);

    const committed = commitPlaceOrder(storage, fallback, OURS, NOW);
    expect(committed.ok).toBe(true);
    if (!committed.ok) {
      return;
    }
    expect(committed.state.snapshot.menuDays.map((day) => day.cutoffAt)).toEqual(
      fallback.snapshot.menuDays.map((day) => day.cutoffAt),
    );
    expect(
      committed.state.snapshot.orders.some(
        (order) => order.studentId === OURS.studentId && order.menuDayId === OURS.menuDayId,
      ),
    ).toBe(true);
    expect(committed.state.snapshot.menuDays.map((day) => day.cutoffAt)).not.toEqual(
      stale.snapshot.menuDays.map((day) => day.cutoffAt),
    );
  });

  it("keeps the in-memory order when the previous save failed", () => {
    const storage = memoryStorage();
    const stored = loadDemoState(storage, NOW);
    expect(saveDemoState(storage, stored)).toBe(true);
    const remembered = placeOrder(stored.snapshot, OTHER, NOW);
    if (!remembered.ok) {
      throw new Error(remembered.reason);
    }
    const fallback = { ...stored, snapshot: remembered.snapshot };

    const committed = commitPlaceOrder(storage, fallback, OURS, NOW, { lastWriteFailed: true });
    expect(committed.ok).toBe(true);
    if (!committed.ok) {
      return;
    }
    const ids = committed.state.snapshot.orders.map(
      (order) => `${order.studentId}:${order.menuDayId}`,
    );
    expect(ids).toContain(`${OTHER.studentId}:${OTHER.menuDayId}`);
    expect(ids).toContain(`${OURS.studentId}:${OURS.menuDayId}`);
    expect(committed.state.snapshot.menuDays.map((day) => day.cutoffAt)).toEqual(
      fallback.snapshot.menuDays.map((day) => day.cutoffAt),
    );
  });
});

