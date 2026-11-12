import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/domain/seed";

import { createMemoryStore } from "./memory-store";

const NOW = new Date("2026-11-12T15:00:00.000Z");
const LATER = new Date("2026-11-20T15:00:00.000Z");

describe("memory store", () => {
  it("returns a copy of the seed", () => {
    const store = createMemoryStore(NOW);
    const first = store.read();
    expect(first).toEqual(createSeed(NOW));

    const household = first.households[0];
    if (!household) {
      throw new Error("expected a household");
    }
    household.name = "Changed";
    expect(store.read().households[0]?.name).not.toBe("Changed");
  });

  it("keeps writes until reset", () => {
    const store = createMemoryStore(NOW);
    const edited = store.read();
    edited.rolloverApplied = true;
    store.write(edited);
    expect(store.read().rolloverApplied).toBe(true);

    edited.rolloverApplied = false;
    expect(store.read().rolloverApplied).toBe(true);

    store.reset(LATER);
    expect(store.read()).toEqual(createSeed(LATER));
  });
});
