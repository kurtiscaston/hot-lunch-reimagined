import { OrderingBoard } from "@/components/ordering-board";
import { SCHOOL_NAME } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Order lunch before the cutoff.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          {SCHOOL_NAME} families choose a meal for each child. Ordering locks at
          the cutoff.
        </p>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Times shown in Pacific Time (America/Vancouver).
        </p>
      </div>
      <OrderingBoard />
    </div>
  );
}
