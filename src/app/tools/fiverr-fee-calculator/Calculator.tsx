"use client";

import { useMemo, useState } from "react";
import Field from "@/components/tools/Field";
import ResultCard from "@/components/tools/ResultCard";
import {
  calculateFiverrEarnings,
  FIVERR_WITHDRAWAL_METHODS,
  type FiverrWithdrawalMethod,
} from "@/lib/sellerFees/fiverr";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function FiverrCalculator() {
  const [gigPrice, setGigPrice] = useState(100);
  const [extras, setExtras] = useState(0);
  const [tip, setTip] = useState(0);
  const [withdrawalMethod, setWithdrawalMethod] = useState<FiverrWithdrawalMethod>("paypal");

  const result = useMemo(
    () => calculateFiverrEarnings({ gigPrice, extras, tip, withdrawalMethod }),
    [gigPrice, extras, tip, withdrawalMethod],
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field label="Gig price" value={gigPrice} onChange={setGigPrice} prefix="$" />
        <Field label="Gig extras / upsells" value={extras} onChange={setExtras} prefix="$" />
        <Field label="Tip" value={tip} onChange={setTip} prefix="$" />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Withdrawal method
          </span>
          <select
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={withdrawalMethod}
            onChange={(e) => setWithdrawalMethod(e.target.value as FiverrWithdrawalMethod)}
          >
            {FIVERR_WITHDRAWAL_METHODS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.flatFee === 0 ? "no extra fee" : `~$${m.flatFee.toFixed(2)}`})
              </option>
            ))}
          </select>
        </label>
      </div>

      <ResultCard
        title="Earnings breakdown"
        rows={[
          { label: "Order total", value: money(result.orderTotal) },
          { label: "Fiverr seller fee (20%)", value: `-${money(result.sellerFee)}`, negative: true },
          { label: "Withdrawal fee (approx.)", value: `-${money(result.withdrawalFee)}`, negative: true },
          { label: "You keep", value: money(result.netEarnings), emphasis: true },
          { label: "Buyer paid (incl. 5.5% service fee)", value: money(result.buyerPaid) },
        ]}
      />
    </div>
  );
}
