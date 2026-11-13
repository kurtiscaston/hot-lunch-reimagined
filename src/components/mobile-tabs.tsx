"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, CircleHelp, CreditCard, House, Inbox, Users } from "lucide-react";

import { cn } from "@/lib/utils";

function useHash() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return hash;
}

function tabClass(active: boolean) {
  return cn(
    "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-ink-2",
    active && "font-semibold text-brand",
  );
}

export function MobileTabs() {
  const pathname = usePathname();
  const hash = useHash();
  const volunteer = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <nav
      aria-label={volunteer ? "Volunteer" : "Main"}
      className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] border-t border-line bg-white md:hidden"
      data-print-hide="true"
    >
      {volunteer ? (
        <>
          <a className={tabClass(hash === "" || hash === "#totals")} href="#totals">
            <ChartIcon />
            Totals
          </a>
          <a className={tabClass(hash === "#payments")} href="#payments">
            <CreditCard aria-hidden="true" className="size-6" />
            Payments
          </a>
          <a className={tabClass(hash === "#missing")} href="#missing">
            <Users aria-hidden="true" className="size-6" />
            Missing
          </a>
          <a className={tabClass(hash === "#outbox")} href="#outbox">
            <Inbox aria-hidden="true" className="size-6" />
            Outbox
          </a>
          <a className={tabClass(hash === "#year")} href="#year">
            <Calendar aria-hidden="true" className="size-6" />
            Year
          </a>
        </>
      ) : (
        <>
          <Link aria-current={pathname === "/" ? "page" : undefined} className={tabClass(pathname === "/")} href="/">
            <House aria-hidden="true" className="size-6" />
            Home
          </Link>
          <Link
            aria-current={pathname.startsWith("/orders") ? "page" : undefined}
            className={tabClass(pathname.startsWith("/orders"))}
            href="/orders"
          >
            <Calendar aria-hidden="true" className="size-6" />
            Orders
          </Link>
          <Link
            aria-current={pathname.startsWith("/payments") ? "page" : undefined}
            className={tabClass(pathname.startsWith("/payments"))}
            href="/payments"
          >
            <CreditCard aria-hidden="true" className="size-6" />
            Payments
          </Link>
          <button className={tabClass(false)} disabled type="button">
            <CircleHelp aria-hidden="true" className="size-6" />
            Help
          </button>
        </>
      )}
    </nav>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 20V10M12 20V4M19 20v-7" strokeLinecap="round" />
    </svg>
  );
}
