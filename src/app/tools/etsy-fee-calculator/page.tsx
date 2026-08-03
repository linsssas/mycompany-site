import type { Metadata } from "next";
import ToolPageShell from "@/components/tools/ToolPageShell";
import EtsyCalculator from "./Calculator";

export const metadata: Metadata = {
  title: "Etsy Fee & Profit Calculator (2026 rates)",
  description:
    "Calculate your real Etsy profit after listing fees, the 6.5% transaction fee, payment processing and Offsite Ads.",
};

export default function EtsyFeeCalculatorPage() {
  return (
    <ToolPageShell
      title="Etsy Fee & Profit Calculator"
      subtitle="See exactly what Etsy takes and what you keep, per sale."
      calculator={<EtsyCalculator />}
      sourceNote="Rates shown reflect Etsy's published US/UK/EU fee schedule as of 2026."
      howItWorks={
        <>
          <p>
            Etsy charges a $0.20 listing fee per item, a 6.5% transaction fee on the item price plus
            shipping, and a payment processing fee that varies by region (3%–4% plus a small flat fee).
          </p>
          <p>
            If a sale comes through Etsy&apos;s Offsite Ads program, an additional 12–15% advertising fee
            applies — 12% if you sold $10,000 or more in the trailing 12 months, otherwise 15%.
          </p>
        </>
      }
      faqs={[
        {
          q: "Does Etsy charge the transaction fee on shipping too?",
          a: "Yes. The 6.5% transaction fee applies to the item price, shipping, and any gift wrapping charged to the buyer.",
        },
        {
          q: "Can I opt out of Offsite Ads fees?",
          a: "Sellers under $10,000 in annual sales can opt out. Above that threshold, participation is mandatory, but the fee only applies when a sale is attributed to an Offsite Ads click.",
        },
        {
          q: "Is Etsy Ads spend the same as the transaction fee?",
          a: "No. Etsy Ads (on-site promoted listings) is a separate, optional pay-per-click budget you set yourself — it's not a percentage fee.",
        },
      ]}
      relatedTools={[
        { href: "/tools/gumroad-fee-calculator", label: "Gumroad Payout Calculator" },
        { href: "/tools", label: "All calculators" },
      ]}
    />
  );
}
