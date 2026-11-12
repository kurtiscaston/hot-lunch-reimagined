"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <div className="flex flex-col gap-1.5">
      <p id="demo-role-hint" className="text-xs font-medium text-muted-foreground">
        Demo only — not a sign-in
      </p>
      <nav
        aria-describedby="demo-role-hint"
        aria-label="Demo role"
        className="flex w-full sm:w-fit"
      >
        {ROLES.map((entry, index) => {
          const current = entry.role === role;
          return (
            <Link
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center border px-4 text-sm font-medium focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:min-w-11 sm:flex-none",
                index === 0 ? "rounded-l-lg" : "-ml-px rounded-r-lg",
                current
                  ? "relative z-10 border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
              href={entry.href}
              key={entry.role}
            >
              {entry.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
