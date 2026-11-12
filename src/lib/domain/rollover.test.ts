import { describe, expect, it } from "vitest";

import { placeOrder } from "@/lib/domain/place-order";
import { dueReminders } from "@/lib/domain/reminders";
import { applyRollover, describeChange, previewRollover } from "@/lib/domain/rollover";
import { createSeed, MENU_DAY_IDS } from "@/lib/domain/seed";
import { zonedDate } from "@/lib/domain/time-zone";
import { loadDemoState, saveDemoState, type KeyValueStorage } from "@/lib/store/browser-store";

const NOW = new Date("2026-11-12T15:00:00.000Z");

function memory(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

describe("school-year rollover", () => {
  it("previews grade moves and keeps household preferences", () => {
    const snapshot = createSeed(NOW);
    const preview = previewRollover(snapshot);

    expect(preview.alreadyApplied).toBe(false);
    expect(preview.fromYear).toBe("2026–2027");
    expect(preview.toYear).toBe("2027–2028");
    expect(preview.households.find((household) => household.id === "hh-brindle")).toMatchObject({
      dietaryNotes: "Ada eats vegetarian.",
      email: true,
      sms: false,
    });
    const ada = preview.changes.find((change) => change.studentId === "stu-ada-brindle");
    expect(ada).toMatchObject({ from: "K", to: "1" });
    expect(ada ? describeChange(ada) : "").toBe("Ada Brindle moves from Kindergarten to Grade 1.");
    expect(
      preview.changes.find((change) => change.studentId === "stu-moss-hearthwell"),
    ).toMatchObject({ from: "5", to: "archived" });
    expect(preview.ordersArchived).toBe(snapshot.orders.length);
  });

  it("advances grades, archives the graduating class, and keeps a new menu orderable", () => {
    const snapshot = createSeed(NOW);
    const rolled = applyRollover(snapshot, NOW);

    expect(rolled.schoolYearLabel).toBe("2027–2028");
    expect(rolled.rolloverApplied).toBe(true);
    expect(rolled.households.find((household) => household.id === "hh-brindle")?.preferences).toEqual(
      snapshot.households.find((household) => household.id === "hh-brindle")?.preferences,
    );
    expect(rolled.students.find((pupil) => pupil.id === "stu-ada-brindle")).toMatchObject({
      grade: "1",
      archived: false,
    });
    expect(rolled.students.find((pupil) => pupil.id === "stu-juniper-hearthwell")).toMatchObject({
      grade: "3",
      archived: false,
    });
    expect(rolled.students.find((pupil) => pupil.id === "stu-moss-hearthwell")).toMatchObject({
      grade: "5",
      archived: true,
    });
    expect(rolled.students.find((pupil) => pupil.id === "stu-willa-dunlow")?.archived).toBe(true);
    expect(rolled.orders.every((order) => order.archived && order.menuDayId.startsWith("prior-"))).toBe(
      true,
    );
    expect(rolled.reminders.every((reminder) => reminder.archived)).toBe(true);
    expect(rolled.payments).toBe(snapshot.payments);
    expect(rolled.menuDays.some((day) => day.id === MENU_DAY_IDS.open && !day.archived)).toBe(true);
    expect(rolled.menuDays.some((day) => day.id === `prior-${MENU_DAY_IDS.open}` && day.archived)).toBe(
      true,
    );

    const again = applyRollover(rolled, NOW);
    expect(again).toBe(rolled);
    expect(previewRollover(rolled).alreadyApplied).toBe(true);

    const placed = placeOrder(
      rolled,
      {
        studentId: "stu-ada-brindle",
        menuDayId: MENU_DAY_IDS.open,
        itemId: "item-lantern-citrus",
      },
      NOW,
    );
    expect(placed.ok).toBe(true);
    expect(dueReminders(rolled, NOW).some((reminder) => reminder.householdId === "hh-brindle")).toBe(
      true,
    );
  });

  it("round-trips an archived year through demo storage", () => {
    const snapshot = createSeed(NOW);
    const rolled = applyRollover(snapshot, NOW);
    const storage = memory();
    saveDemoState(storage, {
      householdId: "hh-brindle",
      seededOn: zonedDate(NOW),
      snapshot: rolled,
    });

    const loaded = loadDemoState(storage, NOW);
    expect(loaded.snapshot.schoolYearLabel).toBe("2027–2028");
    expect(loaded.snapshot.students.find((pupil) => pupil.id === "stu-moss-hearthwell")?.archived).toBe(
      true,
    );
    expect(loaded.snapshot.orders.every((order) => order.archived === true)).toBe(true);
    expect(loaded.snapshot.menuDays.some((day) => day.archived === true)).toBe(true);
  });
});
