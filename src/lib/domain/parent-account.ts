import { isOrderingLocked } from "@/lib/domain/cutoff";
import {
  reconcileHouseholds,
  toCsv,
  type BalanceStatus,
  type HouseholdBalance,
} from "@/lib/domain/dashboard";
import { formatDateTime, formatPrice } from "@/lib/domain/time-zone";
import type {
  Grade,
  LunchSnapshot,
  MenuDay,
  Order,
  PaymentMethod,
  Student,
} from "@/lib/domain/types";

export function gradeLabel(grade: Grade): string {
  return grade === "K" ? "Kindergarten" : `Grade ${grade}`;
}

/**
 * Grade band shown on a student card. It is not a teacher and not a person's name.
 * K–3 is Primary. Grades 4 and 5 are Intermediate.
 */
export function divisionLabel(grade: Grade): "Primary" | "Intermediate" {
  return grade === "4" || grade === "5" ? "Intermediate" : "Primary";
}

export function initials(firstName: string, lastName: string): string {
  const first = firstName.charAt(0);
  const last = lastName.charAt(0);
  return `${first}${last}`.toUpperCase();
}

export function householdStudents(snapshot: LunchSnapshot, householdId: string): Student[] {
  return snapshot.students.filter(
    (pupil) => pupil.householdId === householdId && !pupil.archived,
  );
}

export function balanceFor(
  snapshot: LunchSnapshot,
  householdId: string,
): HouseholdBalance | null {
  return reconcileHouseholds(snapshot).find((row) => row.householdId === householdId) ?? null;
}

/** What the household still owes. Paid-up and credit balances owe nothing. */
export function owingCents(balance: HouseholdBalance): number {
  return balance.differenceCents < 0 ? -balance.differenceCents : 0;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "check":
      return "Check";
    case "mock-transfer":
      return "Mock transfer";
  }
}

export type PeriodBadge = "Not ordered" | "Paid" | "Reserved" | "No order";

export function periodBadge(input: {
  missing: boolean;
  locked: boolean;
  status: BalanceStatus;
}): PeriodBadge {
  if (input.missing) {
    return input.locked ? "No order" : "Not ordered";
  }
  if (input.status === "short") {
    return "Reserved";
  }
  return "Paid";
}

export function householdDayCents(
  snapshot: LunchSnapshot,
  householdId: string,
  menuDayId: string,
): number {
  const ids = new Set(householdStudents(snapshot, householdId).map((pupil) => pupil.id));
  return snapshot.orders
    .filter(
      (order) => !order.archived && order.menuDayId === menuDayId && ids.has(order.studentId),
    )
    .reduce((sum, order) => sum + order.priceCents, 0);
}

export function activeMenuDays(snapshot: LunchSnapshot): MenuDay[] {
  return snapshot.menuDays
    .filter((day) => !day.archived)
    .sort((left, right) => left.cutoffAt.localeCompare(right.cutoffAt));
}

export function nextOpenDay(snapshot: LunchSnapshot, now: Date): MenuDay | null {
  return activeMenuDays(snapshot).find((day) => !isOrderingLocked(day.cutoffAt, now)) ?? null;
}

export function studentMissingOrder(orders: Order[], studentId: string, menuDayId: string): boolean {
  return !orders.some(
    (order) => !order.archived && order.studentId === studentId && order.menuDayId === menuDayId,
  );
}

export type LedgerKind = "ORD" | "PAY";

export interface LedgerEntry {
  id: string;
  at: string;
  kind: LedgerKind;
  what: string;
  reference: string;
  chargeCents: number | null;
  paidCents: number | null;
  balanceCents: number;
}

/** Orders and payments for one household, oldest first, with a running balance. */
export function householdLedger(snapshot: LunchSnapshot, householdId: string): LedgerEntry[] {
  const students = snapshot.students.filter((pupil) => pupil.householdId === householdId);
  const byId = new Map(students.map((pupil) => [pupil.id, pupil]));
  const pending: Omit<LedgerEntry, "balanceCents">[] = [];

  for (const order of snapshot.orders) {
    if (order.archived || !byId.has(order.studentId)) {
      continue;
    }
    const pupil = byId.get(order.studentId);
    const day = snapshot.menuDays.find((entry) => entry.id === order.menuDayId);
    const item = snapshot.menuItems.find((entry) => entry.id === order.itemId);
    pending.push({
      id: order.id,
      at: order.placedAt,
      kind: "ORD",
      what: [
        day?.label ?? "Lunch",
        pupil ? `${pupil.firstName} ${pupil.lastName}` : "Student",
        item?.name ?? "Meal",
      ].join(" · "),
      reference: order.id,
      chargeCents: order.priceCents,
      paidCents: null,
    });
  }

  for (const payment of snapshot.payments) {
    if (payment.archived || payment.householdId !== householdId) {
      continue;
    }
    pending.push({
      id: payment.id,
      at: payment.receivedAt,
      kind: "PAY",
      what: `${paymentMethodLabel(payment.method)} payment`,
      reference: payment.reference,
      chargeCents: null,
      paidCents: payment.amountCents,
    });
  }

  pending.sort(
    (left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id),
  );

  let balanceCents = 0;
  return pending.map((entry) => {
    balanceCents += entry.chargeCents ?? 0;
    balanceCents -= entry.paidCents ?? 0;
    return { ...entry, balanceCents };
  });
}

export function ledgerCsv(entries: readonly LedgerEntry[]): string {
  return toCsv([
    ["Date", "What", "Reference", "Charge", "Paid", "Balance"],
    ...entries.map((entry) => [
      formatDateTime(entry.at),
      entry.what,
      entry.reference,
      entry.chargeCents === null ? "" : formatPrice(entry.chargeCents),
      entry.paidCents === null ? "" : formatPrice(entry.paidCents),
      formatPrice(entry.balanceCents),
    ]),
  ]);
}

export function serviceTile(serviceDate: string): { month: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(serviceDate);
  if (!match?.[1] || !match[2] || !match[3]) {
    return { month: "", day: "" };
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
  return { month, day: String(date.getUTCDate()) };
}
