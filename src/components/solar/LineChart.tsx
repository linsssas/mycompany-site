"use client";

import { useRef, useState } from "react";
import { fmt } from "@/lib/solar/units";

export interface ChartPoint {
  x: number;
  y: number;
}

interface Props {
  points: ChartPoint[];
  xLabel: string;
  yLabel: string;
  /** Горизонтальная отсечка (напр. K = 1) */
  threshold?: { value: number; label: string };
  /** Вертикальная отметка (напр. текущее значение параметра) */
  marker?: { value: number; label: string };
  height?: number;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
}

const PAD = { l: 46, r: 14, t: 10, b: 30 };

/**
 * Линейный график одной серии.
 * Цвет серии: #2563eb (светлая тема) / #3b82f6 (тёмная) — обе пары проверены
 * на контраст и различимость при нарушениях цветовосприятия.
 * Легенда не нужна: серия одна и названа в заголовке.
 */
export default function LineChart({
  points,
  xLabel,
  yLabel,
  threshold,
  marker,
  height = 180,
  formatX = (v) => fmt(v),
  formatY = (v) => fmt(v),
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 420;

  if (points.length === 0) {
    return <p className="py-6 text-center text-xs text-zinc-500">Нет данных</p>;
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMinRaw = Math.min(...ys, threshold ? threshold.value : Infinity, 0);
  const yMaxRaw = Math.max(...ys, threshold ? threshold.value : -Infinity);
  const span = yMaxRaw - yMinRaw || 1;
  const yMin = yMinRaw - span * 0.08;
  const yMax = yMaxRaw + span * 0.08;

  const px = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin || 1)) * (width - PAD.l - PAD.r);
  const py = (y: number) => height - PAD.b - ((y - yMin) / (yMax - yMin || 1)) * (height - PAD.t - PAD.b);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(2)},${py(p.y).toFixed(2)}`).join(" ");

  const xTicks = tickValues(xMin, xMax, 5);
  const yTicks = tickValues(yMin, yMax, 4);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(px(p.x) - rel);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${yLabel} в зависимости от ${xLabel}`}
      >
        {/* Сетка и оси — рецессивные */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.l} y1={py(t)} x2={width - PAD.r} y2={py(t)} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1} />
            <text x={PAD.l - 6} y={py(t) + 3} textAnchor="end" className="fill-zinc-500 text-[9px]">
              {formatY(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={px(t)} y={height - PAD.b + 12} textAnchor="middle" className="fill-zinc-500 text-[9px]">
            {formatX(t)}
          </text>
        ))}
        <line x1={PAD.l} y1={height - PAD.b} x2={width - PAD.r} y2={height - PAD.b} className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth={1} />

        {/* Отсечка */}
        {threshold ? (
          <>
            <line
              x1={PAD.l}
              y1={py(threshold.value)}
              x2={width - PAD.r}
              y2={py(threshold.value)}
              className="stroke-red-600 dark:stroke-red-500"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
            <text x={width - PAD.r} y={py(threshold.value) - 4} textAnchor="end" className="fill-red-700 text-[9px] dark:fill-red-400">
              {threshold.label}
            </text>
          </>
        ) : null}

        {/* Отметка текущего значения */}
        {marker && marker.value >= xMin && marker.value <= xMax ? (
          <>
            <line x1={px(marker.value)} y1={PAD.t} x2={px(marker.value)} y2={height - PAD.b} className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth={1} strokeDasharray="3 3" />
            <text x={px(marker.value) + 3} y={PAD.t + 8} className="fill-zinc-500 text-[9px]">
              {marker.label}
            </text>
          </>
        ) : null}

        {/* Серия: 2px линия */}
        <path d={path} fill="none" className="stroke-blue-600 dark:stroke-blue-500" strokeWidth={2} strokeLinejoin="round" />

        {/* Наведение: перекрестие и точка */}
        {hp ? (
          <>
            <line x1={px(hp.x)} y1={PAD.t} x2={px(hp.x)} y2={height - PAD.b} className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth={1} />
            <circle cx={px(hp.x)} cy={py(hp.y)} r={4.5} className="fill-blue-600 stroke-white dark:fill-blue-500 dark:stroke-zinc-900" strokeWidth={2} />
          </>
        ) : null}

        <text x={width - PAD.r} y={height - 2} textAnchor="end" className="fill-zinc-400 text-[9px]">
          {xLabel}
        </text>
      </svg>

      {hp ? (
        <div
          className="pointer-events-none absolute top-1 rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-white shadow"
          style={{ left: `${(px(hp.x) / width) * 100}%`, transform: "translateX(-50%)" }}
        >
          {formatX(hp.x)} → {formatY(hp.y)}
        </div>
      ) : null}
    </div>
  );
}

function tickValues(min: number, max: number, count: number): number[] {
  if (!isFinite(min) || !isFinite(max) || max <= min) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}
