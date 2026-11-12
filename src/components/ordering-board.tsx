"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  formatRemaining,
  isOrderingLocked,
  menuDayStatus,
  remainingMs,
  type MenuDayStatus,
} from "@/lib/domain/cutoff";
import { lockAnnouncement } from "@/lib/domain/lock-announcement";
import {
  placeOrderMessage,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/lib/domain/place-order";
import type { MenuDay, MenuItem, Order, Student } from "@/lib/domain/types";
import { selectedMealId } from "@/lib/domain/selected-meal";
import { shouldFocusMissedCutoff } from "@/lib/domain/missed-cutoff-focus";
import { shouldFocusOrderedLine } from "@/lib/domain/ordered-focus";
import { formatCutoff, formatPrice, formatServiceDate } from "@/lib/domain/time-zone";
import { readClock, subscribeClock } from "@/lib/clock";

function gradeLabel(grade: Student["grade"]): string {
  return grade === "K" ? "Kindergarten" : `Grade ${grade}`;
}

function statusLabel(status: ReturnType<typeof menuDayStatus>): string {
  switch (status) {
    case "locked":
      return "Locked";
    case "imminent":
      return "Closing soon";
    case "open":
      return "Open";
  }
}

function statusVariant(
  status: ReturnType<typeof menuDayStatus>,
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "locked":
      return "destructive";
    case "imminent":
      return "default";
    case "open":
      return "secondary";
  }
}

export function OrderingBoard() {
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

  const students = snapshot.students.filter(
    (pupil) => pupil.householdId === household.id && !pupil.archived,
  );
  const days = [...snapshot.menuDays].sort((a, b) => a.cutoffAt.localeCompare(b.cutoffAt));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-medium">{household.name}</h2>
          </CardTitle>
          <CardDescription>Demo household. Not a sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="demo-household">Household</FieldLabel>
                <NativeSelect
                  className="w-full"
                  id="demo-household"
                  size="lg"
                  onChange={(event) => demo.setHouseholdId(event.target.value)}
                  value={household.id}
                >
                  {snapshot.households.map((entry) => (
                    <NativeSelectOption key={entry.id} value={entry.id}>
                      {entry.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  Sample families only. Switching households does not sign anyone in.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Reminders</legend>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Demo only. Nothing is emailed or texted.
              </p>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  checked={household.reminderOptIn.email}
                  className="size-11 accent-primary"
                  onChange={(event) => demo.setReminderChannel("email", event.target.checked)}
                  type="checkbox"
                />
                Email before the cutoff
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  checked={household.reminderOptIn.sms}
                  className="size-11 accent-primary"
                  onChange={(event) => demo.setReminderChannel("sms", event.target.checked)}
                  type="checkbox"
                />
                Text before the cutoff
              </label>
            </fieldset>
            {household.preferences.dietaryNotes ? (
              <p className="text-sm leading-relaxed">
                Preferences carried with this household: {household.preferences.dietaryNotes}
              </p>
            ) : null}
            <ul className="flex flex-col gap-1 text-sm">
              {students.map((pupil) => (
                <li key={pupil.id}>
                  {pupil.firstName} {pupil.lastName}, {gradeLabel(pupil.grade)}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const vendor = snapshot.vendors.find((entry) => entry.id === day.vendorId);
          const items = day.itemIds.flatMap((itemId) => {
            const item = snapshot.menuItems.find((entry) => entry.id === itemId);
            return item ? [item] : [];
          });
          return (
            <MenuDayCard
              day={day}
              items={items}
              key={day.id}
              now={now}
              onPlace={demo.placeOrder}
              orders={snapshot.orders}
              students={students}
              vendorName={vendor?.name ?? "Vendor"}
            />
          );
        })}
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
}: {
  day: MenuDay;
  vendorName: string;
  items: MenuItem[];
  students: Student[];
  orders: Order[];
  now: Date;
  onPlace: (input: PlaceOrderInput) => PlaceOrderResult;
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
    orders.some((order) => order.studentId === pupil.id && order.menuDayId === day.id),
  );
  const missedStudents = students.filter(
    (pupil) =>
      !orders.some((order) => order.studentId === pupil.id && order.menuDayId === day.id),
  );
  const showMissed = status === "locked" && missedStudents.length > 0;
  const missedNames = missedStudents
    .map((pupil) => `${pupil.firstName} ${pupil.lastName}`)
    .join(", ");

  return (
    <article aria-labelledby={headingId} className="flex flex-col" id={day.id}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-medium" id={headingId}>
              {dayLabel}
            </h2>
          </CardTitle>
          <CardDescription>
            {vendorName}. Cutoff {formatCutoff(day.cutoffAt)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
              <p className="text-sm font-medium">{formatRemaining(remainingMs(day.cutoffAt, now))}</p>
            </div>
            <p aria-live="polite" className="sr-only">
              {lockNotice}
            </p>
            {items.length === 0 && !dayHasOrder ? (
              <p>No meals listed.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {showMissed ? (
                  <p
                    className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
                    now={now}
                    onMissedFocus={onMissedFocus}
                    onPlace={onPlace}
                    order={orders.find(
                      (entry) => entry.studentId === pupil.id && entry.menuDayId === day.id,
                    )}
                    student={pupil}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
}: {
  student: Student;
  day: MenuDay;
  items: MenuItem[];
  order: Order | undefined;
  now: Date;
  onPlace: (input: PlaceOrderInput) => PlaceOrderResult;
  onMissedFocus: () => void;
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
  // Hold the form for one extra render after the cutoff while focus is still
  // inside it, so the layout effect can see that focus before the form unmounts.
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
  const orderedItem = order
    ? items.find((item) => item.id === order.itemId)
    : undefined;
  const selected = items.find((item) => item.id === mealId);

  return (
    <section
      aria-labelledby={studentHeadingId}
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <h3 className="text-sm font-medium" id={studentHeadingId}>
        {student.firstName} {student.lastName}
        <span className="font-normal text-muted-foreground"> · {gradeLabel(student.grade)}</span>
      </h3>
      {order ? (
        <p
          className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          ref={orderedLine}
          tabIndex={-1}
        >
          Ordered: {orderedItem?.name ?? "Meal"} · {formatPrice(order.priceCents)}
        </p>
      ) : null}
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
          ref={formRef}
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
        >
          <FieldSet>
            <FieldLegend>Meal for {student.firstName}</FieldLegend>
            <ToggleGroup
              className="w-full flex-wrap"
              onValueChange={(next) => {
                const selectedId = next[0];
                if (selectedId) {
                  setItemId(selectedId);
                  setError(null);
                }
              }}
              size="lg"
              spacing={2}
              value={[mealId]}
              variant="outline"
            >
              {items.map((item) => (
                <ToggleGroupItem
                  className="min-h-11 min-w-11 flex-1 whitespace-normal"
                  key={item.id}
                  type="button"
                  value={item.id}
                >
                  {item.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {selected ? (
              <FieldDescription>{formatPrice(selected.priceCents)} per meal</FieldDescription>
            ) : null}
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldSet>
          <Button className="min-h-11 w-full" disabled={!mealId || locked} size="lg" type="submit">
            Place order for {student.firstName}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
