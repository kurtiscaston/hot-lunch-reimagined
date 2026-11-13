import type { Metadata } from "next";
import { Suspense } from "react";

import { OrdersScreen } from "@/components/ordering-board";

export const metadata: Metadata = {
  title: "Orders",
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<p role="status">Loading demo data…</p>}>
      <OrdersScreen />
    </Suspense>
  );
}
