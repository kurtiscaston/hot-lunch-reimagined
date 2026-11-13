"use client";

import { useDemo } from "@/components/demo-provider";

export function HouseholdSelect() {
  const demo = useDemo();
  if (!demo) {
    return null;
  }
  const { snapshot, householdId } = demo.state;

  return (
    <div className="flex max-w-md flex-col gap-2">
      <label className="text-sm font-semibold" htmlFor="demo-household">
        Household
      </label>
      <select
        className="h-11 w-full rounded-xl border border-line-strong bg-white px-3"
        id="demo-household"
        onChange={(event) => demo.setHouseholdId(event.target.value)}
        value={householdId}
      >
        {snapshot.households.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
      <p className="text-sm text-ink-2">
        Sample families only. Switching households does not sign anyone in.
      </p>
    </div>
  );
}
