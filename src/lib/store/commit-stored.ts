import { saveDemoState, type DemoState, type KeyValueStorage } from "./browser-store";
import { readLatestDemoState, type CommitPlaceOrderOptions } from "./commit-order";

export interface CommitStoredUpdate {
  state: DemoState;
  /** Null when nothing was written. */
  saved: boolean | null;
}

function sameDemo(left: DemoState, right: DemoState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Read the latest valid demo, apply `change`, then read once more before
 * writing so another tab's order is kept.
 */
export function commitStoredUpdate(
  storage: KeyValueStorage,
  fallback: DemoState,
  now: Date,
  change: (state: DemoState) => DemoState,
  options?: CommitPlaceOrderOptions,
): CommitStoredUpdate {
  const lastWriteFailed = options?.lastWriteFailed === true;
  const base = readLatestDemoState(storage, fallback, now, lastWriteFailed);
  const applied = change(base);
  const latest = readLatestDemoState(storage, base, now, lastWriteFailed);
  const next = sameDemo(latest, base) ? applied : change(latest);
  if (sameDemo(next, latest)) {
    return { state: latest, saved: null };
  }
  return { state: next, saved: saveDemoState(storage, next) };
}
