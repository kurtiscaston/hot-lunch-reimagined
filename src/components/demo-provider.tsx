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

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readClient(): DemoState {
  if (!cached) {
    cached = loadDemoState(window.localStorage, new Date());
  }
  return cached;
}

function publish(next: DemoState) {
  cached = next;
  saveDemoState(window.localStorage, next);
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
        clearDemoState(window.localStorage);
        const fresh = loadDemoState(window.localStorage, new Date());
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
