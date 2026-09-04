"use client";

import { useSolarStore } from "@/store/useSolarStore";
import { fmt } from "@/lib/solar/units";
import { STATUS_CLASS } from "./ui/layout";
import { statusOf } from "@/lib/solar/types";

/** Верхняя панель со светофором — всегда на виду. */
export default function SummaryBar() {
  const results = useSolarStore((s) => s.results);
  const computing = useSolarStore((s) => s.computing);
  const lastMs = useSolarStore((s) => s.lastComputeMs);

  const status = statusOf(results.maxUtilization);
  const g = results.governing;
  const errors = results.warnings.filter((w) => w.severity === "error").length;
  const maxDeflection = results.deflections.reduce((a, d) => Math.max(a, d.utilization), 0);

  return (
    <div
      className={`sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-2 rounded border px-3 py-2 ${
        results.passes
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
          : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-3 w-3 rounded-full ${
            results.passes ? "bg-emerald-500" : status === "yellow" ? "bg-amber-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {results.passes ? "ПРОХОДИТ" : "НЕ ПРОХОДИТ"}
        </span>
      </div>

      <div className="text-xs">
        <span className="text-zinc-500">Максимальный коэффициент использования: </span>
        <span className={`rounded px-1.5 py-0.5 font-mono font-bold ${STATUS_CLASS[status]}`}>
          K = {fmt(results.maxUtilization)}
        </span>
      </div>

      {g ? (
        <div className="text-xs text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500">Определяет: </span>
          <span className="font-medium">
            {g.member}, {g.check.toLowerCase()}, K = {fmt(g.utilization)}
          </span>
        </div>
      ) : null}

      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        <span className="text-zinc-500">Прогибы: </span>
        <span className="font-mono">K = {fmt(maxDeflection)}</span>
      </div>

      {errors > 0 ? (
        <div className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/50 dark:text-red-200">
          Ошибок в исходных данных: {errors}
        </div>
      ) : null}

      <div className="ml-auto font-mono text-[10px] text-zinc-400">
        {computing ? "пересчёт…" : lastMs > 0 ? `расчёт ${Math.round(lastMs)} мс` : ""}
      </div>
    </div>
  );
}
