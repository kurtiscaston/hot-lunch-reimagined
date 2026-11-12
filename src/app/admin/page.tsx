import type { Metadata } from "next";

import { ReminderOutbox } from "@/components/reminder-outbox";
import { RolloverCard } from "@/components/rollover-card";
import { VolunteerDashboard } from "@/components/volunteer-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Volunteer workspace",
};

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Volunteer workspace
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          The place where a hot lunch volunteer checks vendor totals, payments,
          and which students still need a meal.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Demo view</CardTitle>
          <CardDescription>
            You are previewing the volunteer role. Nothing here is signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed">
            Switch back to Parent to return to the family view. Both views share
            the same fictional school and the same disclaimer.
          </p>
        </CardContent>
      </Card>
      <VolunteerDashboard />
      <RolloverCard />
      <ReminderOutbox />
    </div>
  );
}
