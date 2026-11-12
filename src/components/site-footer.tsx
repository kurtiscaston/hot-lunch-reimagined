import { DISCLAIMER, SCHOOL_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6">
        <p className="text-sm font-medium text-foreground">{DISCLAIMER}</p>
        <p className="text-sm text-muted-foreground">
          {SCHOOL_NAME} and every household, student, and vendor in this demo
          are fictional.
        </p>
      </div>
    </footer>
  );
}
