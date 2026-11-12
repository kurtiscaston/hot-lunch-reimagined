import { isOrderingLocked } from "@/lib/domain/cutoff";
import type { LunchSnapshot, Order } from "@/lib/domain/types";

export interface PlaceOrderInput {
  studentId: string;
  menuDayId: string;
  itemId: string;
}

export type PlaceOrderReason =
  | "unknown-student"
  | "archived"
  | "unknown-day"
  | "locked"
  | "item-not-on-day"
  | "unknown-item"
  | "duplicate";

export type PlaceOrderResult =
  | { ok: true; snapshot: LunchSnapshot; order: Order }
  | { ok: false; reason: PlaceOrderReason };

export function placeOrderMessage(reason: PlaceOrderReason): string {
  switch (reason) {
    case "unknown-student":
      return "That student is not in this demo.";
    case "archived":
      return "Archived students are not on the order list.";
    case "unknown-day":
      return "That menu day is not available.";
    case "locked":
      return "Ordering locked at the cutoff.";
    case "item-not-on-day":
      return "That meal is not served on this day.";
    case "unknown-item":
      return "That meal is not on the menu.";
    case "duplicate":
      return "This student already has an order for that day.";
  }
}

/** Place one meal for one student. Locks at the cutoff instant. Does not mutate `snapshot`. */
export function placeOrder(
  snapshot: LunchSnapshot,
  input: PlaceOrderInput,
  now: Date,
): PlaceOrderResult {
  const pupil = snapshot.students.find((entry) => entry.id === input.studentId);
  if (!pupil) {
    return { ok: false, reason: "unknown-student" };
  }
  if (pupil.archived) {
    return { ok: false, reason: "archived" };
  }

  const day = snapshot.menuDays.find((entry) => entry.id === input.menuDayId);
  if (!day) {
    return { ok: false, reason: "unknown-day" };
  }
  if (day.archived || isOrderingLocked(day.cutoffAt, now)) {
    return { ok: false, reason: "locked" };
  }
  if (!day.itemIds.includes(input.itemId)) {
    return { ok: false, reason: "item-not-on-day" };
  }

  const menuItem = snapshot.menuItems.find((entry) => entry.id === input.itemId);
  if (!menuItem) {
    return { ok: false, reason: "unknown-item" };
  }
  if (
    snapshot.orders.some(
      (order) =>
        !order.archived &&
        order.studentId === input.studentId &&
        order.menuDayId === input.menuDayId,
    )
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const order: Order = {
    id: `ord-${input.studentId}-${input.menuDayId}`,
    studentId: input.studentId,
    menuDayId: input.menuDayId,
    itemId: input.itemId,
    priceCents: menuItem.priceCents,
    placedAt: now.toISOString(),
  };

  return {
    ok: true,
    order,
    snapshot: { ...snapshot, orders: [...snapshot.orders, order] },
  };
}
