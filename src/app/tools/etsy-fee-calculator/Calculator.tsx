"use client";

import { useMemo, useState } from "react";
import Field from "@/components/tools/Field";
import ToggleField from "@/components/tools/ToggleField";
import ResultCard from "@/components/tools/ResultCard";
import { calculateEtsyFees, type EtsyRegion } from "@/lib/sellerFees/etsy";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function EtsyCalculator() {
  const [itemPrice, setItemPrice] = useState(25);
  const [shipping, setShipping] = useState(5);
  const [quantity, setQuantity] = useState(1);
  const [costOfGoods, setCostOfGoods] = useState(8);
  const [region, setRegion] = useState<EtsyRegion>("US");
  const [etsyAdsSpend, setEtsyAdsSpend] = useState(0);
  const [offsiteAdsFee, setOffsiteAdsFee] = useState(false);
  const [highVolumeSeller, setHighVolumeSeller] = useState(false);

  const result = useMemo(
    () =>
      calculateEtsyFees({
        itemPrice,
        shipping,
        quantity,
        costOfGoods,
        region,
        etsyAdsSpend,
        offsiteAdsFee,
        highVolumeSeller,
      }),
    [itemPrice, shipping, quantity, costOfGoods, region, etsyAdsSpend, offsiteAdsFee, highVolumeSeller],
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field label="Item price" value={itemPrice} onChange={setItemPrice} prefix="$" />
        <Field label="Shipping charged to buyer" value={shipping} onChange={setShipping} prefix="$" />
        <Field label="Quantity" value={quantity} onChange={setQuantity} step={1} min={1} />
        <Field label="Your cost of goods (per item)" value={costOfGoods} onChange={setCostOfGoods} prefix="$" />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Payment processing region
          </span>
          <select
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={region}
            onChange={(e) => setRegion(e.target.value as EtsyRegion)}
          >
            <option value="US">United States (3% + $0.25)</option>
            <option value="UK">United Kingdom (4% + £0.20)</option>
            <option value="EU">EU (4% + €0.30)</option>
          </select>
        </label>

        <Field
          label="Etsy Ads spend (optional)"
          value={etsyAdsSpend}
          onChange={setEtsyAdsSpend}
          prefix="$"
        />

        <ToggleField
          label="Sale came from Offsite Ads"
          hint="12% if you sold $10,000+ in the last 12 months, otherwise 15%"
          checked={offsiteAdsFee}
          onChange={setOffsiteAdsFee}
        />
        {offsiteAdsFee && (
          <ToggleField
            label="I sold $10,000+ in the last 12 months"
            hint="Qualifies you for the reduced 12% Offsite Ads rate instead of 15%"
            checked={highVolumeSeller}
            onChange={setHighVolumeSeller}
          />
        )}
      </div>

      <ResultCard
        title="Profit breakdown"
        rows={[
          { label: "Gross sale", value: money(result.grossSale) },
          { label: "Listing fee", value: `-${money(result.listingFee)}`, negative: true },
          { label: "Transaction fee (6.5%)", value: `-${money(result.transactionFee)}`, negative: true },
          { label: "Payment processing", value: `-${money(result.processingFee)}`, negative: true },
          ...(result.offsiteAdsFee > 0
            ? [{ label: "Offsite Ads fee", value: `-${money(result.offsiteAdsFee)}`, negative: true }]
            : []),
          ...(result.etsyAdsSpend > 0
            ? [{ label: "Etsy Ads spend", value: `-${money(result.etsyAdsSpend)}`, negative: true }]
            : []),
          { label: "Cost of goods", value: `-${money(costOfGoods * quantity)}`, negative: true },
          { label: "Net profit", value: money(result.netProfit), emphasis: true },
          { label: "Margin", value: `${result.marginPercent.toFixed(1)}%` },
        ]}
      />
    </div>
  );
}
