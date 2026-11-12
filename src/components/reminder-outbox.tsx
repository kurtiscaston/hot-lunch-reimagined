"use client";

import { useDemo } from "@/components/demo-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCutoff, formatServiceDate } from "@/lib/domain/time-zone";
import type { Channel } from "@/lib/domain/types";

function channelLabel(channel: Channel): string {
  return channel === "email" ? "Email" : "Text";
}

export function ReminderOutbox() {
  const demo = useDemo();
  if (!demo) {
    return <p role="status">Loading demo data…</p>;
  }

  const { snapshot } = demo.state;
  const reminders = snapshot.reminders
    .filter((reminder) => !reminder.archived)
    .sort((left, right) => {
      const byTime = left.createdAt.localeCompare(right.createdAt);
      return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
    });
  const archived = snapshot.reminders.filter((reminder) => reminder.archived);

  return (
    <section aria-labelledby="mock-outbox-heading">
      <Card>
        <CardHeader>
          <CardTitle heading="h2" id="mock-outbox-heading">
            Mock outbox
          </CardTitle>
          <CardDescription>
            Recorded in this browser before each cutoff. No email or text was sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p>No reminders queued.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {reminders.map((reminder) => {
                const household = snapshot.households.find(
                  (entry) => entry.id === reminder.householdId,
                );
                const day = snapshot.menuDays.find((entry) => entry.id === reminder.menuDayId);
                const householdName = household?.name ?? "Household";
                const dayLabel = day ? formatServiceDate(day.serviceDate) : "Menu day";
                return (
                  <li className="flex flex-col gap-1 border-t border-border pt-4" key={reminder.id}>
                    <p className="font-medium">
                      {householdName} · {channelLabel(reminder.channel)}
                    </p>
                    <p className="text-sm text-muted-foreground">{dayLabel}</p>
                    <p className="text-sm leading-relaxed">{reminder.body}</p>
                    <p className="text-sm text-muted-foreground">
                      Recorded {formatCutoff(reminder.createdAt)}. Mock only, not delivered.
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {archived.length > 0 ? (
            <details className="mt-4">
              <summary className="min-h-11 cursor-pointer py-2">
                Archived from the previous school year ({archived.length})
              </summary>
              <ul className="flex flex-col gap-2 pt-2">
                {archived.map((reminder) => {
                  const household = snapshot.households.find(
                    (entry) => entry.id === reminder.householdId,
                  );
                  const day = snapshot.menuDays.find((entry) => entry.id === reminder.menuDayId);
                  const dayLabel = day ? formatServiceDate(day.serviceDate) : "Menu day";
                  return (
                    <li key={reminder.id}>
                      {household?.name ?? "Household"} · {channelLabel(reminder.channel)} · {dayLabel}.
                      Archived.
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
