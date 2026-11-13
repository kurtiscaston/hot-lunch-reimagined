import type { Metadata } from "next";

import { PaymentsBoard } from "@/components/payments-board";

export const metadata: Metadata = {
  title: "Payments & history",
};

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[30px] leading-none font-extrabold tracking-tight md:text-[40px]">
          Payments &amp; history
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-2">
          Every order, fee, and payment is on the account.
        </p>
      </div>
      <PaymentsBoard />
    </div>
  );
}
