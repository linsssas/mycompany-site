"use client";

import { useMemo, useState } from "react";
import Field from "@/components/tools/Field";
import ResultCard from "@/components/tools/ResultCard";
import { calculateYoutubeRevenue } from "@/lib/sellerFees/youtube";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function YoutubeCalculator() {
  const [monthlyViews, setMonthlyViews] = useState(100000);
  const [cpm, setCpm] = useState(6);
  const [monetizedViewPercent, setMonetizedViewPercent] = useState(60);

  const result = useMemo(
    () => calculateYoutubeRevenue({ monthlyViews, cpm, monetizedViewPercent }),
    [monthlyViews, cpm, monetizedViewPercent],
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field label="Monthly views (long-form)" value={monthlyViews} onChange={setMonthlyViews} step={1000} />
        <Field label="Average CPM" value={cpm} onChange={setCpm} prefix="$" />
        <Field
          label="Monetized view rate"
          value={monetizedViewPercent}
          onChange={setMonetizedViewPercent}
          min={0}
          max={100}
          step={1}
          suffix="%"
        />
      </div>

      <ResultCard
        title="Estimated monthly revenue"
        rows={[
          { label: "Estimated ad revenue", value: money(result.estimatedAdRevenue) },
          { label: "YouTube's share (45%)", value: `-${money(result.youtubeShare)}`, negative: true },
          { label: "Your estimated payout (55%)", value: money(result.creatorShare), emphasis: true },
        ]}
      />
    </div>
  );
}
