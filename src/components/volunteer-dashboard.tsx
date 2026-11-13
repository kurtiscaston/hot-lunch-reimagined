"use client";

import { Download, Inbox } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { useDemo } from "@/components/demo-provider";
import { DateTile, StatusPill } from "@/components/status-pill";
import { btnDark, btnGhostDark, btnOnDark, btnPhone, btnSecondary } from "@/components/ui-classes";
import { readClock, subscribeClock } from "@/lib/clock";
import {
  formatRemaining,
  isOrderingLocked,
  menuDayStatus,
  remainingMs,
} from "@/lib/domain/cutoff";
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
} from "@/lib/domain/dashboard";
import { downloadTextFile } from "@/lib/download-file";
import { paymentMethodLabel, serviceTile } from "@/lib/domain/parent-account";
import { formatPrice } from "@/lib/domain/time-zone";
import type { LunchSnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type BalanceFilter = "all" | BalanceStatus;

function orderCount(count: number): string {
  return count === 1 ? "1 order" : `${count} orders`;
}

function statusTone(status: BalanceStatus): "ok" | "warn" | "neutral" {
  if (status === "paid") {
    return "ok";
  }
  if (status === "short") {
    return "warn";
  }
  return "neutral";
}

function paymentLine(snapshot: LunchSnapshot, householdId: string): string {
  const payments = snapshot.payments.filter(
    (payment) => !payment.archived && payment.householdId === householdId,
  );
  if (payments.length === 0) {
    return "No payment recorded";
  }
  return payments
    .map((payment) => `${paymentMethodLabel(payment.method)} · ${payment.reference}`)
    .join(", ");
}

export function VolunteerDashboard() {
  const demo = useDemo();
  const nowMs = useSyncExternalStore(subscribeClock, readClock, () => 0);
  const [filter, setFilter] = useState<BalanceFilter>("all");
  const now = nowMs === 0 ? null : new Date(nowMs);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[30px] leading-none font-extrabold tracking-tight md:text-[40px]">
            Volunteer workspace
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-ink-2">
            Vendor totals, payments, and which students still need a meal.
            {demo ? ` School year ${demo.state.snapshot.schoolYearLabel}.` : null}
          </p>
        </div>
        {demo ? (
          <div className="flex gap-2">
            <button
              className={`${btnDark} ${btnPhone} min-h-11 flex-1 md:flex-none`}
              onClick={() =>
                downloadTextFile(
                  "maple-hollow-orders.csv",
                  ordersCsv(demo.state.snapshot),
                  "text/csv;charset=utf-8",
                )
              }
              type="button"
            >
              <Download aria-hidden="true" className="size-5" />
              Export orders
            </button>
            <button
              className={`${btnSecondary} ${btnPhone} min-h-11 flex-1 md:flex-none`}
              onClick={() =>
                downloadTextFile(
                  "maple-hollow-reconciliation.csv",
                  reconciliationCsv(demo.state.snapshot),
                  "text/csv;charset=utf-8",
                )
              }
              type="button"
            >
              <Download aria-hidden="true" className="size-5" />
              Export reconciliation
            </button>
          </div>
        ) : null}
      </div>
      {!demo || !now ? <p role="status">Loading demo data…</p> : <DashboardBody filter={filter} now={now} onFilter={setFilter} snapshot={demo.state.snapshot} />}
    </div>
  );
}

