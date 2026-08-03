import Link from "next/link";

const TOOLS = [
  {
    href: "/tools/etsy-fee-calculator",
    title: "Etsy Fee & Profit Calculator",
    description: "Listing, transaction, payment processing and Offsite Ads fees — see your real profit per sale.",
  },
  {
    href: "/tools/fiverr-fee-calculator",
    title: "Fiverr Earnings Calculator",
    description: "20% seller fee, buyer service fee and withdrawal costs, broken down per order.",
  },
  {
    href: "/tools/upwork-fee-calculator",
    title: "Upwork Fee Calculator",
    description: "See your net payout after Upwork's per-contract service fee and withdrawal costs.",
  },
  {
    href: "/tools/gumroad-fee-calculator",
    title: "Gumroad Payout Calculator",
    description: "Direct-link vs Discover fees, plus card processing — know what actually lands in your account.",
  },
  {
    href: "/tools/youtube-money-calculator",
    title: "YouTube Ad Revenue Estimator",
    description: "Estimate long-form ad revenue from views and CPM using YouTube's 55% creator share.",
  },
];

export default function ToolsHub() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Know exactly what you take home
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-500">
        Free calculators that turn confusing marketplace and creator platform fee structures into a clear
        number: what you actually keep. No sign-up required.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-lg border border-zinc-200 p-5 transition hover:border-indigo-400 hover:shadow-sm dark:border-zinc-800"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{tool.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
