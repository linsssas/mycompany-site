import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Sellculator — Know your real take-home pay",
    template: "%s | Sellculator",
  },
  description:
    "Free fee and profit calculators for Etsy, Fiverr, Upwork, Gumroad and YouTube sellers and creators.",
};

const NAV_LINKS = [
  { href: "/tools/etsy-fee-calculator", label: "Etsy" },
  { href: "/tools/fiverr-fee-calculator", label: "Fiverr" },
  { href: "/tools/upwork-fee-calculator", label: "Upwork" },
  { href: "/tools/gumroad-fee-calculator", label: "Gumroad" },
  { href: "/tools/youtube-money-calculator", label: "YouTube" },
];

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/tools" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Sell<span className="text-indigo-600">culator</span>
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-indigo-600">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        Sellculator — independent calculators, not affiliated with Etsy, Fiverr, Upwork, Gumroad or YouTube.
      </footer>
    </div>
  );
}
