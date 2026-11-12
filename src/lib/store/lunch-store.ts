import type { LunchSnapshot } from "@/lib/domain/types";

/**
 * Persistence boundary for hot lunch data.
 * Domain rules stay in pure functions. A database can replace this later.
 * Serverless instances are not expected to remember writes.
 */
export interface LunchStore {
  read(): LunchSnapshot;
  write(next: LunchSnapshot): void;
  reset(now: Date): void;
}
