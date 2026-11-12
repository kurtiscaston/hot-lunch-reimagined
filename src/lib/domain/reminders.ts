import { CHANNELS, type Channel, type LunchSnapshot, type Reminder } from "@/lib/domain/types";
import { SCHOOL_NAME } from "@/lib/site";

/** Queue a mock reminder once the cutoff is this close, and still in the future. */
export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

function reminderKey(householdId: string, menuDayId: string, channel: Channel): string {
  return `${householdId}:${menuDayId}:${channel}`;
}

export function reminderBody(householdName: string, dayLabel: string, channel: Channel): string {
  const channelLabel = channel === "email" ? "email" : "text";
  return `${SCHOOL_NAME} demo ${channelLabel} for ${householdName}. ${dayLabel} is still open. No message was sent.`;
}

/** True when a menu day is still open and inside the reminder window. */
export function reminderWindowOpen(snapshot: LunchSnapshot, now: Date): boolean {
  const nowMs = now.getTime();
  return snapshot.menuDays.some((day) => {
    if (day.itemIds.length === 0) {
      return false;
    }
    const cutoff = Date.parse(day.cutoffAt);
    if (Number.isNaN(cutoff)) {
      return false;
    }
    const remaining = cutoff - nowMs;
    return remaining > 0 && remaining <= REMINDER_LEAD_MS;
  });
}

/** Reminders that are due now and not already in the snapshot. Nothing is sent. */
export function dueReminders(snapshot: LunchSnapshot, now: Date): Reminder[] {
  const nowMs = now.getTime();
  const seen = new Set(
    snapshot.reminders.map((reminder) =>
      reminderKey(reminder.householdId, reminder.menuDayId, reminder.channel),
    ),
  );
  const due: Reminder[] = [];

  for (const day of snapshot.menuDays) {
    const cutoff = Date.parse(day.cutoffAt);
    if (
      day.itemIds.length === 0 ||
      Number.isNaN(cutoff) ||
      cutoff <= nowMs ||
      cutoff - nowMs > REMINDER_LEAD_MS
    ) {
      continue;
    }
    for (const household of snapshot.households) {
      const pupils = snapshot.students.filter(
        (pupil) => pupil.householdId === household.id && !pupil.archived,
      );
      const missing = pupils.some(
        (pupil) =>
          !snapshot.orders.some(
            (order) => order.studentId === pupil.id && order.menuDayId === day.id,
          ),
      );
      if (!missing) {
        continue;
      }
      for (const channel of CHANNELS) {
        if (!household.reminderOptIn[channel]) {
          continue;
        }
        const key = reminderKey(household.id, day.id, channel);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        due.push({
          id: `rem-${household.id}-${day.id}-${channel}`,
          householdId: household.id,
          menuDayId: day.id,
          channel,
          createdAt: now.toISOString(),
          body: reminderBody(household.name, day.label, channel),
          status: "mock-sent",
        });
      }
    }
  }

  due.sort((left, right) => left.id.localeCompare(right.id));
  return due;
}

/** Same snapshot when nothing new is due. */
export function queueDueReminders(snapshot: LunchSnapshot, now: Date): LunchSnapshot {
  const due = dueReminders(snapshot, now);
  if (due.length === 0) {
    return snapshot;
  }
  return { ...snapshot, reminders: [...snapshot.reminders, ...due] };
}

export function setReminderOptIn(
  snapshot: LunchSnapshot,
  householdId: string,
  channel: Channel,
  enabled: boolean,
): LunchSnapshot {
  let changed = false;
  const households = snapshot.households.map((household) => {
    if (household.id !== householdId || household.reminderOptIn[channel] === enabled) {
      return household;
    }
    changed = true;
    return {
      ...household,
      reminderOptIn: { ...household.reminderOptIn, [channel]: enabled },
    };
  });
  if (!changed) {
    return snapshot;
  }
  return { ...snapshot, households };
}
