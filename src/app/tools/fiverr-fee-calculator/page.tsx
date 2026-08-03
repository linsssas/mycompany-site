import type { Metadata } from "next";
import ToolPageShell from "@/components/tools/ToolPageShell";
import FiverrCalculator from "./Calculator";

export const metadata: Metadata = {
  title: "Fiverr Fee Calculator — What You Actually Keep",
  description: "Calculate your Fiverr net earnings after the flat 20% seller fee and withdrawal costs.",
};

export default function FiverrFeeCalculatorPage() {
  return (
    <ToolPageShell
      title="Fiverr Earnings Calculator"
      subtitle="Fiverr takes a flat 20% of every order. See what's actually left."
      calculator={<FiverrCalculator />}
      sourceNote="Based on Fiverr's published flat 20% seller commission and 5.5% buyer service fee as of 2026."
      howItWorks={
        <>
          <p>
            Fiverr keeps 20% of every order (gig price, extras, and tips included) — there are no tiers or
            volume discounts for sellers. Buyers separately pay a 5.5% service fee plus a small-order charge
            under $100, which does not affect what the seller receives.
          </p>
          <p>
            Withdrawal fees depend on your payout method and are approximate — confirm the current amount in
            your Fiverr earnings settings.
          </p>
        </>
      }
      faqs={[
        {
          q: "Does the 20% fee ever go down with volume?",
          a: "No. Fiverr replaced tiered pricing with a flat 20% seller commission on every order, regardless of lifetime earnings with a buyer.",
        },
        {
          q: "Who pays the 5.5% service fee?",
          a: "The buyer, on top of the order price. It doesn't reduce the seller's payout.",
        },
      ]}
      relatedTools={[
        { href: "/tools/upwork-fee-calculator", label: "Upwork Fee Calculator" },
        { href: "/tools", label: "All calculators" },
      ]}
    />
  );
}
