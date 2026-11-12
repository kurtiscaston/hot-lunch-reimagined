import { describe, expect, it } from "vitest";

import { dueReminders, queueDueReminders, setReminderOptIn } from "@/lib/domain/reminders";
import { createSeed, MENU_DAY_IDS } from "@/lib/domain/seed";

const NOW = new Date("2026-11-12T15:00:00.000Z");

describe("mock reminders", () => {
  it("queues email and text only for opted-in households still missing a meal", () => {
    const snapshot = createSeed(NOW);
    const due = dueReminders(snapshot, NOW);
    expect(due.map((reminder) => reminder.id).sort()).toEqual(
      [
        `rem-hh-brindle-${MENU_DAY_IDS.imminent}-email`,
        `rem-hh-estervale-${MENU_DAY_IDS.imminent}-email`,
        `rem-hh-estervale-${MENU_DAY_IDS.imminent}-sms`,
      ].sort(),
    );
    expect(due.every((reminder) => reminder.status === "mock-sent")).toBe(true);
    expect(due.every((reminder) => reminder.body.includes("No message was sent."))).toBe(true);
    expect(due.some((reminder) => reminder.householdId === "hh-dunlow")).toBe(false);
    expect(due.some((reminder) => reminder.menuDayId === MENU_DAY_IDS.locked)).toBe(false);
    expect(due.some((reminder) => reminder.menuDayId === MENU_DAY_IDS.open)).toBe(false);
  });

  it("skips a day that has no meals", () => {
    const snapshot = createSeed(NOW);
    const emptied = {
      ...snapshot,
      menuDays: snapshot.menuDays.map((day) =>
        day.id === MENU_DAY_IDS.imminent ? { ...day, itemIds: [] } : day,
      ),
    };
    expect(dueReminders(emptied, NOW)).toEqual([]);
  });

  it("does not queue the same reminder twice", () => {
    const snapshot = createSeed(NOW);
    const once = queueDueReminders(snapshot, NOW);
    expect(queueDueReminders(once, NOW)).toBe(once);
    expect(dueReminders(once, NOW)).toEqual([]);
  });

  it("skips a household after every student on that day has an order", () => {
    const snapshot = createSeed(NOW);
    const ordered = {
      ...snapshot,
      orders: [
        ...snapshot.orders,
        {
          id: "ord-extra-ada",
          studentId: "stu-ada-brindle",
          menuDayId: MENU_DAY_IDS.imminent,
          itemId: "item-pebble-tofu",
          priceCents: 800,
          placedAt: NOW.toISOString(),
        },
      ],
    };
    expect(
      dueReminders(ordered, NOW).some((reminder) => reminder.householdId === "hh-brindle"),
    ).toBe(false);
  });

  it("changes one channel without dropping the other", () => {
    const snapshot = createSeed(NOW);
    const next = setReminderOptIn(snapshot, "hh-brindle", "sms", true);
    const brindle = next.households.find((household) => household.id === "hh-brindle");
    expect(brindle?.reminderOptIn).toEqual({ email: true, sms: true });
    expect(setReminderOptIn(next, "hh-brindle", "sms", true)).toBe(next);
    expect(setReminderOptIn(snapshot, "missing", "email", false)).toBe(snapshot);
  });
});
