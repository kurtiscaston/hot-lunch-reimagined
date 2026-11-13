"use client";

import { useDemo } from "@/components/demo-provider";
import { btnDark, btnSecondary } from "@/components/ui-classes";
import { CloudOff } from "lucide-react";

export function StorageAlert() {
  const demo = useDemo();
  if (!demo || demo.persisted) {
    return null;
  }

  return (
    <div className="border-b border-[#f4cdb4] bg-brand-tint text-brand-ink" role="alert">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:px-20">
        <CloudOff aria-hidden="true" className="size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">We couldn&apos;t save to this browser.</p>
          <p>
            Your latest change is on screen but will be lost if you close this tab. Private browsing
            or full storage can cause this.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnSecondary} onClick={() => demo.retrySave()} type="button">
            Try again
          </button>
          <button
            className={btnDark}
            onClick={() => {
              const confirmed = window.confirm(
                "Reset demo data? This clears the orders saved in this browser.",
              );
              if (confirmed) {
                demo.reset();
              }
            }}
            type="button"
          >
            Reset demo
          </button>
        </div>
      </div>
    </div>
  );
}
