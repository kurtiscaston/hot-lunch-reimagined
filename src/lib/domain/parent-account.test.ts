import { describe, expect, it } from "vitest";

import { DEMO_NOW } from "@/lib/domain/demo-now";
import {
  balanceFor,
  divisionLabel,
  householdLedger,
  owingCents,
  periodBadge,
} from "@/lib/domain/parent-account";
import { createSeed } from "@/lib/domain/seed";

describe("parent account", () => {
  const snapshot = createSeed(DEMO_NOW);

  it("owes nothing when the household is paid up or in credit", () => {
    const brindle = balanceFor(snapshot, "hh-brindle");
    const hearthwell = balanceFor(snapshot, "hh-hearthwell");
    if (!brindle || !hearthwell) {
      throw new Error("seed is missing a household balance");
    }
    expect(brindle.status).toBe("paid");
    expect(owingCents(brindle)).toBe(0);
    expect(hearthwell.status).toBe("credit");
    expect(owingCents(hearthwell)).toBe(0);
  });

  it("uses the shortfall as the amount owing", () => {
    const dunlow = balanceFor(snapshot, "hh-dunlow");
    if (!dunlow) {
      throw new Error("seed is missing Dunlow");
    }
    expect(dunlow.status).toBe("short");
    expect(owingCents(dunlow)).toBe(-dunlow.differenceCents);
    expect(owingCents(dunlow)).toBeGreaterThan(0);
  });

  it("keeps the ledger balance equal to owed minus paid", () => {
    for (const household of snapshot.households) {
      const balance = balanceFor(snapshot, household.id);
      const ledger = householdLedger(snapshot, household.id);
      if (!balance) {
        throw new Error(`missing balance for ${household.id}`);
      }
      const last = ledger.at(-1);
      expect(last?.balanceCents ?? 0).toBe(balance.owedCents - balance.paidCents);
      expect(ledger.some((entry) => entry.kind === "ORD" || entry.kind === "PAY")).toBe(true);
    }
  });

  it("leaves an archived student's orders out of the ledger", () => {
    const copy = createSeed(DEMO_NOW);
    const ada = copy.students.find((pupil) => pupil.id === "stu-ada-brindle");
    if (!ada) {
      throw new Error("seed is missing Ada");
    }
    copy.students = copy.students.map((pupil) =>
      pupil.id === ada.id ? { ...pupil, archived: true } : pupil,
    );
    const ledger = householdLedger(copy, "hh-brindle");
    expect(ledger.some((entry) => entry.what.includes("Ada Brindle"))).toBe(false);
    expect(ledger.some((entry) => entry.what.includes("Theo Brindle"))).toBe(true);
  });

  it("marks a placed unpaid day as reserved and a gap as not ordered", () => {
    expect(periodBadge({ missing: true, locked: false, status: "paid" })).toBe("Not ordered");
    expect(periodBadge({ missing: false, locked: false, status: "short" })).toBe("Reserved");
    expect(periodBadge({ missing: false, locked: true, status: "paid" })).toBe("Paid");
    expect(divisionLabel("K")).toBe("Primary");
    expect(divisionLabel("5")).toBe("Intermediate");
  });
});
