import { describe, expect, it } from "vitest";

import { menuDayStatus } from "@/lib/domain/cutoff";
import { createSeed, MENU_DAY_IDS } from "@/lib/domain/seed";
import { zonedDate } from "@/lib/domain/time-zone";
import { GRADES, GRADUATING_GRADE, type LunchSnapshot, type MenuDay } from "@/lib/domain/types";
import { SCHOOL_NAME } from "@/lib/site";

const NOW = new Date("2026-11-12T15:00:00.000Z");

function byId<T extends { id: string }>(records: T[], id: string): T {
  const found = records.find((record) => record.id === id);
  if (!found) {
    throw new Error(`Missing ${id}`);
  }
  return found;
}


function expectedCents(snapshot: LunchSnapshot, householdId: string): number {
  const studentIds = new Set(
    snapshot.students
      .filter((pupil) => pupil.householdId === householdId)
      .map((pupil) => pupil.id),
  );
  return snapshot.orders
    .filter((order) => studentIds.has(order.studentId))
    .reduce((sum, order) => sum + order.priceCents, 0);
}

function receivedCents(snapshot: LunchSnapshot, householdId: string): number {
  return snapshot.payments
    .filter((payment) => payment.householdId === householdId)
    .reduce((sum, payment) => sum + payment.amountCents, 0);
}

function isUpcoming(day: MenuDay, now: Date): boolean {
  return day.serviceDate >= zonedDate(now);
}

