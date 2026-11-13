"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { RoleSwitcher } from "@/components/role-switcher";
import { useHash } from "@/components/use-hash";
import { cn } from "@/lib/utils";

const PARENT_LINKS = [
  { href: "/", label: "Home", match: (pathname: string) => pathname === "/" },
  { href: "/orders", label: "Orders", match: (pathname: string) => pathname.startsWith("/orders") },
  {
    href: "/payments",
    label: "Payments",
    match: (pathname: string) => pathname.startsWith("/payments"),
  },
] as const;

const VOLUNTEER_LINKS = [
  { href: "#totals", label: "Totals" },
  { href: "#payments", label: "Payments" },
  { href: "#missing", label: "Missing" },
  { href: "#outbox", label: "Outbox" },
  { href: "#year", label: "School year" },
] as const;

function navClass(active: boolean) {
  return cn(
    "inline-flex h-11 items-center rounded-full px-2.5 text-sm font-medium text-ink-2 lg:px-4 lg:text-base",
    active && "bg-fill font-semibold text-ink",
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const hash = useHash();
  const volunteer = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <a
        className="sr-only bg-brand text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:px-3 focus:py-2"
        href="#main"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-2 px-4 sm:h-auto sm:min-h-16 sm:py-2.5 md:min-h-[72px] md:gap-4 md:px-8 lg:gap-8 lg:px-20">
        <Link className="mr-auto min-w-0 rounded-xl" href={volunteer ? "/admin" : "/"}>
          <BrandMark />
        </Link>
        {volunteer ? (
          <nav aria-label="Volunteer sections" className="hidden items-center gap-1 lg:flex">
            {VOLUNTEER_LINKS.map((link) => {
              const active = hash === link.href || (link.href === "#totals" && hash === "");
              return (
                <a className={navClass(active)} href={link.href} key={link.href}>
                  {link.label}
                </a>
              );
            })}
          </nav>
        ) : (
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {PARENT_LINKS.map((link) => (
              <Link
                aria-current={link.match(pathname) ? "page" : undefined}
                className={navClass(link.match(pathname))}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
            <button className={navClass(false)} disabled type="button">
              Help
            </button>
          </nav>
        )}
        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          <p
            className="sr-only text-right text-[11px] leading-snug font-medium text-ink-2 sm:not-sr-only"
            id="demo-role-hint"
          >
            Demo only — not a sign-in
          </p>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}
