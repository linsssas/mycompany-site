import type { Metadata } from "next";
import ToolPageShell from "@/components/tools/ToolPageShell";
import UpworkCalculator from "./Calculator";

export const metadata: Metadata = {
  title: "Upwork Fee Calculator — Real Take-Home Pay",
  description: "Calculate your net Upwork payout after the per-contract service fee (0–15%) and withdrawal costs.",
};

export default function UpworkFeeCalculatorPage() {
  return (
    <ToolPageShell
      title="Upwork Freelancer Fee Calculator"
      subtitle="Upwork sets a service fee per contract, not a fixed tier. Plug in your rate to see your real payout."
      calculator={<UpworkCalculator />}
      sourceNote="Reflects Upwork's variable 0–15% per-contract service fee introduced May 2025, replacing the old 20/10/5% tiers."
      howItWorks={
        <>
          <p>
            Since May 2025, Upwork no longer uses the old 20% / 10% / 5% lifetime-billings tiers. Instead,
            each contract shows its own service fee — typically between 0% and 15%, disclosed before you
            accept the contract.
          </p>
          <p>
            Enter the fee rate shown on your specific contract, plus your usual withdrawal method&apos;s fee,
            to see your actual take-home pay.
          </p>
        </>
      }
      faqs={[
        {
          q: "Why does my fee rate differ from another freelancer's?",
          a: "Upwork sets the rate per contract based on factors like project type and client relationship, so two freelancers can see different rates for similar work.",
        },
        {
          q: "Is the old 20% first-$500 tier still used?",
          a: "No — that tiered structure was replaced. Always check the fee shown on the specific contract before accepting.",
        },
      ]}
      relatedTools={[
        { href: "/tools/fiverr-fee-calculator", label: "Fiverr Earnings Calculator" },
        { href: "/tools", label: "All calculators" },
      ]}
    />
  );
}
