import { createSeed } from "@/lib/domain/seed";
import type { Grade, Household, LunchSnapshot, Student } from "@/lib/domain/types";

const NEXT_GRADE: Record<Grade, Grade | "archived"> = {
  K: "1",
  "1": "2",
  "2": "3",
  "3": "4",
  "4": "5",
  "5": "archived",
};

export interface RolloverChange {
  studentId: string;
  name: string;
  from: Grade;
  to: Grade | "archived";
}

export interface RolloverHousehold {
  id: string;
  name: string;
  dietaryNotes: string;
  email: boolean;
  sms: boolean;
}

export interface RolloverPreview {
  alreadyApplied: boolean;
  fromYear: string;
  toYear: string | null;
  changes: RolloverChange[];
  ordersArchived: number;
  remindersArchived: number;
  households: RolloverHousehold[];
}

export function nextSchoolYearLabel(label: string): string | null {
  const match = /^(\d{4})–(\d{4})$/.exec(label);
  const start = Number(match?.[1]);
  const end = Number(match?.[2]);
  if (!match || end !== start + 1) {
    return null;
  }
  return `${start + 1}–${end + 1}`;
}

export function describeChange(change: RolloverChange): string {
  if (change.to === "archived") {
    return `${change.name} finishes Grade 5 and is archived.`;
  }
  return `${change.name} moves from ${gradeName(change.from)} to ${gradeName(change.to)}.`;
}

function gradeName(grade: Grade): string {
  return grade === "K" ? "Kindergarten" : `Grade ${grade}`;
}

function priorId(id: string): string {
  return id.startsWith("prior-") ? id : `prior-${id}`;
}

function householdCarry(households: Household[]): RolloverHousehold[] {
  return households.map((household) => ({
    id: household.id,
    name: household.name,
    dietaryNotes: household.preferences.dietaryNotes,
    email: household.reminderOptIn.email,
    sms: household.reminderOptIn.sms,
  }));
}

function studentChange(pupil: Student): RolloverChange {
  return {
    studentId: pupil.id,
    name: `${pupil.firstName} ${pupil.lastName}`,
    from: pupil.grade,
    to: NEXT_GRADE[pupil.grade],
  };
}

function advanceStudent(pupil: Student): Student {
  if (pupil.archived) {
    return pupil;
  }
  const next = NEXT_GRADE[pupil.grade];
  if (next === "archived") {
    return { ...pupil, archived: true };
  }
  return { ...pupil, grade: next };
}

export function previewRollover(snapshot: LunchSnapshot): RolloverPreview {
  const households = householdCarry(snapshot.households);
  if (snapshot.rolloverApplied) {
    return {
      alreadyApplied: true,
      fromYear: snapshot.schoolYearLabel,
      toYear: snapshot.schoolYearLabel,
      changes: [],
      ordersArchived: 0,
      remindersArchived: 0,
      households,
    };
  }
  const changes = snapshot.students
    .filter((pupil) => !pupil.archived)
    .map(studentChange)
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    alreadyApplied: false,
    fromYear: snapshot.schoolYearLabel,
    toYear: nextSchoolYearLabel(snapshot.schoolYearLabel),
    changes,
    ordersArchived: snapshot.orders.filter((order) => !order.archived).length,
    remindersArchived: snapshot.reminders.filter((reminder) => !reminder.archived).length,
    households,
  };
}

/** Households, notes, and reminder choices stay. Grades move up. Grade 5 is archived. */
export function applyRollover(snapshot: LunchSnapshot, now: Date): LunchSnapshot {
  const toYear = nextSchoolYearLabel(snapshot.schoolYearLabel);
  if (snapshot.rolloverApplied || !toYear) {
    return snapshot;
  }
  const fresh = createSeed(now);
  return {
    schoolName: snapshot.schoolName,
    schoolYearLabel: toYear,
    rolloverApplied: true,
    households: snapshot.households.map((household) => ({
      ...household,
      preferences: { ...household.preferences },
      reminderOptIn: { ...household.reminderOptIn },
    })),
    students: snapshot.students.map(advanceStudent),
    vendors: snapshot.vendors,
    menuItems: snapshot.menuItems,
    menuDays: [
      ...snapshot.menuDays.map((day) => ({ ...day, id: priorId(day.id), archived: true })),
      ...fresh.menuDays,
    ],
    orders: snapshot.orders.map((order) => ({
      ...order,
      archived: true,
      menuDayId: priorId(order.menuDayId),
    })),
    payments: snapshot.payments,
    reminders: snapshot.reminders.map((reminder) => ({
      ...reminder,
      archived: true,
      menuDayId: priorId(reminder.menuDayId),
    })),
  };
}
