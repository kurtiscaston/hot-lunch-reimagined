"use client";

import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const demo = useDemo();

  return (
    <Button
      disabled={!demo}
      onClick={() => demo?.reset()}
      size="lg"
      type="button"
      variant="outline"
    >
      Reset demo data
    </Button>
  );
}
