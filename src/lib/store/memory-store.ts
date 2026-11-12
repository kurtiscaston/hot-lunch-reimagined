import { createSeed } from "@/lib/domain/seed";
import type { LunchSnapshot } from "@/lib/domain/types";

import type { LunchStore } from "./lunch-store";

/** Seeded store for tests and for a browser adapter that persists snapshots. */
export function createMemoryStore(now: Date): LunchStore {
  let current = createSeed(now);

  return {
    read(): LunchSnapshot {
      return structuredClone(current);
    },
    write(next: LunchSnapshot): void {
      current = structuredClone(next);
    },
    reset(resetAt: Date): void {
      current = createSeed(resetAt);
    },
  };
}
