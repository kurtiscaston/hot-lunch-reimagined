"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { readClock, subscribeClock } from "@/lib/clock";
import { type PlaceOrderInput, type PlaceOrderResult } from "@/lib/domain/place-order";
import { queueDueReminders, setReminderOptIn } from "@/lib/domain/reminders";
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

type DemoApi = {
  state: DemoState;
  setHouseholdId: (householdId: string) => void;
  setReminderChannel: (channel: Channel, enabled: boolean) => void;
  placeOrder: (input: PlaceOrderInput) => PlaceOrderResult;
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
    cached = loadDemoState(browserStorage(), new Date());
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
    if (queueCachedReminders(now)) {
      listener();
    }
  });
  queueCachedReminders(new Date(readClock()));
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
  const now = new Date();
  if (cached && cached.seededOn === zonedDate(now)) {
    return cached;
  }
  cached = resolveDemoState(cached, now, browserStorage());
  return cached;
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
        const changed = storeUpdate(new Date(readClock()), (state) => {
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
        const householdId = readClient().householdId;
        const now = new Date(readClock());
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
        const outcome = commitPlaceOrder(browserStorage(), readClient(), input, new Date(), {
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
      reset() {
        const current = readClient();
        clearDemoState(browserStorage());
        const fresh = readStored(new Date());
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
