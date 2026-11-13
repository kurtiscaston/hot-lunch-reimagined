"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useDemo } from "@/components/demo-provider";
import { HouseholdSelect } from "@/components/household-select";
import { DateTile, StatusPill } from "@/components/status-pill";
import { btnGhostDark, btnOnDark, btnPhone, btnPrimary, iconButton } from "@/components/ui-classes";
import { readClock, subscribeClock } from "@/lib/clock";
import {
  formatRemaining,
  isOrderingLocked,
  menuDayStatus,
  remainingMs,
  type MenuDayStatus,
} from "@/lib/domain/cutoff";
import { lockAnnouncement } from "@/lib/domain/lock-announcement";
import { shouldFocusMissedCutoff } from "@/lib/domain/missed-cutoff-focus";
import { shouldFocusOrderedLine } from "@/lib/domain/ordered-focus";
import {
  balanceFor,
  gradeLabel,
  householdStudents,
  initials,
  owingCents,
  serviceTile,
} from "@/lib/domain/parent-account";
import {
  placeOrderMessage,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/lib/domain/place-order";
import { selectedMealId } from "@/lib/domain/selected-meal";
import { formatCutoff, formatPrice, formatServiceDate } from "@/lib/domain/time-zone";
import type { MenuDay, MenuItem, Order, Student } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

function dayBadge(status: MenuDayStatus, everyoneOrdered: boolean): {
  label: string;
  tone: "ok" | "warn" | "neutral" | "dark";
} {
  if (status === "locked") {
    return { label: "Locked", tone: "dark" };
  }
  if (everyoneOrdered) {
    return { label: "All ordered", tone: "ok" };
  }
  if (status === "imminent") {
    return { label: "Closing soon", tone: "warn" };
  }
  return { label: "Open", tone: "neutral" };
}

export function OrdersScreen() {
  const demo = useDemo();
  const params = useSearchParams();
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
  const requested = params.get("student");
  const studentId = students.some((pupil) => pupil.id === requested) ? requested : null;
  const visibleStudents = studentId
    ? students.filter((pupil) => pupil.id === studentId)
    : students;
  const days = snapshot.menuDays
    .filter((day) => !day.archived)
    .sort((left, right) => left.cutoffAt.localeCompare(right.cutoffAt));
  const unlocked = days.filter((day) => !isOrderingLocked(day.cutoffAt, now));
  const locked = days.filter((day) => isOrderingLocked(day.cutoffAt, now));
  const orderedDays = [...unlocked, ...locked];
  const actionDay = unlocked.find((day) =>
    visibleStudents.some(
      (pupil) =>
        !snapshot.orders.some(
          (order) => !order.archived && order.studentId === pupil.id && order.menuDayId === day.id,
        ),
    ),
  );
  const balance = balanceFor(snapshot, household.id);
  const owing = balance ? owingCents(balance) : 0;
  let previousGroup = "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-[30px] leading-none font-extrabold tracking-tight md:text-[40px]">
              Orders
            </h1>
            <p className="text-base font-bold text-brand-ink tabular-nums md:hidden">
              {formatPrice(owing)} owing
            </p>
          </div>
          <p className="mt-2 max-w-2xl text-lg text-ink-2">
            Pick a period to order, change, or print.
          </p>
          <p className="mt-2 text-base text-ink-2">
            Times shown in Pacific Time (America/Vancouver).
          </p>
        </div>
        <nav aria-label="Student" className="inline-flex w-fit flex-wrap rounded-full bg-fill p-1">
          <Link
            aria-current={studentId ? undefined : "page"}
            className={cn(
              "inline-flex h-11 items-center rounded-full px-4 text-[15px] font-medium text-ink-2",
              !studentId && "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(31,36,48,0.06)]",
            )}
            href="/orders"
          >
            All kids
          </Link>
          {students.map((pupil) => {
            const current = pupil.id === studentId;
            return (
              <Link
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-full px-4 text-[15px] font-medium text-ink-2",
                  current && "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(31,36,48,0.06)]",
                )}
                href={`/orders?student=${pupil.id}`}
                key={pupil.id}
              >
                {pupil.firstName}
              </Link>
            );
          })}
        </nav>
      </div>
      <HouseholdSelect />
      <div className="flex flex-col gap-4">
        {orderedDays.map((day) => {
          const status = menuDayStatus(day.cutoffAt, now);
          const group =
            status === "locked" ? "Locked" : status === "imminent" ? "Closing soon" : "Open for ordering";
          const showGroup = group !== previousGroup;
          previousGroup = group;
          const vendor = snapshot.vendors.find((entry) => entry.id === day.vendorId);
          const items = day.itemIds.flatMap((itemId) => {
            const item = snapshot.menuItems.find((entry) => entry.id === itemId);
            return item ? [item] : [];
          });
          return (
            <div key={day.id}>
              {showGroup ? (
                <p className="mb-3 text-[13px] font-semibold tracking-[0.08em] text-ink-2 uppercase">
                  {group}
                </p>
              ) : null}
              <MenuDayCard
                day={day}
                highlight={day.id === actionDay?.id}
                items={items}
                note={household.preferences.dietaryNotes}
                now={now}
                onPlace={demo.placeOrder}
                orders={snapshot.orders}
                persisted={demo.persisted}
                students={visibleStudents}
                vendorName={vendor?.name ?? "Vendor"}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-4 rounded-[20px] bg-dark px-6 py-6 text-white md:flex-row md:items-center md:px-7">
        <div>
          <p className="text-[15px] font-medium text-white/80">Account balance</p>
          <p className="text-[32px] leading-tight font-extrabold tabular-nums">
            {formatPrice(owing)} owing
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:ml-auto">
          <Link className={`${btnOnDark} ${btnPhone}`} href="/payments">
            Payment history
          </Link>
          <button className={btnGhostDark} disabled type="button">
            <Download aria-hidden="true" className="size-5" />
            Download all orders (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuDayCard({
  day,
  vendorName,
  items,
  students,
  orders,
  now,
  onPlace,
  highlight,
  note,
  persisted,
}: {
  day: MenuDay;
  vendorName: string;
  items: MenuItem[];
  students: Student[];
  orders: Order[];
  now: Date;
  onPlace: (input: PlaceOrderInput) => PlaceOrderResult;
  highlight: boolean;
  note: string;
  persisted: boolean;
}) {
  const status = menuDayStatus(day.cutoffAt, now);
  const dayLabel = formatServiceDate(day.serviceDate);
  const [trackedStatus, setTrackedStatus] = useState<MenuDayStatus>(status);
  const [lockNotice, setLockNotice] = useState("");
  if (status !== trackedStatus) {
    setTrackedStatus(status);
    const notice = lockAnnouncement(trackedStatus, status, dayLabel);
    if (notice) {
      setLockNotice(notice);
    }
  }
  const headingId = `${day.id}-heading`;
  const missedLine = useRef<HTMLParagraphElement>(null);
  const onMissedFocus = useCallback(() => {
    missedLine.current?.focus();
  }, []);
  const dayHasOrder = students.some((pupil) =>
    orders.some(
      (order) => !order.archived && order.studentId === pupil.id && order.menuDayId === day.id,
    ),
  );
  const missedStudents = students.filter(
    (pupil) =>
      !orders.some(
        (order) => !order.archived && order.studentId === pupil.id && order.menuDayId === day.id,
      ),
  );
  const showMissed = status === "locked" && missedStudents.length > 0;
  const missedNames = missedStudents
    .map((pupil) => `${pupil.firstName} ${pupil.lastName}`)
    .join(", ");
  const everyoneOrdered = students.length > 0 && missedStudents.length === 0;
  const badge = dayBadge(status, everyoneOrdered);
  const tile = serviceTile(day.serviceDate);
  const tileTone = status === "locked" ? "dark" : "brand";
  const total = students.reduce((sum, pupil) => {
    const order = orders.find(
      (entry) => !entry.archived && entry.studentId === pupil.id && entry.menuDayId === day.id,
    );
    return sum + (order?.priceCents ?? 0);
  }, 0);

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-24 rounded-[20px] bg-white p-6 md:p-7",
        highlight ? "border-2 border-brand" : "border border-line",
      )}
      id={day.id}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <DateTile day={tile.day} month={tile.month} tone={tileTone} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold" id={headingId}>
              {day.label}
            </h2>
            <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
            {persisted ? null : <StatusPill tone="warn">Not saved</StatusPill>}
          </div>
          <p className="mt-1 text-ink-2">
            {vendorName}. Cutoff {formatCutoff(day.cutoffAt)}.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-ink-2">{status === "locked" ? "Total" : "Locks in"}</p>
          <p className="text-xl font-bold text-brand-ink tabular-nums">
            {status === "locked" ? formatPrice(total) : formatRemaining(remainingMs(day.cutoffAt, now))}
          </p>
        </div>
        {dayHasOrder ? (
          <button
            aria-label="Print this page"
            className={iconButton}
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only">
        {lockNotice}
      </p>
      {note ? (
        <p className="mt-4 inline-flex items-center rounded-full bg-fill px-3.5 py-1.5 text-sm font-medium text-ink-2">
          Household note: {note}
        </p>
      ) : null}
      {items.length === 0 && !dayHasOrder ? (
        <p className="mt-4">No meals listed.</p>
      ) : (
        <div>
          {showMissed ? (
            <p
              className="mt-5 rounded-[14px] border border-dashed border-line-strong bg-fill-2 px-4 py-3.5 text-ink-2 focus:shadow-[0_0_0_3px_rgba(194,65,12,0.35)]"
              id={`${day.id}-missed`}
              ref={missedLine}
              tabIndex={-1}
            >
              {missedNames} missed the cutoff.
            </p>
          ) : null}
          {students.map((pupil) => (
            <StudentOrder
              day={day}
              items={items}
              key={pupil.id}
              missed={showMissed && missedStudents.some((missed) => missed.id === pupil.id)}
              now={now}
              onMissedFocus={onMissedFocus}
              onPlace={onPlace}
              order={orders.find(
                (entry) =>
                  !entry.archived && entry.studentId === pupil.id && entry.menuDayId === day.id,
              )}
              student={pupil}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function StudentOrder({
  student,
  day,
  items,
  order,
  now,
  onPlace,
  onMissedFocus,
  missed,
}: {
  student: Student;
  day: MenuDay;
  items: MenuItem[];
  order: Order | undefined;
  now: Date;
  onPlace: (input: PlaceOrderInput) => PlaceOrderResult;
  onMissedFocus: () => void;
  missed: boolean;
}) {
  const firstItem = items[0];
  const [itemId, setItemId] = useState(firstItem?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const orderedLine = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const justSubmitted = useRef(false);
  const pendingMissedFocus = useRef(false);
  const [focusInside, setFocusInside] = useState(false);

  useEffect(() => {
    if (!shouldFocusOrderedLine(justSubmitted.current, order !== undefined)) {
      return;
    }
    orderedLine.current?.focus();
    justSubmitted.current = false;
  }, [order]);
  const locked = isOrderingLocked(day.cutoffAt, now);
  const showForm = Boolean(firstItem) && !order && (!locked || focusInside);

  useLayoutEffect(() => {
    if (!locked || order || !focusInside || !formRef.current) {
      return;
    }
    pendingMissedFocus.current = shouldFocusMissedCutoff(
      formRef.current,
      document.activeElement,
    );
    setFocusInside(false);
    if (pendingMissedFocus.current) {
      onMissedFocus();
      pendingMissedFocus.current = false;
    }
  }, [locked, order, focusInside, onMissedFocus]);

  const studentHeadingId = `${day.id}-${student.id}-name`;
  const mealId = selectedMealId(
    itemId,
    items.map((item) => item.id),
  );
  const orderedItem = order ? items.find((item) => item.id === order.itemId) : undefined;
  const selected = items.find((item) => item.id === mealId);

  return (
    <section
      aria-labelledby={studentHeadingId}
      className="mt-5 border-t border-line pt-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-tint text-sm font-extrabold text-brand-ink">
          {initials(student.firstName, student.lastName)}
        </span>
        <h3 className="text-[17px] font-semibold" id={studentHeadingId}>
          {student.firstName} {student.lastName}
          <span className="font-medium text-ink-3"> · {gradeLabel(student.grade)}</span>
        </h3>
        {!order && !locked ? (
          <StatusPill className="md:ml-auto" tone="warn">
            Not ordered
          </StatusPill>
        ) : null}
      </div>
      {order ? (
        <p
          className="rounded-[14px] bg-ok-bg px-4 py-3.5 font-semibold text-ok focus:shadow-[0_0_0_3px_rgba(194,65,12,0.35)]"
          ref={orderedLine}
          tabIndex={-1}
        >
          Ordered: {orderedItem?.name ?? "Meal"} · {formatPrice(order.priceCents)}
        </p>
      ) : null}
      {missed && !showForm ? <p className="text-sm text-ink-2">No order.</p> : null}
      {showForm ? (
        <form
          className="flex flex-col gap-3"
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) {
              return;
            }
            setFocusInside(false);
          }}
          onFocus={() => setFocusInside(true)}
          onSubmit={(event) => {
            event.preventDefault();
            justSubmitted.current = true;
            const result = onPlace({
              studentId: student.id,
              menuDayId: day.id,
              itemId: mealId,
            });
            if (!result.ok) {
              justSubmitted.current = false;
              setError(placeOrderMessage(result.reason));
            }
          }}
          ref={formRef}
        >
          <fieldset className="border-0 p-0">
            <legend className="mb-2.5 text-sm font-semibold text-ink-2">
              Meal for {student.firstName}
            </legend>
            <div aria-label={`Meal for ${student.firstName}`} className="grid gap-3 md:grid-cols-2" role="group">
              {items.map((item) => {
                const on = item.id === mealId;
                return (
                  <button
                    aria-disabled={locked || undefined}
                    aria-pressed={on}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-[14px] border bg-white p-4 text-left",
                      on ? "border-2 border-brand bg-[#fffaf6] p-[15px]" : "border-line-strong",
                      locked && "border-dashed bg-fill-2 text-ink-3",
                    )}
                    key={item.id}
                    onClick={() => {
                      if (locked) {
                        return;
                      }
                      setItemId(item.id);
                      setError(null);
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-5 shrink-0 rounded-full border-2 border-line-strong",
                        on && "border-brand bg-[radial-gradient(circle,var(--brand)_0_5px,#fff_6px)]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{item.name}</span>
                      <span className="block text-sm text-ink-2">{day.label}</span>
                    </span>
                    <span className="font-bold tabular-nums">{formatPrice(item.priceCents)}</span>
                  </button>
                );
              })}
            </div>
            {selected ? (
              <p className="mt-3 text-sm text-ink-2">{formatPrice(selected.priceCents)} per meal</p>
            ) : null}
            {error ? (
              <p className="mt-2.5 font-semibold text-brand-ink" role="alert">
                {error}
              </p>
            ) : null}
          </fieldset>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              className={`${btnPrimary} ${btnPhone}`}
              disabled={!mealId || locked}
              type="submit"
            >
              {locked
                ? "Locked"
                : `Place order for ${student.firstName}${selected ? ` · ${formatPrice(selected.priceCents)}` : ""}`}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
