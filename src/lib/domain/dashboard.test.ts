import { describe, expect, it } from "vitest";

import {
  csvCell,
  dayTotals,
  ordersCsv,
  reconciliationCsv,
  reconcileHouseholds,
  toCsv,
  unorderedStudents,
  vendorTotals,
} from "@/lib/domain/dashboard";
import { applyRollover } from "@/lib/domain/rollover";
import { createSeed, MENU_DAY_IDS } from "@/lib/domain/seed";
import { formatPrice } from "@/lib/domain/time-zone";

const NOW = new Date("2026-11-12T15:00:00.000Z");

describe("volunteer dashboard", () => {
  it("sums only this year's orders and payments", () => {
    const snapshot = createSeed(NOW);
    const rolled = applyRollover(snapshot, NOW);
    const vendors = vendorTotals(rolled);
    const days = dayTotals(rolled);
    const balances = reconcileHouseholds(rolled);

    expect(vendors.reduce((sum, row) => sum + row.cents, 0)).toBe(0);
    expect(days.every((row) => row.count === 0 && row.cents === 0)).toBe(true);
    expect(balances.every((row) => row.paidCents === 0 && row.owedCents === 0 && row.status === "paid")).toBe(
      true,
    );

    const current = createSeed(NOW);
    const sampleOrder = current.orders[0];
    const samplePayment = current.payments[0];
    if (!sampleOrder || !samplePayment) {
      throw new Error("seed has no order or payment");
    }
    const inflated = {
      ...current,
      orders: [
        ...current.orders,
        {
          ...sampleOrder,
          id: "prior-ord-extra",
          archived: true,
          priceCents: 999_99,
        },
      ],
      payments: [
        ...current.payments,
        {
          ...samplePayment,
          id: "prior-pay-extra",
          archived: true,
          amountCents: 888_88,
        },
      ],
    };
    expect(vendorTotals(inflated)).toEqual(vendorTotals(current));
    expect(reconcileHouseholds(inflated)).toEqual(reconcileHouseholds(current));
  });

  it("marks paid, short, and credit from the sample roster", () => {
    const balances = reconcileHouseholds(createSeed(NOW));
    expect(balances.find((row) => row.householdId === "hh-brindle")?.status).toBe("paid");
    expect(balances.find((row) => row.householdId === "hh-dunlow")?.status).toBe("short");
    expect(balances.find((row) => row.householdId === "hh-hearthwell")?.status).toBe("credit");
    expect(balances.find((row) => row.householdId === "hh-coppermoss")).toMatchObject({
      paidCents: 0,
      status: "short",
    });
    const brindle = balances.find((row) => row.householdId === "hh-brindle");
    expect(brindle?.differenceCents).toBe(0);
    expect(brindle?.paidCents).toBe(brindle?.owedCents);
  });

  it("lists students who still need a meal before the cutoff", () => {
    const missing = unorderedStudents(createSeed(NOW), NOW);
    expect(missing.some((row) => row.studentId === "stu-ada-brindle" && row.menuDayId === MENU_DAY_IDS.open)).toBe(
      true,
    );
    expect(missing.some((row) => row.menuDayId === MENU_DAY_IDS.locked)).toBe(false);
    expect(missing.some((row) => row.studentId === "stu-moss-hearthwell")).toBe(false);
  });

  it("orders menu days by service date", () => {
    const snapshot = createSeed(NOW);
    const byDate = snapshot.menuDays
      .filter((day) => !day.archived)
      .sort((left, right) => left.serviceDate.localeCompare(right.serviceDate))
      .map((day) => day.id);
    const totals = dayTotals(snapshot);
    expect(totals.map((row) => row.id)).toEqual(byDate);
    const labels = totals.map((row) => row.label);
    expect(labels).not.toEqual([...labels].sort((left, right) => left.localeCompare(right)));
  });

  it("escapes commas and quotes and neutralises formula cells", () => {
    expect(toCsv([['Cafe, "North"']])).toBe('"Cafe, ""North"""\r\n');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("-1");
    expect(csvCell("-$3.00")).toBe("-$3.00");
    expect(csvCell("-1+cmd")).toBe("'-1+cmd");
    expect(csvCell("@sum")).toBe("'@sum");
    expect(csvCell("\t=1+1")).toBe("'\t=1+1");
    expect(csvCell("\r=1+1")).toBe("\"'\r=1+1\"");
    const csv = ordersCsv(createSeed(NOW));
    expect(csv.startsWith("Household,Student,Day,Vendor,Meal,Price,Placed at\r\n")).toBe(true);
    expect(csv).toContain("Brindle");
    expect(csv).toContain(formatPrice(700));
    const reconciliation = reconciliationCsv(createSeed(NOW));
    expect(reconciliation).toContain(",Paid\r\n");
    expect(reconciliation).toContain(",Short\r\n");
    expect(reconciliation).toContain(",Credit\r\n");
    const dunlow = reconcileHouseholds(createSeed(NOW)).find((row) => row.householdId === "hh-dunlow");
    expect(dunlow?.status).toBe("short");
    const difference = formatPrice(dunlow?.differenceCents ?? 0);
    expect(difference).toBe("-$3.50");
    const dunlowRow = reconciliation.split("\r\n").find((row) => row.startsWith("Dunlow,"));
    expect(dunlowRow?.split(",")[3]).toBe(difference);
  });
});
