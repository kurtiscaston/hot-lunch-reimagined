"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import {
  placeOrder as placeOrderInSnapshot,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/lib/domain/place-order";
import {
  clearDemoState,
  loadDemoState,
  saveDemoState,
  type DemoState,
  type KeyValueStorage,
} from "@/lib/store/browser-store";

type DemoApi = {
  state: DemoState;
  setHouseholdId: (householdId: string) => void;
  placeOrder: (input: PlaceOrderInput) => PlaceOrderResult;
  reset: () => void;
};

const DemoContext = createContext<DemoApi | null>(null);

const listeners = new Set<() => void>();
let cached: DemoState | null = null;

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

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function browserStorage(): KeyValueStorage {
  try {
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

function readStored(now: Date): DemoState {
  try {
    return loadDemoState(browserStorage(), now);
  } catch {
    return loadDemoState(memoryStorage, now);
  }
}

function writeStored(state: DemoState) {
  try {
    saveDemoState(browserStorage(), state);
  } catch {
    saveDemoState(memoryStorage, state);
  }
}

function readClient(): DemoState {
  if (!cached) {
    cached = readStored(new Date());
  }
  return cached;
}

function publish(next: DemoState) {
  cached = next;
  writeStored(next);
  for (const listener of listeners) {
    listener();
  }
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
        const current = readClient();
        if (!current.snapshot.households.some((household) => household.id === householdId)) {
          return;
        }
        publish({ ...current, householdId });
      },
      placeOrder(input: PlaceOrderInput) {
        const current = readClient();
        const result = placeOrderInSnapshot(current.snapshot, input, new Date());
        if (result.ok) {
          publish({ ...current, snapshot: result.snapshot });
        }
        return result;
      },
      reset() {
        const current = readClient();
        const storage = browserStorage();
        try {
          clearDemoState(storage);
        } catch {
          clearDemoState(memoryStorage);
        }
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
