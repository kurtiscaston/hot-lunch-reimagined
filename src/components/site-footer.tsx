"use client";

import { usePathname } from "next/navigation";

import { ResetDemoButton } from "@/components/reset-demo-button";
import { DISCLAIMER, SCHOOL_NAME } from "@/lib/site";

export function SiteFooter() {
  const pathname = usePathname();
  const payments = pathname.startsWith("/payments");
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  const prompt = payments
    ? "Something look wrong?"
    : admin
      ? "Totals look wrong?"
      : "Questions about an order?";

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-6 md:px-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-2">
            {prompt}{" "}
            <button className="font-semibold text-brand-ink disabled:cursor-not-allowed" disabled type="button">
              Get help
            </button>
          </p>
          <label className="flex items-center gap-3 font-semibold text-ink-2">
            Language
            <select
              aria-label="Language"
              className="h-11 rounded-xl border border-line-strong bg-white px-3 font-medium text-ink"
              disabled
              defaultValue="en"
            >
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <div className="flex items-start gap-2.5 border-t border-dashed border-line-strong pt-4 text-sm text-ink-2">
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-fill px-2.5 text-xs font-semibold tracking-wide text-ink-2">
            UNOFFICIAL
          </span>
          <p>
            <strong className="font-semibold text-ink-2">{DISCLAIMER}.</strong> {SCHOOL_NAME} and
            every household, student, and vendor in this demo are fictional. <ResetDemoButton />
          </p>
        </div>
      </div>
    </footer>
  );
}
