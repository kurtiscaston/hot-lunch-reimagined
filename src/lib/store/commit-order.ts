import { placeOrder, type PlaceOrderInput, type PlaceOrderResult } from "@/lib/domain/place-order";
import type { Order } from "@/lib/domain/types";

import {
  readValidDemoState,
  saveDemoState,
  type DemoState,
  type KeyValueStorage,
} from "./browser-store";

export type CommitPlaceOrderResult =
  | { ok: true; state: DemoState; order: Order; saved: boolean }
  | { ok: false; reason: Extract<PlaceOrderResult, { ok: false }>["reason"] };

export interface CommitPlaceOrderOptions {
  /** Storage is behind the in-memory board because the previous save failed. */
  lastWriteFailed?: boolean;
}

/**
 * Use storage only when it is today's valid demo. A missing, stale, or
 * invalid record keeps `fallback`, so an order is not placed on a new seed.
 * A failed previous write also keeps `fallback`, because storage would drop it.
 */
export function readLatestDemoState(
  storage: KeyValueStorage,
  fallback: DemoState,
  now: Date,
  lastWriteFailed: boolean,
): DemoState {
  if (lastWriteFailed) {
    return fallback;
  }
  return readValidDemoState(storage, now) ?? fallback;
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
  options?: CommitPlaceOrderOptions,
): CommitPlaceOrderResult {
  const lastWriteFailed = options?.lastWriteFailed === true;
  const base = readLatestDemoState(storage, fallback, now, lastWriteFailed);
  const applied = placeOrder(base.snapshot, input, now);
  if (!applied.ok) {
    return applied;
  }

  const latest = readLatestDemoState(storage, base, now, lastWriteFailed);
  const changed = JSON.stringify(latest) !== JSON.stringify(base);
  const confirmed = changed ? placeOrder(latest.snapshot, input, now) : applied;
  if (!confirmed.ok) {
    return confirmed;
  }

  const state: DemoState = {
    ...(changed ? latest : base),
    snapshot: confirmed.snapshot,
  };
  const saved = saveDemoState(storage, state);
  return { ok: true, state, order: confirmed.order, saved };
}
