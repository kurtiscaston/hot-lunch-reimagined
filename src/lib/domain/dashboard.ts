import { isOrderingLocked } from "@/lib/domain/cutoff";
import { formatCutoff, formatPrice, formatServiceDate } from "@/lib/domain/time-zone";
import type { Grade, LunchSnapshot, Order, Payment } from "@/lib/domain/types";

export interface CountedTotal {
  id: string;
  label: string;
  count: number;
  cents: number;
}

export type BalanceStatus = "paid" | "short" | "credit";

export interface HouseholdBalance {
  householdId: string;
  name: string;
  paidCents: number;
  owedCents: number;
  differenceCents: number;
  status: BalanceStatus;
}

export interface UnorderedStudent {
  menuDayId: string;
  dayLabel: string;
  serviceDate: string;
  studentId: string;
  name: string;
  gradeLabel: string;
}

function activeOrders(snapshot: LunchSnapshot): Order[] {
  return snapshot.orders.filter((order) => !order.archived);
}

function activePayments(snapshot: LunchSnapshot): Payment[] {
  return snapshot.payments.filter((payment) => !payment.archived);
}

function gradeLabel(grade: Grade): string {
  return grade === "K" ? "Kindergarten" : `Grade ${grade}`;
}

/** Orders still in this school year, grouped by vendor. Archived orders are left out. */
export function vendorTotals(snapshot: LunchSnapshot): CountedTotal[] {
  const totals = new Map<string, CountedTotal>();
  for (const order of activeOrders(snapshot)) {
    const day = snapshot.menuDays.find((entry) => entry.id === order.menuDayId);
    const item = snapshot.menuItems.find((entry) => entry.id === order.itemId);
    const vendorId = day?.vendorId ?? item?.vendorId;
    if (!vendorId) {
      continue;
    }
    const vendor = snapshot.vendors.find((entry) => entry.id === vendorId);
    const current = totals.get(vendorId) ?? {
      id: vendorId,
      label: vendor?.name ?? "Vendor",
      count: 0,
      cents: 0,
    };
    current.count += 1;
    current.cents += order.priceCents;
    totals.set(vendorId, current);
  }
  return [...totals.values()].sort((left, right) => left.label.localeCompare(right.label));
}

/** Orders still in this school year, grouped by menu day. Archived days and orders are left out. */
export function dayTotals(snapshot: LunchSnapshot): CountedTotal[] {
  return snapshot.menuDays
    .filter((day) => !day.archived)
    .map((day) => {
      const orders = activeOrders(snapshot).filter((order) => order.menuDayId === day.id);
      return {
        id: day.id,
        label: `${day.label} · ${formatServiceDate(day.serviceDate)}`,
        count: orders.reduce((sum) => sum + 1, 0),
        cents: orders.reduce((sum, order) => sum + order.priceCents, 0),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

/** Paid minus owed. Archived orders and payments do not count. */
export function reconcileHouseholds(snapshot: LunchSnapshot): HouseholdBalance[] {
  return snapshot.households
    .map((household) => {
      const studentIds = new Set(
        snapshot.students
          .filter((pupil) => pupil.householdId === household.id)
          .map((pupil) => pupil.id),
      );
      const owedCents = activeOrders(snapshot)
        .filter((order) => studentIds.has(order.studentId))
        .reduce((sum, order) => sum + order.priceCents, 0);
      const paidCents = activePayments(snapshot)
        .filter((payment) => payment.householdId === household.id)
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      const differenceCents = paidCents - owedCents;
      const status: BalanceStatus =
        differenceCents === 0 ? "paid" : differenceCents < 0 ? "short" : "credit";
      return {
        householdId: household.id,
        name: household.name,
        paidCents,
        owedCents,
        differenceCents,
        status,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Active students missing an order on a day that is still before the cutoff. */
export function unorderedStudents(snapshot: LunchSnapshot, now: Date): UnorderedStudent[] {
  const rows: UnorderedStudent[] = [];
  const days = snapshot.menuDays
    .filter((day) => !day.archived && !isOrderingLocked(day.cutoffAt, now))
    .sort((left, right) => left.cutoffAt.localeCompare(right.cutoffAt));
  const students = snapshot.students
    .filter((pupil) => !pupil.archived)
    .sort((left, right) => left.lastName.localeCompare(right.lastName) || left.firstName.localeCompare(right.firstName));
  for (const day of days) {
    for (const pupil of students) {
      const ordered = activeOrders(snapshot).some(
        (order) => order.studentId === pupil.id && order.menuDayId === day.id,
      );
      if (ordered) {
        continue;
      }
      rows.push({
        menuDayId: day.id,
        dayLabel: day.label,
        serviceDate: formatServiceDate(day.serviceDate),
        studentId: pupil.id,
        name: `${pupil.firstName} ${pupil.lastName}`,
        gradeLabel: gradeLabel(pupil.grade),
      });
    }
  }
  return rows;
}

export function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return `${rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n")}\r\n`;
}

export function ordersCsv(snapshot: LunchSnapshot): string {
  const rows = activeOrders(snapshot)
    .map((order) => {
      const day = snapshot.menuDays.find((entry) => entry.id === order.menuDayId);
      const item = snapshot.menuItems.find((entry) => entry.id === order.itemId);
      const pupil = snapshot.students.find((entry) => entry.id === order.studentId);
      const household = snapshot.households.find((entry) => entry.id === pupil?.householdId);
      const vendor = snapshot.vendors.find((entry) => entry.id === (day?.vendorId ?? item?.vendorId));
      return {
        cutoff: day?.cutoffAt ?? "",
        cells: [
          household?.name ?? "Household",
          pupil ? `${pupil.firstName} ${pupil.lastName}` : "Student",
          day ? `${day.label} · ${formatServiceDate(day.serviceDate)}` : "Menu day",
          vendor?.name ?? "Vendor",
          item?.name ?? "Meal",
          formatPrice(order.priceCents),
          formatCutoff(order.placedAt),
        ],
      };
    })
    .sort(
      (left, right) =>
        left.cutoff.localeCompare(right.cutoff) || left.cells[1]?.localeCompare(right.cells[1] ?? "") || 0,
    );
  return toCsv([
    ["Household", "Student", "Day", "Vendor", "Meal", "Price", "Placed at"],
    ...rows.map((row) => row.cells),
  ]);
}

export function reconciliationCsv(snapshot: LunchSnapshot): string {
  return toCsv([
    ["Household", "Paid", "Owed", "Difference", "Status"],
    ...reconcileHouseholds(snapshot).map((row) => [
      row.name,
      formatPrice(row.paidCents),
      formatPrice(row.owedCents),
      formatPrice(row.differenceCents),
      row.status,
    ]),
  ]);
}
