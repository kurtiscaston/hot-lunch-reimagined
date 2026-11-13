"use client";

import { useEffect, useRef, useState } from "react";

import { useDemo } from "@/components/demo-provider";
import { btnPrimary, btnSecondary } from "@/components/ui-classes";
import { describeChange, previewRollover } from "@/lib/domain/rollover";

function householdsKeep(count: number): string {
  if (count === 1) {
    return "1 household keeps its preferences and reminder choices.";
  }
  return `${count} households keep their preferences and reminder choices.`;
}

export function RolloverCard() {
  const demo = useDemo();
  const resultRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const rolled = demo?.state.snapshot.rolloverApplied === true;

  useEffect(() => {
    if (applied && rolled) {
      resultRef.current?.focus();
    }
  }, [applied, rolled]);

  if (!demo) {
    return <p role="status">Loading demo data…</p>;
  }

  const preview = open ? previewRollover(demo.state.snapshot) : null;
  const ready = preview !== null && !preview.alreadyApplied && preview.toYear !== null;

  return (
    <section aria-labelledby="rollover-heading" className="rounded-[20px] border border-line bg-white p-6" id="year">
      <h2 className="text-xl font-bold" id="rollover-heading">
        School year
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        Households stay. Students move up a grade. Grade 5 is archived, and this year&apos;s
        orders, reminders, and payments stay on file. The demo reseeds daily.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <p>Current year: {demo.state.snapshot.schoolYearLabel}.</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={`${btnSecondary} min-h-11`}
            disabled={rolled}
            onClick={() => setOpen(true)}
            type="button"
          >
            Preview rollover
          </button>
          <button
            className={`${btnPrimary} min-h-11`}
            disabled={!ready}
            onClick={() => {
              demo.applyRollover();
              setApplied(true);
            }}
            type="button"
          >
            Apply rollover
          </button>
        </div>
        {rolled ? (
          <p
            className="rounded-md focus:shadow-[0_0_0_3px_rgba(194,65,12,0.35)]"
            ref={resultRef}
            role={applied ? "status" : undefined}
            tabIndex={-1}
          >
            {demo.state.snapshot.schoolYearLabel} is the current school year.
          </p>
        ) : null}
        {preview && !preview.alreadyApplied && preview.toYear === null ? (
          <p>This school year label cannot roll forward.</p>
        ) : null}
        <p className={ready && preview ? undefined : "sr-only"} role="status">
          {ready && preview
            ? `Preview only. Applying moves ${preview.fromYear} to ${preview.toYear}.`
            : ""}
        </p>
        {ready && preview ? (
          <div className="flex flex-col gap-3">
            <p>{householdsKeep(preview.households.length)}</p>
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
              {preview.ordersArchived} orders and {preview.remindersArchived} reminders move to the
              archive.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
