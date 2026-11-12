"use client";

import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const demo = useDemo();

  return (
    <Button
      className="min-h-11"
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
      size="lg"
      type="button"
      variant="outline"
    >
      Reset demo data
    </Button>
  );
}
