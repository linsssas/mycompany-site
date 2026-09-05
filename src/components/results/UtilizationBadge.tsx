import { UtilizationColor } from "@/lib/calc/memberChecks";

const COLOR_MAP: Record<UtilizationColor, string> = {
  green: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  yellow: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  red: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
};
const DOT: Record<UtilizationColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export default function UtilizationBadge({ ratio, color }: { ratio: number; color: UtilizationColor }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-xs font-semibold ${COLOR_MAP[color]}`}
    >
      <span className={`h-1.5 w-1.5 ${DOT[color]}`} />
      {(ratio * 100).toFixed(0)}%
    </span>
  );
}