function DashboardBody({
  snapshot,
  now,
  filter,
  onFilter,
}: {
  snapshot: LunchSnapshot;
  now: Date;
  filter: BalanceFilter;
  onFilter: (filter: BalanceFilter) => void;
}) {
  const vendors = vendorTotals(snapshot);
  const days = dayTotals(snapshot);
  const balances = reconcileHouseholds(snapshot);
  const missing = unorderedStudents(snapshot, now);
  const maxVendor = Math.max(...vendors.map((row) => row.cents), 1);
  const roster = snapshot.students.filter((pupil) => !pupil.archived).length || 1;
  const owed = balances.reduce((sum, row) => sum + row.owedCents, 0);
  const paid = balances.reduce((sum, row) => sum + row.paidCents, 0);
  const orderTotal = snapshot.orders.filter((order) => !order.archived).length;
  const next = snapshot.menuDays
    .filter((day) => !day.archived && !isOrderingLocked(day.cutoffAt, now))
    .sort((left, right) => left.cutoffAt.localeCompare(right.cutoffAt))[0];
  const nextVendor = snapshot.vendors.find((entry) => entry.id === next?.vendorId);
  const nextMissing = next ? missing.filter((row) => row.menuDayId === next.id).length : 0;
  const reminderCount = snapshot.reminders.filter((reminder) => !reminder.archived).length;
  const counts: Record<BalanceFilter, number> = {
    all: balances.length,
    short: balances.filter((row) => row.status === "short").length,
    credit: balances.filter((row) => row.status === "credit").length,
    paid: balances.filter((row) => row.status === "paid").length,
  };
  const shown = balances.filter((row) => filter === "all" || row.status === filter);
  const missingGroups = groupMissing(missing);

  return (
    <section aria-label="Volunteer totals" className="flex scroll-mt-24 flex-col gap-6" id="totals">
      <div className="flex flex-col gap-4 rounded-[20px] bg-dark px-6 py-6 text-white md:flex-row md:items-center md:px-7">
        {next ? (
          <DateTile
            day={serviceTile(next.serviceDate).day}
            month={serviceTile(next.serviceDate).month}
            tone="brand"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-white/80">
            {next
              ? `Next cutoff · ${next.label}${nextVendor ? ` · ${nextVendor.name}` : ""}`
              : "Next cutoff"}
          </p>
          <p className="text-2xl leading-tight font-extrabold tracking-tight tabular-nums sm:text-[32px]">
            {next ? `Closes in ${formatRemaining(remainingMs(next.cutoffAt, now))}` : "No cutoff is open"}
          </p>
          {next ? (
            <p className="text-[15px] text-white/80">
              {nextMissing} {nextMissing === 1 ? "student still needs" : "students still need"} a meal
              {" · "}
              {reminderCount} mock {reminderCount === 1 ? "reminder" : "reminders"} recorded
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <a className={`${btnOnDark} ${btnPhone}`} href="#missing">
            See who&apos;s missing
          </a>
          <a className={`${btnGhostDark} ${btnPhone}`} href="#outbox">
            <Inbox aria-hidden="true" className="size-5" />
            Open outbox
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders this year" value={String(orderTotal)} />
        <Stat label="Owed" value={formatPrice(owed)} />
        <Stat label="Collected" value={formatPrice(paid)} />
        <Stat label="Still to order" value={String(missing.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[20px] border border-line bg-white p-6">
          <h2 className="text-xl font-bold">By vendor</h2>
          <p className="mt-1 text-sm text-ink-2">
            Order count and total for meals still in this school year.
          </p>
          {vendors.length === 0 ? (
            <p className="mt-4">No orders yet.</p>
          ) : (
            <ul className="mt-2">
              {vendors.map((row) => (
                <li className="border-t border-line py-3 first:border-t-0" key={row.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{row.label}</span>
                    <span className="tabular-nums">
                      {orderCount(row.count)} · <strong>{formatPrice(row.cents)}</strong>
                    </span>
                  </div>
                  <span className="mt-2 block h-2 overflow-hidden rounded-full bg-fill">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${Math.round((row.cents / maxVendor) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="rounded-[20px] border border-line bg-white p-6">
          <h2 className="text-xl font-bold">By day</h2>
          <p className="mt-1 text-sm text-ink-2">The same orders, split by menu day.</p>
          {days.length === 0 ? (
            <p className="mt-4">No orders yet.</p>
          ) : (
            <ul className="mt-2">
              {days.map((row) => {
                const day = snapshot.menuDays.find((entry) => entry.id === row.id);
                const status = day ? menuDayStatus(day.cutoffAt, now) : "open";
                const tile = day ? serviceTile(day.serviceDate) : { month: "", day: "" };
                const label =
                  status === "locked" ? "Locked" : status === "imminent" ? "Closing soon" : "Open";
                const tone = status === "locked" ? "dark" : status === "imminent" ? "warn" : "neutral";
                return (
                  <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0" key={row.id}>
                    <DateTile
                      day={tile.day}
                      month={tile.month}
                      tone={status === "locked" ? "dark" : status === "imminent" ? "brand" : "fill"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{day?.label ?? row.label}</span>
                        <StatusPill tone={tone}>{label}</StatusPill>
                      </div>
                      <p className="text-sm tabular-nums">
                        {orderCount(row.count)} · <strong>{formatPrice(row.cents)}</strong>
                      </p>
                      <span className="mt-2 block h-2 overflow-hidden rounded-full bg-fill">
                        <span
                          className="block h-full rounded-full bg-dark"
                          style={{ width: `${Math.min(100, Math.round((row.count / roster) * 100))}%` }}
                        />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>

      <article className="scroll-mt-24 rounded-[20px] border border-line bg-white p-6" id="payments">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">Reconciliation</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-2">
              Paid, owed, and the difference. Short means the household still owes. Credit means they
              paid more than this year&apos;s orders.
            </p>
          </div>
          <div aria-label="Filter households" className="flex flex-wrap gap-2" role="group">
            {(
              [
                ["all", "All"],
                ["short", "Short"],
                ["credit", "Credit"],
                ["paid", "Paid"],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-pressed={filter === value}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-full border px-3.5 text-sm font-semibold",
                  filter === value
                    ? "border-dark bg-dark text-white"
                    : "border-line-strong bg-white text-ink-2",
                )}
                key={value}
                onClick={() => onFilter(value)}
                type="button"
              >
                {label} <span className="font-medium opacity-70">{counts[value]}</span>
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-2">
          {shown.map((row) => {
            const students = snapshot.students.filter(
              (pupil) => pupil.householdId === row.householdId && !pupil.archived,
            ).length;
            return (
              <li className="border-t border-line py-4" key={row.householdId}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{row.name}</span>
                  <span className="text-sm text-ink-2">
                    {students === 1 ? "1 student" : `${students} students`}
                  </span>
                  <StatusPill tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusPill>
                </div>
                <p className="mt-1 text-sm text-ink-2">{paymentLine(snapshot, row.householdId)}</p>
                <p className="mt-1 text-sm leading-relaxed">
                  Paid {formatPrice(row.paidCents)} · Owed {formatPrice(row.owedCents)} · Difference{" "}
                  <span className={row.differenceCents < 0 ? "font-bold text-brand-ink" : row.differenceCents > 0 ? "font-bold text-ok" : undefined}>
                    {formatDifference(row.differenceCents)}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      </article>

      <article className="scroll-mt-24 rounded-[20px] border border-line bg-white p-6" id="missing">
        <h2 className="text-xl font-bold">No order yet</h2>
        <p className="mt-1 text-sm text-ink-2">
          Active students missing a meal on a day that is still open.
        </p>
        {missingGroups.length === 0 ? (
          <p className="mt-4">Every active student has an order.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-4">
            {missingGroups.map((day) => {
              const menuDay = snapshot.menuDays.find((entry) => entry.id === day.id);
              return (
                <li key={day.id}>
                  <p className="font-medium">
                    {day.label}
                    {menuDay ? (
                      <span className="ml-2 text-sm font-semibold text-brand-ink tabular-nums">
                        closes in {formatRemaining(remainingMs(menuDay.cutoffAt, now))}
                      </span>
                    ) : null}
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {day.students.map((student) => (
                      <li key={student.id}>{student.label}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-white px-5 py-4">
      <p className="text-sm font-semibold text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums md:text-[32px]">{value}</p>
    </div>
  );
}

function groupMissing(rows: ReturnType<typeof unorderedStudents>) {
  const groups: { id: string; label: string; students: { id: string; label: string }[] }[] = [];
  for (const row of rows) {
    const student = { id: row.studentId, label: `${row.name}, ${row.gradeLabel}` };
    const current = groups.find((group) => group.id === row.menuDayId);
    if (current) {
      current.students.push(student);
      continue;
    }
    groups.push({
      id: row.menuDayId,
      label: row.dayLabel,
      students: [student],
    });
  }
  return groups;
}
