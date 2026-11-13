"use client";

import Link from "next/link";
import { Calendar, Check } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useDemo } from "@/components/demo-provider";
import { HouseholdSelect } from "@/components/household-select";
import { DateTile, StatusPill } from "@/components/status-pill";
import { btnDark, btnPhone, btnPrimary, btnSecondary } from "@/components/ui-classes";
import { readClock, subscribeClock } from "@/lib/clock";
import { isOrderingLocked } from "@/lib/domain/cutoff";
import { formatDifference } from "@/lib/domain/dashboard";
import {
  activeMenuDays,
  balanceFor,
  divisionLabel,
  gradeLabel,
  householdDayCents,
  householdStudents,
  initials,
  nextOpenDay,
  owingCents,
  periodBadge,
  serviceTile,
  studentMissingOrder,
} from "@/lib/domain/parent-account";
import { formatCutoff, formatPrice } from "@/lib/domain/time-zone";
import type { BalanceStatus } from "@/lib/domain/dashboard";

function balanceState(status: BalanceStatus): string {
  if (status === "short") {
    return "Short";
  }
  if (status === "credit") {
    return "Credit";
  }
  return "Paid up";
}

function ReminderToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3">
      <span className="relative grid size-11 shrink-0 place-items-center">
        <input
          aria-describedby="reminder-demo-note"
          checked={checked}
          className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none border-0 bg-transparent"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none grid size-5 place-items-center rounded-md border-2 border-line-strong bg-white text-transparent peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white"
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      </span>
      {label}
    </label>
  );
}

function pillTone(badge: ReturnType<typeof periodBadge>): "ok" | "warn" | "neutral" {
  if (badge === "Paid") {
    return "ok";
  }
  if (badge === "Not ordered") {
    return "warn";
  }
  return "neutral";
}

