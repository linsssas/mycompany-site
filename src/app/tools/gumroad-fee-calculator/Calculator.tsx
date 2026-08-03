"use client";

import { useMemo, useState } from "react";
import Field from "@/components/tools/Field";
import ToggleField from "@/components/tools/ToggleField";
import ResultCard from "@/components/tools/ResultCard";
import { calculateGumroadPayout } from "@/lib/sellerFees/gumroad";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function GumroadCalculator() {
  const [price, setPrice] = useState(20);
  const [quantity, setQuantity] = useState(10);
  const [viaDiscover, setViaDiscover] = useState(false);

  const result = useMemo(
    () => calculateGumroadPayout({ price, quantity, viaDiscover }),
    [price, quantity, viaDiscover],
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field label="Product price" value={price} onChange={setPrice} prefix="$" />
        <Field label="Number of sales" value={quantity} onChange={setQuantity} step={1} min={1} />
        <ToggleField
          label="Sale came from Gumroad Discover"
          hint="Discover marketplace sales pay a 30% platform fee instead of 10% + $0.50"
          checked={viaDiscover}
          onChange={setViaDiscover}
        />
      </div>

      <ResultCard
        title="Payout breakdown"
        rows={[
          { label: "Gross revenue", value: money(result.grossRevenue) },
          {
            label: viaDiscover ? "Gumroad fee (30%)" : "Gumroad fee (10% + $0.50)",
            value: `-${money(result.gumroadFee)}`,
            negative: true,
          },
          { label: "Card processing (2.9% + $0.30)", value: `-${money(result.processingFee)}`, negative: true },
          { label: "Net payout", value: money(result.netPayout), emphasis: true },
          { label: "Net per sale", value: money(result.netPerSale) },
        ]}
      />
    </div>
  );
}
