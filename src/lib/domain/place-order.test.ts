import { describe, expect, it } from "vitest";

import { placeOrder, placeOrderMessage } from "@/lib/domain/place-order";
import { createSeed, MENU_DAY_IDS } from "@/lib/domain/seed";
import type { LunchSnapshot } from "@/lib/domain/types";
import { SCHOOL_NAME } from "@/lib/site";

const CUTOFF = "2026-11-12T16:00:00.000Z";

function fixture(overrides?: Partial<LunchSnapshot>): LunchSnapshot {
  const base: LunchSnapshot = {
    schoolName: SCHOOL_NAME,
    schoolYearLabel: "2026–2027",
    rolloverApplied: false,
    households: [
      {
        id: "hh-brindle",
        name: "Brindle",
        email: "hello@brindle.example",
        phone: "555-010-1402",
        reminderOptIn: { email: true, sms: false },
        preferences: { dietaryNotes: "" },
      },
    ],
    students: [
      {
        id: "stu-ada-brindle",
        householdId: "hh-brindle",
        firstName: "Ada",
        lastName: "Brindle",
        grade: "K",
        archived: false,
      },
    ],
    vendors: [{ id: "ven-lantern", name: "Lantern Taco Cart" }],
    menuItems: [
      {
        id: "item-lantern-bean",
        vendorId: "ven-lantern",
        name: "Black bean taco",
        priceCents: 700,
      },
    ],
    menuDays: [
      {
        id: "day-open",
        label: "Thursday lunch",
        serviceDate: "2026-11-12",
        cutoffAt: CUTOFF,
        vendorId: "ven-lantern",
        itemIds: ["item-lantern-bean"],
      },
    ],
    orders: [],
    payments: [],
    reminders: [],
  };
  return { ...base, ...overrides };
}

const input = {
  studentId: "stu-ada-brindle",
  menuDayId: "day-open",
  itemId: "item-lantern-bean",
};

describe("placeOrder lock", () => {
  it("places an order one millisecond before the cutoff", () => {
    const snapshot = fixture();
    const now = new Date(Date.parse(CUTOFF) - 1);
    const result = placeOrder(snapshot, input, now);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.order.priceCents).toBe(700);
    expect(result.order.placedAt).toBe(now.toISOString());
    expect(result.snapshot.orders).toHaveLength(1);
    expect(snapshot.orders).toHaveLength(0);
  });

  it("locks at the cutoff instant and after it", () => {
    const snapshot = fixture();
    const atCutoff = placeOrder(snapshot, input, new Date(CUTOFF));
    const after = placeOrder(snapshot, input, new Date(Date.parse(CUTOFF) + 1));
    expect(atCutoff).toEqual({ ok: false, reason: "locked" });
    expect(after).toEqual({ ok: false, reason: "locked" });
    expect(placeOrderMessage("locked")).toBe("Ordering locked at the cutoff.");
    expect(snapshot.orders).toHaveLength(0);
  });

  it("rejects a second order for the same student and day", () => {
    const snapshot = fixture();
    const now = new Date(Date.parse(CUTOFF) - 1);
    const first = placeOrder(snapshot, input, now);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = placeOrder(first.snapshot, input, now);
    expect(second).toEqual({ ok: false, reason: "duplicate" });
  });

  it("rejects an archived student", () => {
    const snapshot = fixture();
    const student = snapshot.students[0];
    if (!student) {
      throw new Error("expected a student");
    }
    snapshot.students = [{ ...student, archived: true }];
    const result = placeOrder(snapshot, input, new Date(Date.parse(CUTOFF) - 1));
    expect(result).toEqual({ ok: false, reason: "archived" });
  });
});

describe("placeOrder against the Maple Hollow seed", () => {
  const now = new Date("2026-11-12T15:00:00.000Z");

  it("refuses the locked day and accepts an open day that has no order yet", () => {
    const snapshot = createSeed(now);
    const locked = placeOrder(
      snapshot,
      {
        studentId: "stu-ada-brindle",
        menuDayId: MENU_DAY_IDS.locked,
        itemId: "item-birch-melt",
      },
      now,
    );
    expect(locked).toEqual({ ok: false, reason: "locked" });

    const open = placeOrder(
      snapshot,
      {
        studentId: "stu-ada-brindle",
        menuDayId: MENU_DAY_IDS.open,
        itemId: "item-lantern-bean",
      },
      now,
    );
    expect(open.ok).toBe(true);
  });
});
