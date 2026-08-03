import type { Metadata } from "next";
import ToolPageShell from "@/components/tools/ToolPageShell";
import YoutubeCalculator from "./Calculator";

export const metadata: Metadata = {
  title: "YouTube Ad Revenue Calculator — Estimate Your Earnings",
  description: "Estimate your monthly YouTube long-form ad revenue from views and CPM using the 55% creator share.",
};

export default function YoutubeMoneyCalculatorPage() {
  return (
    <ToolPageShell
      title="YouTube Ad Revenue Estimator"
      subtitle="Estimate what you'd earn from long-form ad revenue at your views and CPM."
      calculator={<YoutubeCalculator />}
      sourceNote="Uses YouTube Partner Program's published 55% creator / 45% YouTube ad revenue split for long-form video."
      howItWorks={
        <>
          <p>
            YouTube pays creators 55% of ad revenue generated on their long-form videos. Not every view is
            monetized (some viewers use ad blockers, skip pre-roll, or watch un-monetized content), so this
            estimator lets you set a monetized view rate to reflect that.
          </p>
          <p>
            CPM (cost per 1,000 monetized views) varies enormously by niche, audience country, and season —
            typical ranges run roughly $2–$12, but yours may be outside that range. This is an estimate, not
            a guarantee.
          </p>
          <p>
            YouTube Shorts revenue is calculated differently — from a shared ad pool rather than a direct CPM
            per Short — so this tool focuses on long-form video.
          </p>
        </>
      }
      faqs={[
        {
          q: "Does this include Shorts revenue?",
          a: "No. Shorts monetization uses a separate revenue-pool model rather than a simple CPM formula, so it isn't included in this estimate.",
        },
        {
          q: "Why is my real payout different from the estimate?",
          a: "Actual payouts depend on your real CPM, ad formats, audience geography, seasonality, and YouTube's own reporting — treat this as a ballpark, not an invoice.",
        },
      ]}
      relatedTools={[
        { href: "/tools/gumroad-fee-calculator", label: "Gumroad Payout Calculator" },
        { href: "/tools", label: "All calculators" },
      ]}
    />
  );
}
