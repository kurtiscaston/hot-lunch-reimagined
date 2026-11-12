"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
import { formatRemaining, isOrderingLocked, menuDayStatus, remainingMs } from "@/lib/domain/cutoff";
import {
  placeOrderMessage,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/lib/domain/place-order";
import type { MenuDay, MenuItem, Order, Student } from "@/lib/domain/types";
import { formatCutoff, formatPrice, formatServiceDate } from "@/lib/domain/time-zone";

let clockMs = 0;

function subscribeClock(listener: () => void) {
  const timer = window.setInterval(() => {
    clockMs = Date.now();
    listener();
  }, 1000);
  return () => window.clearInterval(timer);
}

function readClock(): number {
  if (clockMs === 0) {
    clockMs = Date.now();
  }
  return clockMs;
}

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
    return <p>Loading demo data…</p>;
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
          <CardTitle>{household.name}</CardTitle>
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
  const headingId = `${day.id}-heading`;

  return (
    <article aria-labelledby={headingId} className="flex flex-col">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-medium" id={headingId}>
              {formatServiceDate(day.serviceDate)}
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
            <div className="flex flex-col gap-4">
              {students.map((pupil) => (
                <StudentOrder
                  day={day}
                  items={items}
                  key={pupil.id}
                  now={now}
                  onPlace={onPlace}
                  order={orders.find(
                    (entry) => entry.studentId === pupil.id && entry.menuDayId === day.id,
                  )}
                  student={pupil}
                />
              ))}
            </div>
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
}: {
  student: Student;
  day: MenuDay;
  items: MenuItem[];
  order: Order | undefined;
  now: Date;
  onPlace: (input: PlaceOrderInput) => PlaceOrderResult;
}) {
  const firstItem = items[0];
  const [itemId, setItemId] = useState(firstItem?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const orderedLine = useRef<HTMLParagraphElement>(null);
  const hadOrder = useRef(order !== undefined);

  useEffect(() => {
    if (order && !hadOrder.current) {
      orderedLine.current?.focus();
    }
    hadOrder.current = order !== undefined;
  }, [order]);
  const locked = isOrderingLocked(day.cutoffAt, now);
  const studentHeadingId = `${day.id}-${student.id}-name`;
  const orderedItem = order
    ? items.find((item) => item.id === order.itemId)
    : undefined;
  const selected = items.find((item) => item.id === itemId);

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
      {!order && locked ? <p>Missed the cutoff.</p> : null}
      {!order && !locked && firstItem ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const result = onPlace({
              studentId: student.id,
              menuDayId: day.id,
              itemId,
            });
            if (!result.ok) {
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
              value={[itemId]}
              variant="outline"
            >
              {items.map((item) => (
                <ToggleGroupItem
                  className="flex-1 whitespace-normal"
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
          <Button className="w-full" disabled={!itemId} size="lg" type="submit">
            Place order for {student.firstName}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
