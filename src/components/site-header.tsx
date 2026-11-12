import Link from "next/link";

import { RoleSwitcher } from "@/components/role-switcher";
import { PRODUCT_NAME, SCHOOL_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <a
        className="sr-only bg-primary text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
        href="#main"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="flex flex-col gap-0.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          href="/"
        >
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            {SCHOOL_NAME}
          </span>
          <span className="text-base font-semibold tracking-tight">
            {PRODUCT_NAME}
          </span>
        </Link>
        <RoleSwitcher />
      </div>
    </header>
  );
}