export function HomeBoard() {
  const demo = useDemo();
  const nowMs = useSyncExternalStore(subscribeClock, readClock, () => 0);
  const now = nowMs === 0 ? null : new Date(nowMs);

  if (!demo || !now) {
    return <p role="status">Loading demo data…</p>;
  }

  const { snapshot, householdId } = demo.state;
  const household = snapshot.households.find((entry) => entry.id === householdId);
  if (!household) {
    return <p>That demo household is not in the sample data.</p>;
  }

  const students = householdStudents(snapshot, household.id);
  const balance = balanceFor(snapshot, household.id);
  const days = activeMenuDays(snapshot);
  const open = nextOpenDay(snapshot, now);
  const missing = open
    ? students.filter((pupil) => studentMissingOrder(snapshot.orders, pupil.id, open.id))
    : [];
  const missingNames = missing.map((pupil) => `${pupil.firstName} ${pupil.lastName}`);
  const owing = balance ? owingCents(balance) : 0;

  return (
    <div className="flex flex-col gap-8">
      <HouseholdSelect />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <div className="flex flex-col gap-6">
          {open ? (
            <div className="flex flex-col gap-4 rounded-[20px] bg-brand-tint p-6 sm:flex-row sm:items-center">
              <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-white text-brand-ink">
                <Calendar aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-brand-ink">{open.label}</h2>
                <p className="text-brand-ink">
                  {missingNames.length === 0
                    ? `Everyone in this household has a meal. Cutoff ${formatCutoff(open.cutoffAt)}.`
                    : missingNames.length === 1
                      ? `${missingNames[0]} has no order yet. Cutoff ${formatCutoff(open.cutoffAt)}.`
                      : `${missingNames.join(", ")} have no order yet. Cutoff ${formatCutoff(open.cutoffAt)}.`}
                </p>
              </div>
              <Link className={`${btnPrimary} ${btnPhone}`} href={`/orders#${open.id}`}>
                {missingNames.length === 0 ? "View orders" : "Start order"}
              </Link>
            </div>
          ) : (
            <div className="rounded-[20px] border border-line bg-white px-6 py-10 text-center">
              <h2 className="text-lg font-bold">Nothing open right now</h2>
              <p className="mx-auto mt-2 max-w-sm text-ink-2">
                Every menu day is past its cutoff. New days show up here when they open.
              </p>
            </div>
          )}

          <section aria-labelledby="your-kids" className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight" id="your-kids">
              Your kids
            </h2>
            {students.length === 0 ? (
              <div className="rounded-[20px] border border-line bg-white px-6 py-10 text-center">
                <h3 className="text-lg font-bold">No students on this household</h3>
                <p className="mx-auto mt-2 max-w-sm text-ink-2">
                  Students appear here once they&apos;re on the Maple Hollow roster. After a
                  school-year rollover, Grade 5 students are archived.
                </p>
              </div>
            ) : (
              students.map((pupil) => (
                <article
                  className="rounded-[20px] border border-line bg-white p-6"
                  key={pupil.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-brand-tint text-sm font-extrabold text-brand-ink">
                      {initials(pupil.firstName, pupil.lastName)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold">
                        {pupil.firstName} {pupil.lastName}
                      </h3>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-[14px] bg-fill px-3 py-2">
                      <span className="block text-xs font-semibold tracking-wide text-ink-2 uppercase">
                        Grade
                      </span>
                      <span className="font-semibold">{gradeLabel(pupil.grade)}</span>
                    </span>
                    <span className="rounded-[14px] bg-fill px-3 py-2">
                      <span className="block text-xs font-semibold tracking-wide text-ink-2 uppercase">
                        Division
                      </span>
                      <span className="font-semibold">{divisionLabel(pupil.grade)}</span>
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      className={`${btnDark} ${btnPhone}`}
                      href={`/orders?student=${pupil.id}`}
                    >
                      View orders
                    </Link>
                    <button className={btnSecondary} disabled type="button">
                      Edit details
                    </button>
                  </div>
                </article>
              ))
            )}
            <button
              className="rounded-[20px] border-2 border-dashed border-line-strong px-6 py-6 text-base font-semibold text-ink-3"
              disabled
              type="button"
            >
              Add another child
            </button>
            <p className="text-sm text-ink-2">Students are added by the volunteer.</p>
          </section>

          <section aria-labelledby="reminder-heading" className="rounded-[20px] border border-line bg-white p-6">
            <h2 className="text-xl font-bold" id="reminder-heading">
              Reminders for {household.name}
            </h2>
            <p className="mt-1 text-sm text-ink-2" id="reminder-demo-note">
              Demo only. Nothing is emailed or texted.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <ReminderToggle
                checked={household.reminderOptIn.email}
                label="Email before the cutoff"
                onChange={(enabled) => demo.setReminderChannel("email", enabled)}
              />
              <ReminderToggle
                checked={household.reminderOptIn.sms}
                label="Text before the cutoff"
                onChange={(enabled) => demo.setReminderChannel("sms", enabled)}
              />
            </div>
            {household.preferences.dietaryNotes ? (
              <p className="mt-4 text-sm leading-relaxed">
                Preferences carried with this household: {household.preferences.dietaryNotes}
              </p>
            ) : null}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-[20px] border border-line bg-white p-6">
            <h2 className="text-sm font-semibold text-ink-2">Account balance</h2>
            <p className="mt-2 text-[40px] leading-none font-extrabold tabular-nums">
              {formatPrice(owing)}
            </p>
            <p className="mt-1 text-ink-2">owing</p>
            {balance ? (
              <p className="mt-3 font-semibold">
                {balanceState(balance.status)}
                {balance.status === "credit" ? ` ${formatDifference(balance.differenceCents)}` : null}
              </p>
            ) : null}
            <Link className="mt-4 inline-flex font-semibold text-brand-ink" href="/payments">
              View payments
            </Link>
          </section>
          <section aria-labelledby="periods-heading" className="rounded-[20px] border border-line bg-white p-6">
            <h2 className="text-xl font-bold" id="periods-heading">
              Lunch periods
            </h2>
            <ul className="mt-2">
              {days.map((day) => {
                const tile = serviceTile(day.serviceDate);
                const locked = isOrderingLocked(day.cutoffAt, now);
                const missingDay = students.some((pupil) =>
                  studentMissingOrder(snapshot.orders, pupil.id, day.id),
                );
                const badge = balance
                  ? periodBadge({ missing: missingDay, locked, status: balance.status })
                  : "No order";
                return (
                  <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0" key={day.id}>
                    <DateTile day={tile.day} month={tile.month} tone={locked ? "dark" : "brand"} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{day.label}</p>
                      <p className="text-sm text-ink-2 tabular-nums">
                        {formatPrice(householdDayCents(snapshot, household.id, day.id))}
                      </p>
                    </div>
                    <StatusPill tone={pillTone(badge)}>{badge}</StatusPill>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
