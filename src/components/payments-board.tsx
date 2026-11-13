"use client";

import { Download, Printer } from "lucide-react";
import { useState } from "react";

import { useDemo } from "@/components/demo-provider";
import { HouseholdSelect } from "@/components/household-select";
import { btnPhone, btnPrimary, btnSecondary } from "@/components/ui-classes";
import { formatDifference } from "@/lib/domain/dashboard";
import { downloadTextFile } from "@/lib/download-file";
import {
  balanceFor,
  householdLedger,
  ledgerCsv,
  owingCents,
  type LedgerKind,
} from "@/lib/domain/parent-account";
import { formatDateTime, formatPrice } from "@/lib/domain/time-zone";
import type { BalanceStatus } from "@/lib/domain/dashboard";

const PAGE_SIZE = 8;

function balanceState(status: BalanceStatus): string {
  if (status === "short") {
    return "Short";
  }
  if (status === "credit") {
    return "Credit";
  }
  return "Paid up";
}

function chipClass(kind: LedgerKind): string {
  if (kind === "PAY") {
    return "bg-ok-bg text-ok";
  }
  return "bg-brand-tint text-brand-ink";
}

export function PaymentsBoard() {
  const demo = useDemo();
  const [expanded, setExpanded] = useState(false);

  if (!demo) {
    return <p role="status">Loading demo data…</p>;
  }

  const { snapshot, householdId } = demo.state;
  const household = snapshot.households.find((entry) => entry.id === householdId);
  if (!household) {
    return <p>That demo household is not in the sample data.</p>;
  }

  const balance = balanceFor(snapshot, household.id);
  const owing = balance ? owingCents(balance) : 0;
  const entries = householdLedger(snapshot, household.id);
  const visible = expanded || entries.length <= PAGE_SIZE ? entries : entries.slice(-PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <HouseholdSelect />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-line bg-white p-6">
          <h2 className="text-sm font-semibold text-ink-2">Account balance</h2>
          <p className="mt-2 text-[40px] leading-none font-extrabold tabular-nums">
            {formatPrice(owing)}
          </p>
          <p className="mt-1 text-ink-2">owing</p>
          {balance ? (
            <p className="mt-3 font-semibold">
              {balanceState(balance.status)}
              {balance.status === "credit" ? ` ${formatDifference(balance.differenceCents)}` : null}
            </p>
          ) : null}
          {balance ? (
            <p className="mt-2 text-sm text-ink-2">
              Owed {formatPrice(balance.owedCents)} · Paid {formatPrice(balance.paidCents)}
            </p>
          ) : null}
        </section>
        <section className="rounded-[20px] border border-line bg-white p-6">
          <h2 className="text-xl font-bold">Pay online</h2>
          <p className="mt-2 text-ink-2">
            Payments in this demo are the cash, check, and mock transfer already on the account.
          </p>
          <button className={`${btnPrimary} ${btnPhone} mt-4`} disabled type="button">
            {owing === 0 ? "Nothing to pay right now" : "Pay online isn't in this demo"}
          </button>
        </section>
      </div>

      <section aria-labelledby="transactions-heading" className="rounded-[20px] border border-line bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold" id="transactions-heading">
            Transactions
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={() => window.print()} type="button">
              <Printer aria-hidden="true" className="size-5" />
              Print
            </button>
            <button
              className={btnSecondary}
              onClick={() =>
                downloadTextFile(
                  "maple-hollow-payments.csv",
                  ledgerCsv(entries),
                  "text/csv;charset=utf-8",
                )
              }
              type="button"
            >
              <Download aria-hidden="true" className="size-5" />
              Export CSV
            </button>
          </div>
        </div>
        {entries.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <h3 className="text-lg font-bold">No orders yet this school year</h3>
            <p className="mx-auto mt-2 max-w-sm text-ink-2">
              Pick a meal for a menu day that&apos;s still open and it shows up here with its total.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-sm font-semibold text-ink-2">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">What</th>
                  <th className="px-3 py-3 font-semibold">Reference</th>
                  <th className="px-3 py-3 text-right font-semibold">Charge</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid</th>
                  <th className="px-3 py-3 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <tr className="border-b border-line last:border-b-0" key={entry.id}>
                    <td className="px-3 py-4 whitespace-nowrap">{formatDateTime(entry.at)}</td>
                    <td className="px-3 py-4">
                      <span className="flex items-center gap-3">
                        <span
                          className={`grid size-10 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${chipClass(entry.kind)}`}
                        >
                          {entry.kind}
                        </span>
                        <span>{entry.what}</span>
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-ink-2">{entry.reference}</td>
                    <td className="px-3 py-4 text-right tabular-nums">
                      {entry.chargeCents === null ? "" : formatPrice(entry.chargeCents)}
                    </td>
                    <td className="px-3 py-4 text-right font-semibold text-ok tabular-nums">
                      {entry.paidCents === null ? "" : formatPrice(entry.paidCents)}
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums">
                      {formatPrice(entry.balanceCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {entries.length > PAGE_SIZE && !expanded ? (
          <button className={`${btnSecondary} mt-4`} onClick={() => setExpanded(true)} type="button">
            Show more
          </button>
        ) : null}
      </section>
    </div>
  );
}
