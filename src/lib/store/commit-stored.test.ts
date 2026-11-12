import { describe, expect, it } from "vitest";

import { placeOrder } from "@/lib/domain/place-order";
import { queueDueReminders } from "@/lib/domain/reminders";
import { MENU_DAY_IDS } from "@/lib/domain/seed";

import { loadDemoState, saveDemoState, type KeyValueStorage } from "./browser-store";
import { commitStoredUpdate } from "./commit-stored";

const NOW = new Date("2026-11-12T15:00:00.000Z");
const OTHER = {
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

describe("commitStoredUpdate", () => {
  it("keeps an order another tab wrote before reminders are saved", () => {
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

    const committed = commitStoredUpdate(racing, initial, NOW, (state) => {
      const snapshot = queueDueReminders(state.snapshot, NOW);
      return snapshot === state.snapshot ? state : { ...state, snapshot };
    });
    expect(committed.saved).toBe(true);
    const saved = loadDemoState(storage, NOW);
    expect(
      saved.snapshot.orders.some(
        (order) => order.studentId === OTHER.studentId && order.menuDayId === OTHER.menuDayId,
      ),
    ).toBe(true);
    expect(saved.snapshot.reminders.length).toBeGreaterThan(0);
  });
});
