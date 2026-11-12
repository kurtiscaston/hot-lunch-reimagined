"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { readClock, subscribeClock } from "@/lib/clock";
import { type PlaceOrderInput, type PlaceOrderResult } from "@/lib/domain/place-order";
import { queueDueReminders, reminderWindowOpen, setReminderOptIn } from "@/lib/domain/reminders";
import { applyRollover as applySchoolYearRollover } from "@/lib/domain/rollover";
import { zonedDate } from "@/lib/domain/time-zone";
import type { Channel } from "@/lib/domain/types";
import {
  clearDemoState,
  DEMO_STORAGE_KEY,
  loadDemoState,
  resolveDemoState,
  saveDemoState,
  type DemoState,
  type KeyValueStorage,
} from "@/lib/store/browser-store";
import { commitPlaceOrder } from "@/lib/store/commit-order";
import { commitStoredUpdate } from "@/lib/store/commit-stored";
import { canPersistDemo } from "@/lib/store/demo-write";

type DemoApi = {
  state: DemoState;
  setHouseholdId: (householdId: string) => void;
  setReminderChannel: (channel: Channel, enabled: boolean) => void;
  placeOrder: (input: PlaceOrderInput) => PlaceOrderResult;
  applyRollover: () => void;
  reset: () => void;
};

const DemoContext = createContext<DemoApi | null>(null);

const listeners = new Set<() => void>();
let cached: DemoState | null = null;
let lastWriteOk = true;

const memoryValues = new Map<string, string>();
const memoryStorage: KeyValueStorage = {
  getItem(key) {
    return memoryValues.get(key) ?? null;
  },
  setItem(key, value) {
    memoryValues.set(key, value);
  },
  removeItem(key) {
    memoryValues.delete(key);
  },
};

function storeUpdate(now: Date, change: (state: DemoState) => DemoState): boolean {
  if (!cached) {
    return false;
  }
  const before = JSON.stringify(cached);
  const outcome = commitStoredUpdate(browserStorage(), cached, now, change, {
    lastWriteFailed: !lastWriteOk,
  });
  if (outcome.saved !== null) {
    lastWriteOk = outcome.saved;
  }
  if (JSON.stringify(outcome.state) === before) {
    return false;
  }
  cached = outcome.state;
  return true;
}

function queueCachedReminders(now: Date): boolean {
  return storeUpdate(now, (state) => {
    if (state.seededOn !== zonedDate(now)) {
      return state;
    }
    const snapshot = queueDueReminders(state.snapshot, now);
    return snapshot === state.snapshot ? state : { ...state, snapshot };
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== DEMO_STORAGE_KEY) {
      return;
    }
    cached = loadDemoState(browserStorage(), new Date(readClock()));
    lastWriteOk = true;
    listener();
  };
  window.addEventListener("storage", onStorage);
  const stopClock = subscribeClock(() => {
    const now = new Date(readClock());
    if (cached && cached.seededOn !== zonedDate(now)) {
      listener();
      return;
    }
    if (cached && reminderWindowOpen(cached.snapshot, now) && queueCachedReminders(now)) {
      listener();
    }
  });
  if (queueCachedReminders(new Date(readClock()))) {
    listener();
  }
  return () => {
    window.removeEventListener("storage", onStorage);
    stopClock();
    listeners.delete(listener);
  };
}

function browserStorage(): KeyValueStorage {
  try {
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

function readStored(now: Date): DemoState {
  return loadDemoState(browserStorage(), now);
}

function readClient(): DemoState {
  const now = new Date(readClock());
  if (cached && cached.seededOn === zonedDate(now)) {
    return cached;
  }
  cached = resolveDemoState(cached, now, browserStorage());
  return cached;
}

function writableDemo(now: Date): DemoState | null {
  const current = readClient();
  if (!canPersistDemo(current.seededOn, now)) {
    notify();
    return null;
  }
  return current;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function publish(next: DemoState) {
  cached = next;
  lastWriteOk = saveDemoState(browserStorage(), next);
  notify();
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, readClient, () => null);

  const api = useMemo<DemoApi | null>(() => {
    if (!state) {
      return null;
    }

    return {
      state,
      setHouseholdId(householdId: string) {
        const now = new Date(readClock());
        if (!writableDemo(now)) {
          return;
        }
        const changed = storeUpdate(now, (state) => {
          if (!state.snapshot.households.some((household) => household.id === householdId)) {
            return state;
          }
          if (state.householdId === householdId) {
            return state;
          }
          return { ...state, householdId };
        });
        if (changed) {
          notify();
        }
      },
      setReminderChannel(channel: Channel, enabled: boolean) {
        const now = new Date(readClock());
        const current = writableDemo(now);
        if (!current) {
          return;
        }
        const householdId = current.householdId;
        const changed = storeUpdate(now, (state) => {
          const opted = setReminderOptIn(state.snapshot, householdId, channel, enabled);
          const snapshot = queueDueReminders(opted, now);
          if (opted === state.snapshot && snapshot === state.snapshot) {
            return state;
          }
          return { ...state, snapshot };
        });
        if (changed) {
          notify();
        }
      },
      placeOrder(input: PlaceOrderInput) {
        const now = new Date(readClock());
        const outcome = commitPlaceOrder(browserStorage(), readClient(), input, now, {
          lastWriteFailed: !lastWriteOk,
        });
        if (!outcome.ok) {
          return outcome;
        }
        cached = outcome.state;
        lastWriteOk = outcome.saved;
        notify();
        const result: PlaceOrderResult = {
          ok: true,
          snapshot: outcome.state.snapshot,
          order: outcome.order,
        };
        return result;
      },
      applyRollover() {
        const now = new Date(readClock());
        if (!writableDemo(now)) {
          return;
        }
        const changed = storeUpdate(now, (state) => {
          const snapshot = applySchoolYearRollover(state.snapshot, now);
          if (snapshot === state.snapshot) {
            return state;
          }
          return { ...state, snapshot };
        });
        if (changed) {
          notify();
        }
      },
      reset() {
        const now = new Date(readClock());
        const current = readClient();
        clearDemoState(browserStorage());
        const fresh = readStored(now);
        const householdId = fresh.snapshot.households.some(
          (household) => household.id === current.householdId,
        )
          ? current.householdId
          : fresh.householdId;
        publish({ ...fresh, householdId });
      },
    };
  }, [state]);

  return <DemoContext.Provider value={api}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoApi | null {
  return useContext(DemoContext);
}
