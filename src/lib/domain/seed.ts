import { menuDayStatus } from "@/lib/domain/cutoff";
import { schoolYearLabel } from "@/lib/domain/school-year";
import type {
  Household,
  LunchSnapshot,
  MenuDay,
  MenuItem,
  Order,
  Payment,
  PaymentMethod,
  Student,
  Vendor,
} from "@/lib/domain/types";
import { SCHOOL_NAME } from "@/lib/site";

const HOUR_MS = 60 * 60 * 1000;

export const MENU_DAY_IDS = {
  locked: "day-locked",
  imminent: "day-imminent",
  open: "day-open",
  later: "day-later",
} as const;

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function households(): Household[] {
  return [
    {
      id: "hh-hearthwell",
      name: "Hearthwell",
      email: "kitchen@hearthwell.example",
      phone: "555-010-1401",
      reminderOptIn: { email: true, sms: true },
      preferences: { dietaryNotes: "No peanuts in the house." },
    },
    {
      id: "hh-brindle",
      name: "Brindle",
      email: "hello@brindle.example",
      phone: "555-010-1402",
      reminderOptIn: { email: true, sms: false },
      preferences: { dietaryNotes: "Ada eats vegetarian." },
    },
    {
      id: "hh-coppermoss",
      name: "Coppermoss",
      email: "table@coppermoss.example",
      phone: "555-010-1403",
      reminderOptIn: { email: false, sms: true },
      preferences: { dietaryNotes: "" },
    },
    {
      id: "hh-dunlow",
      name: "Dunlow",
      email: "notes@dunlow.example",
      phone: "555-010-1404",
      reminderOptIn: { email: false, sms: false },
      preferences: { dietaryNotes: "Willa is gluten-free." },
    },
    {
      id: "hh-estervale",
      name: "Estervale",
      email: "porch@estervale.example",
      phone: "555-010-1405",
      reminderOptIn: { email: true, sms: true },
      preferences: { dietaryNotes: "" },
    },
    {
      id: "hh-farrowick",
      name: "Farrowick",
      email: "lunch@farrowick.example",
      phone: "555-010-1406",
      reminderOptIn: { email: true, sms: false },
      preferences: { dietaryNotes: "No tree nuts." },
    },
  ];
}

function students(): Student[] {
  return [
    student("stu-juniper-hearthwell", "hh-hearthwell", "Juniper", "Hearthwell", "2"),
    student("stu-moss-hearthwell", "hh-hearthwell", "Moss", "Hearthwell", "5"),
    student("stu-ada-brindle", "hh-brindle", "Ada", "Brindle", "K"),
    student("stu-theo-brindle", "hh-brindle", "Theo", "Brindle", "3"),
    student("stu-lumen-coppermoss", "hh-coppermoss", "Lumen", "Coppermoss", "1"),
    student("stu-sage-coppermoss", "hh-coppermoss", "Sage", "Coppermoss", "4"),
    student("stu-willa-dunlow", "hh-dunlow", "Willa", "Dunlow", "5"),
    student("stu-rowan-dunlow", "hh-dunlow", "Rowan", "Dunlow", "2"),
    student("stu-indigo-estervale", "hh-estervale", "Indigo", "Estervale", "3"),
    student("stu-pip-farrowick", "hh-farrowick", "Pip", "Farrowick", "1"),
    student("stu-nell-farrowick", "hh-farrowick", "Nell", "Farrowick", "K"),
    student("stu-calder-farrowick", "hh-farrowick", "Calder", "Farrowick", "4"),
  ];
}

function student(
  id: string,
  householdId: string,
  firstName: string,
  lastName: string,
  grade: Student["grade"],
): Student {
  return { id, householdId, firstName, lastName, grade, archived: false };
}

function vendors(): Vendor[] {
  return [
    { id: "ven-birch", name: "Birch & Rye Kitchen" },
    { id: "ven-pebble", name: "Pebble Noodle Co." },
    { id: "ven-lantern", name: "Lantern Taco Cart" },
    { id: "ven-harbor", name: "Harbor Grain Bakery" },
  ];
}

function menuItems(): MenuItem[] {
  return [
    item("item-birch-melt", "ven-birch", "Orchard grilled cheese", 700),
    item("item-birch-veggie", "ven-birch", "Harvest veggie melt", 750),
    item("item-pebble-sesame", "ven-pebble", "Sesame noodle bowl", 800),
    item("item-pebble-tofu", "ven-pebble", "Tofu noodle bowl", 800),
    item("item-lantern-citrus", "ven-lantern", "Citrus chicken taco", 750),
    item("item-lantern-bean", "ven-lantern", "Black bean taco", 700),
    item("item-harbor-roll", "ven-harbor", "Cheddar roll-up", 650),
    item("item-harbor-bake", "ven-harbor", "Apple oat bake", 650),
  ];
}

function item(id: string, vendorId: string, name: string, priceCents: number): MenuItem {
  return { id, vendorId, name, priceCents };
}

function missingStudentIds(menuDayId: string): ReadonlySet<string> {
  switch (menuDayId) {
    case MENU_DAY_IDS.locked:
      return new Set(["stu-sage-coppermoss"]);
    case MENU_DAY_IDS.imminent:
      return new Set(["stu-ada-brindle", "stu-indigo-estervale"]);
    case MENU_DAY_IDS.open:
      return new Set(["stu-ada-brindle", "stu-pip-farrowick", "stu-willa-dunlow"]);
    case MENU_DAY_IDS.later:
      return new Set([
        "stu-ada-brindle",
        "stu-pip-farrowick",
        "stu-indigo-estervale",
        "stu-rowan-dunlow",
        "stu-nell-farrowick",
      ]);
    default:
      return new Set();
  }
}

