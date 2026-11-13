"use client";

import { Mail, MessageSquare } from "lucide-react";
import { useState } from "react";

import { useDemo } from "@/components/demo-provider";
import { StatusPill } from "@/components/status-pill";
import { formatCutoff, formatServiceDate } from "@/lib/domain/time-zone";
import type { Channel } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

function channelLabel(channel: Channel): string {
  return channel === "email" ? "Email" : "Text";
}

export function ReminderOutbox() {
  const demo = useDemo();
  const [channel, setChannel] = useState<"all" | Channel>("all");
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
  const shown = reminders.filter((reminder) => channel === "all" || reminder.channel === channel);
  const emailCount = reminders.filter((reminder) => reminder.channel === "email").length;
  const textCount = reminders.filter((reminder) => reminder.channel === "sms").length;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]" id="outbox">
      <section aria-labelledby="mock-outbox-heading" className="rounded-[20px] border border-line bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold" id="mock-outbox-heading">
              Mock outbox
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Recorded in this browser before each cutoff. No email or text was sent.
            </p>
          </div>
          <div aria-label="Channel" className="inline-flex w-fit rounded-full bg-fill p-1" role="group">
            {(
              [
                ["all", `All ${reminders.length}`],
                ["email", `Email ${emailCount}`],
                ["sms", `Text ${textCount}`],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-pressed={channel === value}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-ink-2",
                  channel === value && "bg-white text-ink shadow-[0_1px_2px_rgba(31,36,48,0.06)]",
                )}
                key={value}
                onClick={() => setChannel(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex gap-4 rounded-[20px] bg-brand-tint p-4 text-brand-ink">
          <p>
            <strong className="font-bold">Reminders go out 24 hours before a cutoff.</strong> Only
            households with a student still missing a meal, once per channel they opted into. This
            demo records them here and sends nothing.
          </p>
        </div>
        {shown.length === 0 ? (
          <p className="mt-4">No reminders queued.</p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {shown.map((reminder) => {
              const household = snapshot.households.find((entry) => entry.id === reminder.householdId);
              const day = snapshot.menuDays.find((entry) => entry.id === reminder.menuDayId);
              const householdName = household?.name ?? "Household";
              const dayLabel = day ? formatServiceDate(day.serviceDate) : "Menu day";
              return (
                <li className="flex items-start gap-3 border-t border-line py-4" key={reminder.id}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fill text-ink-2">
                    {reminder.channel === "email" ? (
                      <Mail aria-hidden="true" className="size-5" />
                    ) : (
                      <MessageSquare aria-hidden="true" className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {householdName} · {channelLabel(reminder.channel)}
                      </p>
                      <StatusPill className="h-6 px-2.5 text-[13px]" tone="neutral">
                        Mock · not sent
                      </StatusPill>
                    </div>
                    <p className="text-sm text-ink-2">{dayLabel}</p>
                    <p className="mt-2 rounded-2xl rounded-bl-sm border border-line bg-background px-3.5 py-3 text-[15px]">
                      {reminder.body}
                    </p>
                    <p className="mt-1.5 text-sm text-ink-2">
                      Recorded {formatCutoff(reminder.createdAt)}. Mock only, not delivered.
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {archived.length > 0 ? (
          <details className="mt-4 border-t border-line pt-3">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-2">
              Archived from the previous school year ({archived.length})
            </summary>
            <ul className="flex flex-col gap-2 pt-2">
              {archived.map((reminder) => {
                const household = snapshot.households.find((entry) => entry.id === reminder.householdId);
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
      </section>
      <aside className="rounded-[20px] border border-line bg-white p-6">
        <h2 className="text-xl font-bold">Who gets reminded</h2>
        <p className="mt-1 text-sm text-ink-2">Opt-ins carried with each household.</p>
        <ul className="mt-2">
          {snapshot.households.map((household) => (
            <li className="flex flex-wrap items-center gap-2 border-t border-line py-3" key={household.id}>
              <span className="min-w-24 font-semibold">{household.name}</span>
              <StatusPill tone={household.reminderOptIn.email ? "ok" : "neutral"}>
                {household.reminderOptIn.email ? "Email" : "Email off"}
              </StatusPill>
              <StatusPill tone={household.reminderOptIn.sms ? "ok" : "neutral"}>
                {household.reminderOptIn.sms ? "Text" : "Text off"}
              </StatusPill>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
