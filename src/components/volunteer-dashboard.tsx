"use client";

import { useSyncExternalStore } from "react";

import { useDemo } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { readClock, subscribeClock } from "@/lib/clock";
import {
  dayTotals,
  formatDifference,
  ordersCsv,
  reconciliationCsv,
  reconcileHouseholds,
  statusLabel,
  unorderedStudents,
  vendorTotals,
  type BalanceStatus,
  type CountedTotal,
  type UnorderedStudent,
} from "@/lib/domain/dashboard";
import { formatPrice } from "@/lib/domain/time-zone";

function orderCount(count: number): string {
  return count === 1 ? "1 order" : `${count} orders`;
}

function statusVariant(status: BalanceStatus): "default" | "secondary" | "destructive" {
  if (status === "paid") {
    return "default";
  }
  if (status === "short") {
    return "destructive";
  }
  return "secondary";
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function TotalList({ rows }: { rows: CountedTotal[] }) {
  if (rows.length === 0) {
    return <p>No orders yet.</p>;
  }
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li
          className="flex flex-col gap-1 border-t border-border py-3 sm:flex-row sm:items-baseline sm:justify-between"
          key={row.id}
        >
          <span className="font-medium">{row.label}</span>
          <span>
            {orderCount(row.count)} · {formatPrice(row.cents)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function missingByDay(
  rows: UnorderedStudent[],
): { id: string; label: string; students: { id: string; label: string }[] }[] {
  const groups: { id: string; label: string; students: { id: string; label: string }[] }[] = [];
  for (const row of rows) {
    const current = groups.find((group) => group.id === row.menuDayId);
    const student = { id: row.studentId, label: `${row.name}, ${row.gradeLabel}` };
    if (current) {
      current.students.push(student);
      continue;
    }
    groups.push({
      id: row.menuDayId,
      label: `${row.dayLabel} · ${row.serviceDate}`,
      students: [student],
    });
  }
  return groups;
}

export function VolunteerDashboard() {
  const demo = useDemo();
  const nowMs = useSyncExternalStore(subscribeClock, readClock, () => 0);
  if (!demo || nowMs === 0) {
    return <p role="status">Loading demo data…</p>;
  }

  const { snapshot } = demo.state;
  const now = new Date(nowMs);
  const vendors = vendorTotals(snapshot);
  const days = dayTotals(snapshot);
  const balances = reconcileHouseholds(snapshot);
  const missing = missingByDay(unorderedStudents(snapshot, now));

  return (
    <section aria-label="Volunteer totals" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="min-h-11"
          onClick={() => downloadCsv("maple-hollow-orders.csv", ordersCsv(snapshot))}
          type="button"
        >
          Export orders
        </Button>
        <Button
          className="min-h-11"
          onClick={() => downloadCsv("maple-hollow-reconciliation.csv", reconciliationCsv(snapshot))}
          type="button"
          variant="outline"
        >
          Export reconciliation
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle heading="h2">By vendor</CardTitle>
          <CardDescription>Order count and total for meals still in this school year.</CardDescription>
        </CardHeader>
        <CardContent>
          <TotalList rows={vendors} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle heading="h2">By day</CardTitle>
          <CardDescription>The same orders, split by menu day.</CardDescription>
        </CardHeader>
        <CardContent>
          <TotalList rows={days} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle heading="h2">Reconciliation</CardTitle>
          <CardDescription>
            Paid, owed, and the difference. Short means the household still owes. Credit means they
            paid more than this year&apos;s orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            {balances.map((row) => (
              <li className="flex flex-col gap-2 border-t border-border py-3" key={row.householdId}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                </div>
                <p className="text-sm leading-relaxed">
                  Paid {formatPrice(row.paidCents)} · Owed {formatPrice(row.owedCents)} · Difference{" "}
                  {formatDifference(row.differenceCents)}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle heading="h2">No order yet</CardTitle>
          <CardDescription>Active students missing a meal on a day that is still open.</CardDescription>
        </CardHeader>
        <CardContent>
          {missing.length === 0 ? (
            <p>Every active student has an order.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {missing.map((day) => (
                <li key={day.id}>
                  <p className="font-medium">{day.label}</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {day.students.map((student) => (
                      <li key={student.id}>{student.label}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
