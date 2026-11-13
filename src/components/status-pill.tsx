import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

const tones = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-brand-tint text-brand-ink",
  neutral: "bg-fill text-ink-2",
  dark: "bg-dark text-white",
} as const;

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {tone === "ok" ? <Check aria-hidden="true" className="size-3.5" /> : null}
      {tone === "dark" ? <Lock aria-hidden="true" className="size-3.5" /> : null}
      {children}
    </span>
  );
}

export function DateTile({
  month,
  day,
  tone,
}: {
  month: string;
  day: string;
  tone: "brand" | "fill" | "dark";
}) {
  return (
    <span
      className={cn(
        "flex size-16 shrink-0 flex-col items-center justify-center rounded-[14px] leading-none",
        tone === "brand" && "bg-brand-tint text-brand-ink",
        tone === "fill" && "bg-fill text-ink-2",
        tone === "dark" && "bg-dark text-white",
      )}
    >
      <span className="text-xs font-semibold tracking-wide uppercase">{month}</span>
      <span className="text-xl font-bold">{day}</span>
    </span>
  );
}
