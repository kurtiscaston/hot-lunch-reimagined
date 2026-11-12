"use client";

import { useState } from "react";

import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { describeChange, previewRollover } from "@/lib/domain/rollover";

export function RolloverCard() {
  const demo = useDemo();
  const [open, setOpen] = useState(false);
  if (!demo) {
    return <p role="status">Loading demo data…</p>;
  }

  const preview = open ? previewRollover(demo.state.snapshot) : null;
  const ready = preview !== null && !preview.alreadyApplied && preview.toYear !== null;

  return (
    <section aria-labelledby="rollover-heading">
      <Card>
        <CardHeader>
          <CardTitle heading="h2" id="rollover-heading">
            School year
          </CardTitle>
          <CardDescription>
            Households stay. Students move up a grade. Grade 5 is archived, and this year&apos;s
            orders and reminders stay on file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p>Current year: {demo.state.snapshot.schoolYearLabel}.</p>
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-11" onClick={() => setOpen(true)} type="button">
                Preview rollover
              </Button>
              <Button
                className="min-h-11"
                disabled={!ready}
                onClick={() => demo.applyRollover()}
                type="button"
                variant="outline"
              >
                Apply rollover
              </Button>
            </div>
            {preview?.alreadyApplied ? <p>{preview.fromYear} is the current school year.</p> : null}
            {preview && !preview.alreadyApplied && preview.toYear === null ? (
              <p>This school year label cannot roll forward.</p>
            ) : null}
            {ready && preview ? (
              <div className="flex flex-col gap-3">
                <p>
                  Preview only. Applying moves {preview.fromYear} to {preview.toYear}.
                </p>
                <p>
                  {preview.households.length} households keep their preferences and reminder
                  choices.
                </p>
                <ul className="flex flex-col gap-2">
                  {preview.households.map((household) => (
                    <li key={household.id}>
                      {household.name}: {household.dietaryNotes || "No dietary notes."} Email{" "}
                      {household.email ? "on" : "off"}, text {household.sms ? "on" : "off"}.
                    </li>
                  ))}
                </ul>
                <ul className="flex flex-col gap-2">
                  {preview.changes.map((change) => (
                    <li key={change.studentId}>{describeChange(change)}</li>
                  ))}
                </ul>
                <p>
                  {preview.ordersArchived} orders and {preview.remindersArchived} reminders move to
                  the archive.
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
