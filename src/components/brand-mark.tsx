import { PRODUCT_NAME, SCHOOL_NAME } from "@/lib/site";

export function BowlIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 11h16a8 8 0 0 1-16 0z" />
      <path d="M9 4v3M12 3v4M15 4v3" />
    </svg>
  );
}

export function BrandMark() {
  return (
    <span className="flex min-w-0 items-center gap-2 md:gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand text-white md:size-10">
        <BowlIcon className="size-5 md:size-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-none font-bold tracking-tight break-normal md:text-base md:leading-tight lg:text-xl">
          {PRODUCT_NAME}
        </span>
        <span className="mt-0.5 block text-[11px] leading-tight font-medium break-normal text-ink-2 md:text-xs">
          Unofficial concept · {SCHOOL_NAME}
        </span>
      </span>
    </span>
  );
}