function itemsForVendor(items: MenuItem[], vendorId: string): MenuItem[] {
  const found = items.filter((entry) => entry.vendorId === vendorId);
  if (found.length < 2) {
    throw new Error(`Vendor ${vendorId} needs two meals`);
  }
  return found;
}

function menuDay(
  id: string,
  cutoff: Date,
  vendorId: string,
  items: MenuItem[],
): MenuDay {
  const vendorItems = itemsForVendor(items, vendorId);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(cutoff);
  return {
    id,
    label: `${weekday} lunch`,
    serviceDate: utcDate(cutoff),
    cutoffAt: cutoff.toISOString(),
    vendorId,
    itemIds: vendorItems.map((entry) => entry.id),
  };
}

function ordersFor(
  days: MenuDay[],
  roster: Student[],
  items: MenuItem[],
): Order[] {
  const itemLookup = new Map(items.map((entry) => [entry.id, entry]));
  const orders: Order[] = [];

  for (const day of days) {
    const missing = missingStudentIds(day.id);
    roster.forEach((pupil, index) => {
      if (missing.has(pupil.id)) {
        return;
      }
      const itemId = day.itemIds[index % day.itemIds.length];
      if (!itemId) {
        throw new Error(`Menu day ${day.id} has no meals`);
      }
      const menuItem = itemLookup.get(itemId);
      if (!menuItem) {
        throw new Error(`Unknown menu item ${itemId}`);
      }
      const placedAt = new Date(Date.parse(day.cutoffAt) - 3 * HOUR_MS).toISOString();
      orders.push({
        id: `ord-${pupil.id}-${day.id}`,
        studentId: pupil.id,
        menuDayId: day.id,
        itemId,
        priceCents: menuItem.priceCents,
        placedAt,
      });
    });
  }

  return orders;
}

function expectedCents(
  householdId: string,
  roster: Student[],
  orders: Order[],
): number {
  const studentIds = new Set(
    roster.filter((pupil) => pupil.householdId === householdId).map((pupil) => pupil.id),
  );
  return orders
    .filter((order) => studentIds.has(order.studentId))
    .reduce((sum, order) => sum + order.priceCents, 0);
}

function paymentsFor(
  rosterHouseholds: Household[],
  roster: Student[],
  orders: Order[],
  now: Date,
): Payment[] {
  const payments: Payment[] = [];
  for (const household of rosterHouseholds) {
    const expected = expectedCents(household.id, roster, orders);
    if (expected <= 0) {
      throw new Error(`${household.id} has no orders to reconcile`);
    }
    const amount = paymentAmount(household.id, expected);
    if (amount === null) {
      continue;
    }
    payments.push({
      id: `pay-${household.id}`,
      householdId: household.id,
      amountCents: amount,
      receivedAt: now.toISOString(),
      method: paymentMethod(household.id),
      reference: `MOCK-${household.name.toUpperCase()}`,
    });
  }
  return payments;
}

function paymentAmount(householdId: string, expected: number): number | null {
  switch (householdId) {
    case "hh-hearthwell":
      return expected + 800;
    case "hh-brindle":
    case "hh-estervale":
      return expected;
    case "hh-coppermoss":
      return null;
    case "hh-dunlow":
      if (expected <= 350) {
        throw new Error("Dunlow total is too small for a partial payment");
      }
      return expected - 350;
    case "hh-farrowick":
      return expected + 250;
    default:
      throw new Error(`No payment rule for ${householdId}`);
  }
}

function paymentMethod(householdId: string): PaymentMethod {
  switch (householdId) {
    case "hh-hearthwell":
      return "mock-transfer";
    case "hh-brindle":
      return "check";
    case "hh-dunlow":
      return "cash";
    case "hh-estervale":
      return "mock-transfer";
    case "hh-farrowick":
      return "check";
    default:
      return "cash";
  }
}

/**
 * Fictional Maple Hollow roster. Dates are relative to `now` so a locked day,
 * an imminent countdown, and open days exist whenever the demo is opened.
 */
export function createSeed(now: Date): LunchSnapshot {
  const items = menuItems();
  const days = [
    menuDay(MENU_DAY_IDS.locked, new Date(now.getTime() - 26 * HOUR_MS), "ven-birch", items),
    menuDay(MENU_DAY_IDS.imminent, new Date(now.getTime() + 90 * 60 * 1000), "ven-pebble", items),
    menuDay(MENU_DAY_IDS.open, new Date(now.getTime() + 48 * HOUR_MS), "ven-lantern", items),
    menuDay(MENU_DAY_IDS.later, new Date(now.getTime() + 96 * HOUR_MS), "ven-harbor", items),
  ];
  const roster = students();
  const orders = ordersFor(days, roster, items);

  const snapshot: LunchSnapshot = {
    schoolName: SCHOOL_NAME,
    schoolYearLabel: schoolYearLabel(now),
    rolloverApplied: false,
    households: households(),
    students: roster,
    vendors: vendors(),
    menuItems: items,
    menuDays: days,
    orders,
    payments: paymentsFor(households(), roster, orders, now),
    reminders: [],
  };

  const statuses = new Set(days.map((day) => menuDayStatus(day.cutoffAt, now)));
  if (!statuses.has("locked") || !statuses.has("imminent") || !statuses.has("open")) {
    throw new Error("Seed must include a locked, imminent, and open menu day");
  }

  return snapshot;
}
