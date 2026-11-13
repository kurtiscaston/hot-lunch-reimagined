"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type DemoRole = "parent" | "volunteer";

const ROLES = [
  { role: "parent", href: "/", label: "Parent" },
  { role: "volunteer", href: "/admin", label: "Volunteer" },
] as const satisfies ReadonlyArray<{
  role: DemoRole;
  href: string;
  label: string;
}>;

function roleFromPath(pathname: string): DemoRole {
  return pathname === "/admin" || pathname.startsWith("/admin/") ? "volunteer" : "parent";
}

export function RoleSwitcher() {
  const pathname = usePathname();
  const role = roleFromPath(pathname);

  return (
    <nav
      aria-describedby="demo-role-hint"
      aria-label="Demo role"
      className="inline-flex rounded-full bg-fill p-1"
    >
      {ROLES.map((entry) => {
        const current = entry.role === role;
        return (
          <Link
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-11 min-w-11 items-center justify-center rounded-full px-2.5 text-[13px] font-medium md:px-3 md:text-sm lg:px-4 lg:text-[15px]",
              current ? "bg-dark font-semibold text-white" : "bg-fill text-ink",
            )}
            href={entry.href}
            key={entry.role}
          >
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}
