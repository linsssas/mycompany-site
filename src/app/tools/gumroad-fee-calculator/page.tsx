import type { Metadata } from "next";
import ToolPageShell from "@/components/tools/ToolPageShell";
import GumroadCalculator from "./Calculator";

export const metadata: Metadata = {
  title: "Gumroad Fee Calculator — Net Payout Per Sale",
  description: "Calculate your Gumroad net payout after the 10% platform fee (30% via Discover) and card processing.",
};

export default function GumroadFeeCalculatorPage() {
  return (
    <ToolPageShell
      title="Gumroad Payout Calculator"
      subtitle="Direct-link sales pay 10% + $0.50. Discover marketplace sales pay 30%. See your real net."
      calculator={<GumroadCalculator />}
      sourceNote="Based on Gumroad's published 10% direct-sale fee, 30% Discover fee, and 2.9% + $0.30 card processing as of 2026."
      howItWorks={
        <>
          <p>
            Gumroad charges 10% plus a flat $0.50 on sales that come through your own link, site, or social
            media. Sales made via Gumroad&apos;s Discover marketplace instead pay a 30% platform fee.
          </p>
          <p>
            On top of the platform fee, standard card processing (2.9% + $0.30) applies to every transaction.
            Gumroad acts as merchant of record and handles sales tax/VAT collection itself.
          </p>
        </>
      }
      faqs={[
        {
          q: "Is there a monthly Gumroad subscription fee?",
          a: "No — Gumroad has no monthly fee or tiered plans. You only pay per sale.",
        },
        {
          q: "Why is Discover so much more expensive?",
          a: "Discover sales come from Gumroad's own marketplace traffic rather than your audience, so Gumroad takes a larger cut (30% vs 10%) in exchange for the extra exposure.",
        },
      ]}
      relatedTools={[
        { href: "/tools/etsy-fee-calculator", label: "Etsy Fee & Profit Calculator" },
        { href: "/tools", label: "All calculators" },
      ]}
    />
  );
}
