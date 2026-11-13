import type { Metadata } from "next";

import { ReminderOutbox } from "@/components/reminder-outbox";
import { RolloverCard } from "@/components/rollover-card";
import { VolunteerDashboard } from "@/components/volunteer-dashboard";

export const metadata: Metadata = {
  title: "Volunteer workspace",
};

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-8">
      <VolunteerDashboard />
      <RolloverCard />
      <ReminderOutbox />
    </div>
  );
}
