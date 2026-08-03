import Link from "next/link";
import type { ReactNode } from "react";
import AdSlot from "./AdSlot";

export interface RelatedTool {
  href: string;
  label: string;
}

export interface Faq {
  q: string;
  a: string;
}

interface ToolPageShellProps {
  title: string;
  subtitle: string;
  calculator: ReactNode;
  howItWorks: ReactNode;
  faqs: Faq[];
  relatedTools: RelatedTool[];
  sourceNote: string;
}

export default function ToolPageShell({
  title,
  subtitle,
  calculator,
  howItWorks,
  faqs,
  relatedTools,
  sourceNote,
}: ToolPageShellProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h1>
      <p className="mt-2 text-zinc-500">{subtitle}</p>

      <div className="mt-6">{calculator}</div>

      <AdSlot label="in-content" />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">How it works</h2>
        <div className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">{howItWorks}</div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">FAQ</h2>
        <div className="mt-2 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{faq.q}</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        Fee rates change over time and can vary by account, region, and category. {sourceNote} Always confirm
        current rates on the platform&apos;s official fees page before making business decisions.
      </p>

      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Related calculators</h2>
        <ul className="mt-2 flex flex-wrap gap-3">
          {relatedTools.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="text-sm text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
              >
                {tool.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
