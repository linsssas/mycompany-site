"use client";

import { useState } from "react";
import { StatusColor } from "@/lib/solar/types";

/** Свёртываемая секция панели ввода. */
export function Section({
  title,
  subtitle,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
          {subtitle ? <span className="ml-2 text-xs text-zinc-500">{subtitle}</span> : null}
        </span>
        <span className="flex items-center gap-2">
          {badge ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {badge}
            </span>
          ) : null}
          <span className="text-zinc-400">{open ? "−" : "+"}</span>
        </span>
      </button>
      {open ? <div className="space-y-3 border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">{children}</div> : null}
    </section>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

export const STATUS_CLASS: Record<StatusColor, string> = {
  green: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  yellow: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  red: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

export function StatusBadge({ status, children }: { status: StatusColor; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${STATUS_CLASS[status]}`}>
      {children}
    </span>
  );
}

/** Таблица инженерного вида: моноширинные числа, плотные строки. */
export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-xs ${className}`}>{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-zinc-300 px-2 py-1.5 text-left font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  mono = false,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  mono?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-zinc-100 px-2 py-1 align-top text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 ${
        mono ? "font-mono" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function Card({
  title,
  children,
  right,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          {right}
        </header>
      ) : null}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function Note({ kind = "info", children }: { kind?: "info" | "warning" | "error"; children: React.ReactNode }) {
  const cls =
    kind === "error"
      ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
      : kind === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
        : "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300";
  return <div className={`rounded border px-3 py-2 text-xs leading-relaxed ${cls}`}>{children}</div>;
}