describe("Maple Hollow seed", () => {
  const snapshot = createSeed(NOW);

  it("is deterministic for the same instant", () => {
    expect(createSeed(NOW)).toEqual(snapshot);
  });

  it("names the fictional school and the current school year", () => {
    expect(snapshot.schoolName).toBe(SCHOOL_NAME);
    expect(snapshot.schoolName).toBe("Maple Hollow Elementary");
    expect(snapshot.schoolYearLabel).toBe("2026–2027");
    expect(snapshot.rolloverApplied).toBe(false);
    expect(snapshot.reminders).toEqual([]);
  });

  it("uses a fictional roster with every grade, including graduates", () => {
    expect(snapshot.households.length).toBeGreaterThanOrEqual(6);
    expect(snapshot.vendors.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.students.length).toBeGreaterThanOrEqual(12);

    const grades = new Set(snapshot.students.map((pupil) => pupil.grade));
    expect([...grades].sort()).toEqual([...GRADES].sort());
    expect(
      snapshot.students.some(
        (pupil) => pupil.grade === GRADUATING_GRADE && !pupil.archived,
      ),
    ).toBe(true);
    expect(snapshot.students.every((pupil) => !pupil.archived)).toBe(true);

    for (const household of snapshot.households) {
      expect(household.email.endsWith(".example")).toBe(true);
      expect(household.phone.startsWith("555-")).toBe(true);
      expect(household.name.length).toBeGreaterThan(0);
      expect(
        snapshot.students.some((pupil) => pupil.householdId === household.id),
      ).toBe(true);
    }

    for (const pupil of snapshot.students) {
      expect(snapshot.households.some((household) => household.id === pupil.householdId)).toBe(
        true,
      );
    }
  });

  it("varies reminder opt-in by household and channel", () => {
    const patterns = snapshot.households.map(
      (household) =>
        `${household.reminderOptIn.email ? "email" : "no-email"}/${household.reminderOptIn.sms ? "sms" : "no-sms"}`,
    );
    expect(new Set(patterns)).toEqual(
      new Set(["email/sms", "email/no-sms", "no-email/sms", "no-email/no-sms"]),
    );
  });

  it("includes a locked day, an imminent day, and open days", () => {
    const byStatus = {
      locked: snapshot.menuDays.filter((day) => menuDayStatus(day.cutoffAt, NOW) === "locked"),
      imminent: snapshot.menuDays.filter(
        (day) => menuDayStatus(day.cutoffAt, NOW) === "imminent",
      ),
      open: snapshot.menuDays.filter((day) => menuDayStatus(day.cutoffAt, NOW) === "open"),
    };
    expect(byStatus.locked.map((day) => day.id)).toEqual([MENU_DAY_IDS.locked]);
    expect(byStatus.imminent.map((day) => day.id)).toEqual([MENU_DAY_IDS.imminent]);
    expect(byStatus.open.map((day) => day.id).sort()).toEqual(
      [MENU_DAY_IDS.open, MENU_DAY_IDS.later].sort(),
    );

    const serviceDates = snapshot.menuDays.map((day) => day.serviceDate);
    expect(new Set(serviceDates).size).toBe(serviceDates.length);

    for (const day of snapshot.menuDays) {
      expect(day.serviceDate).toBe(zonedDate(new Date(day.cutoffAt)));
      expect(snapshot.vendors.some((vendor) => vendor.id === day.vendorId)).toBe(true);
      expect(day.itemIds.length).toBeGreaterThan(0);
      for (const itemId of day.itemIds) {
        const menuItem = byId(snapshot.menuItems, itemId);
        expect(menuItem.vendorId).toBe(day.vendorId);
        expect(menuItem.priceCents).toBeGreaterThan(0);
      }
    }
  });

  it("keeps orders inside the cutoff and prices them from the menu", () => {
    const seen = new Set<string>();
    for (const order of snapshot.orders) {
      const day = byId(snapshot.menuDays, order.menuDayId);
      const menuItem = byId(snapshot.menuItems, order.itemId);
      expect(snapshot.students.some((pupil) => pupil.id === order.studentId)).toBe(true);
      expect(day.itemIds).toContain(order.itemId);
      expect(order.priceCents).toBe(menuItem.priceCents);
      expect(Date.parse(order.placedAt)).toBeLessThan(Date.parse(day.cutoffAt));
      const key = `${order.studentId}:${order.menuDayId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("leaves some active students without an upcoming order", () => {
    const upcoming = snapshot.menuDays.filter((day) => isUpcoming(day, NOW));
    expect(upcoming.length).toBeGreaterThan(0);
    const missing = snapshot.students.filter(
      (pupil) =>
        !pupil.archived &&
        upcoming.some(
          (day) =>
            !snapshot.orders.some(
              (order) => order.studentId === pupil.id && order.menuDayId === day.id,
            ),
        ),
    );
    expect(missing.map((pupil) => pupil.id)).toEqual(
      expect.arrayContaining(["stu-ada-brindle", "stu-pip-farrowick", "stu-indigo-estervale"]),
    );
  });

  it("reconciles to paid, unpaid, and overpaid households", () => {
    const balances = snapshot.households.map((household) => {
      return receivedCents(snapshot, household.id) - expectedCents(snapshot, household.id);
    });
    expect(balances.some((balance) => balance === 0)).toBe(true);
    expect(balances.some((balance) => balance < 0)).toBe(true);
    expect(balances.some((balance) => balance > 0)).toBe(true);

    expect(receivedCents(snapshot, "hh-coppermoss")).toBe(0);
    expect(expectedCents(snapshot, "hh-coppermoss")).toBeGreaterThan(0);
    expect(receivedCents(snapshot, "hh-brindle")).toBe(expectedCents(snapshot, "hh-brindle"));
    expect(receivedCents(snapshot, "hh-hearthwell")).toBeGreaterThan(
      expectedCents(snapshot, "hh-hearthwell"),
    );

    for (const payment of snapshot.payments) {
      expect(snapshot.households.some((household) => household.id === payment.householdId)).toBe(
        true,
      );
      expect(payment.amountCents).toBeGreaterThan(0);
      expect(payment.reference.startsWith("MOCK-")).toBe(true);
    }
  });

  it("still balances when the clock is in another school year", () => {
    const spring = createSeed(new Date("2026-03-02T08:00:00.000Z"));
    expect(spring.schoolYearLabel).toBe("2025–2026");
    expect(spring.menuDays.some((day) => menuDayStatus(day.cutoffAt, new Date("2026-03-02T08:00:00.000Z")) === "locked")).toBe(true);
    expect(spring.orders.length).toBeGreaterThan(0);
  });
});
