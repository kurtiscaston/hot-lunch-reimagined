"use client";

import { useDemo } from "@/components/demo-provider";
import { btnSecondary } from "@/components/ui-classes";

export function ResetDemoButton() {
  const demo = useDemo();

  return (
    <button
      className={`${btnSecondary} min-h-11`}
      disabled={!demo}
      onClick={() => {
        if (!demo) {
          return;
        }
        const confirmed = window.confirm(
          "Reset demo data? This clears the orders saved in this browser.",
        );
        if (!confirmed) {
          return;
        }
        demo.reset();
      }}
      type="button"
    >
      Reset demo data
    </button>
  );
}
