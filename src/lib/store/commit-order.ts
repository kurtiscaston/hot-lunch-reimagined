import { placeOrder, type PlaceOrderInput, type PlaceOrderResult } from "@/lib/domain/place-order";
import type { Order } from "@/lib/domain/types";

import {
  DEMO_STORAGE_KEY,
  loadDemoState,
  saveDemoState,
  type DemoState,
  type KeyValueStorage,
} from "./browser-store";

export type CommitPlaceOrderResult =
  | { ok: true; state: DemoState; order: Order }
  | { ok: false; reason: Extract<PlaceOrderResult, { ok: false }>["reason"] };

/** Validated storage wins over a stale in-memory copy. A blocked read keeps the fallback. */
function readLatestDemoState(
  storage: KeyValueStorage,
  fallback: DemoState,
  now: Date,
): DemoState {
  let raw: string | null;
  try {
    raw = storage.getItem(DEMO_STORAGE_KEY);
  } catch {
    return fallback;
  }
  if (raw === null) {
    return fallback;
  }
  return loadDemoState(
    {
      getItem() {
        return raw;
      },
      setItem() {
        // Validation only reads.
      },
      removeItem() {
        // Validation only reads.
      },
    },
    now,
  );
}

/**
 * Place an order on the snapshot currently in storage, then read once more
 * before writing so a second tab's order is kept.
 */
export function commitPlaceOrder(
  storage: KeyValueStorage,
  fallback: DemoState,
  input: PlaceOrderInput,
  now: Date,
): CommitPlaceOrderResult {
  const base = readLatestDemoState(storage, fallback, now);
  const applied = placeOrder(base.snapshot, input, now);
  if (!applied.ok) {
    return applied;
  }

  const latest = readLatestDemoState(storage, base, now);
  const changed = JSON.stringify(latest) !== JSON.stringify(base);
  const confirmed = changed ? placeOrder(latest.snapshot, input, now) : applied;
  if (!confirmed.ok) {
    return confirmed;
  }

  const state: DemoState = {
    ...(changed ? latest : base),
    snapshot: confirmed.snapshot,
  };
  saveDemoState(storage, state);
  return { ok: true, state, order: confirmed.order };
}
