import { UtilizationColor } from "@/lib/calc/memberChecks";

const COLOR_MAP: Record<UtilizationColor, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400",
  red: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400",
};
const DOT: Record<UtilizationColor, string> = { green: "🟢", yellow: "🟡", red: "🔴" };

export default function UtilizationBadge({ ratio, color }: { ratio: number; color: UtilizationColor }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_MAP[color]}`}>
      {DOT[color]} {(ratio * 100).toFixed(0)}%
    </span>
  );
}
