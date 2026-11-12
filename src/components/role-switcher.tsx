"use client";

import { usePathname, useRouter } from "next/navigation";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type DemoRole = "parent" | "volunteer";

function roleFromPath(pathname: string): DemoRole {
  return pathname.startsWith("/admin") ? "volunteer" : "parent";
}

export function RoleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const role = roleFromPath(pathname);

  return (
    <div className="flex flex-col gap-1.5">
      <p id="demo-role-hint" className="text-xs font-medium text-muted-foreground">
        Demo only — not a sign-in
      </p>
      <ToggleGroup
        aria-describedby="demo-role-hint"
        aria-label="Demo role"
        className="w-full sm:w-fit"
        onValueChange={(next) => {
          const selected = next[0];
          if (selected !== "parent" && selected !== "volunteer") {
            return;
          }
          router.push(selected === "volunteer" ? "/admin" : "/");
        }}
        size="lg"
        spacing={0}
        value={[role]}
        variant="outline"
      >
        <ToggleGroupItem className="flex-1 sm:flex-none" value="parent">
          Parent
        </ToggleGroupItem>
        <ToggleGroupItem className="flex-1 sm:flex-none" value="volunteer">
          Volunteer
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
