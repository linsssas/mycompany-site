"use client";

import { useMemo, useState } from "react";
import Field from "@/components/tools/Field";
import ResultCard from "@/components/tools/ResultCard";
import { calculateUpworkEarnings } from "@/lib/sellerFees/upwork";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function UpworkCalculator() {
  const [contractEarnings, setContractEarnings] = useState(1000);
  const [feeRatePercent, setFeeRatePercent] = useState(10);
  const [withdrawalFee, setWithdrawalFee] = useState(0.99);

  const result = useMemo(
    () => calculateUpworkEarnings({ contractEarnings, feeRatePercent, withdrawalFee }),
    [contractEarnings, feeRatePercent, withdrawalFee],
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field label="Contract earnings" value={contractEarnings} onChange={setContractEarnings} prefix="$" />
        <Field
          label="Upwork service fee rate for this contract"
          value={feeRatePercent}
          onChange={setFeeRatePercent}
          min={0}
          max={20}
          step={0.5}
          suffix="%"
        />
        <Field label="Withdrawal fee" value={withdrawalFee} onChange={setWithdrawalFee} prefix="$" />
      </div>

      <ResultCard
        title="Payout breakdown"
        rows={[
          { label: "Contract earnings", value: money(contractEarnings) },
          { label: `Upwork service fee (${feeRatePercent}%)`, value: `-${money(result.serviceFee)}`, negative: true },
          { label: "Withdrawal fee", value: `-${money(withdrawalFee)}`, negative: true },
          { label: "You keep", value: money(result.netEarnings), emphasis: true },
        ]}
      />
    </div>
  );
}
