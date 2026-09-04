"use client";

import { useMemo, useState } from "react";
import { useSolarStore } from "@/store/useSolarStore";
import { Card } from "./ui/layout";
import { combineDiagrams, DIAGRAM_ROLES, ROLE_TITLES } from "@/lib/solar/diagrams";
import { fmt, nmmToKNm, nToKN } from "@/lib/solar/units";

type Quantity = "M" | "V" | "N";

const QUANTITY_LABEL: Record<Quantity, string> = {
  M: "Изгибающий момент M, кН·м",
  V: "Поперечная сила Q, кН",
  N: "Продольная сила N, кН (растяжение +)",
};

/** Эпюры M, N, Q по раме. Наведение на точку показывает значение. */
export default function Diagrams() {
  const results = useSolarStore((s) => s.results);
  const [quantity, setQuantity] = useState<Quantity>("M");
  const [variant, setVariant] = useState<"typical" | "edge">("typical");
  const governingCombo = results.governing?.combo ?? results.combos[0]?.label ?? "";
  const [comboLabel, setComboLabel] = useState<string>("");
  const activeLabel = comboLabel || governingCombo;

  const combo = results.combos.find((c) => c.label === activeLabel) ?? results.combos[0];
  const model = results.frame.model;

  const diagrams = useMemo(
    () => (combo ? combineDiagrams(results.cases, combo, model, variant) : []),
    [results.cases, combo, model, variant]
  );

  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  if (!combo || diagrams.length === 0) return null;

  const nodes = model.nodes;
  const pad = 900;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const w = maxX - minX;
  const h = maxY - minY;
  const X = (x: number) => x - minX;
  const Y = (y: number) => maxY - y;

  const shown = diagrams.filter((d) => DIAGRAM_ROLES.has(d.role));
  // Максимальные усилия сводятся по элементам одной роли
  const aggregated = Object.values(
    shown.reduce<Record<string, { role: string; maxM: number; maxV: number; maxN: number }>>((acc, d) => {
      const cur = acc[d.role] ?? { role: d.role, maxM: 0, maxV: 0, maxN: 0 };
      cur.maxM = Math.max(cur.maxM, d.maxM);
      cur.maxV = Math.max(cur.maxV, d.maxV);
      cur.maxN = Math.max(cur.maxN, d.maxN);
      acc[d.role] = cur;
      return acc;
    }, {})
  );
  const peak = Math.max(
    ...shown.map((d) => (quantity === "M" ? d.maxM : quantity === "V" ? d.maxV : d.maxN)),
    1e-9
  );
  // Масштаб эпюры: пик занимает ~12 % высоты чертежа
  const scale = (0.12 * h) / peak;

  const value = (s: { N: number; V: number; M: number }) =>
    quantity === "M" ? s.M : quantity === "V" ? s.V : s.N;
  const format = (v: number) => (quantity === "M" ? `${fmt(nmmToKNm(v))} кН·м` : `${fmt(nToKN(v))} кН`);

  return (
    <Card
      title="Эпюры усилий"
      right={
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-700">
            {(["M", "V", "N"] as Quantity[]).map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                className={`px-2 py-0.5 font-mono ${
                  quantity === q ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {q === "V" ? "Q" : q}
              </button>
            ))}
          </div>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as "typical" | "edge")}
            className="rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="typical">рядовая рама</option>
            <option value="edge">крайняя рама</option>
          </select>
        </div>
      }
    >
      <select
        value={activeLabel}
        onChange={(e) => setComboLabel(e.target.value)}
        className="mb-2 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        {results.combos.map((c) => (
          <option key={c.key} value={c.label}>
            {c.label}
            {c.label === governingCombo ? "  ← определяющее" : ""}
          </option>
        ))}
      </select>

      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-zinc-400" style={{ maxHeight: "60vh" }}>
          {/* Схема */}
          {model.elements.map((el, i) => (
            <line
              key={i}
              x1={X(nodes[el.i].x)}
              y1={Y(nodes[el.i].y)}
              x2={X(nodes[el.j].x)}
              y2={Y(nodes[el.j].y)}
              stroke="currentColor"
              strokeWidth={DIAGRAM_ROLES.has(el.role ?? "") ? 34 : 8}
              opacity={DIAGRAM_ROLES.has(el.role ?? "") ? 0.9 : 0.3}
            />
          ))}
          <line x1={0} y1={Y(0)} x2={w} y2={Y(0)} stroke="currentColor" strokeWidth={8} strokeDasharray="60 40" opacity={0.5} />

          {/* Эпюры */}
          {shown.map((d) => {
            const el = model.elements[d.element];
            const a = nodes[el.i];
            const b = nodes[el.j];
            const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const ux = (b.x - a.x) / L;
            const uy = (b.y - a.y) / L;
            // Нормаль к оси элемента
            const nx = -uy;
            const ny = ux;
            const pts = d.stations.map((s) => {
              const v = value(s) * scale;
              const px = a.x + ux * s.x + nx * v;
              const py = a.y + uy * s.x + ny * v;
              return { px, py, s };
            });
            const path = [
              `M${X(a.x)},${Y(a.y)}`,
              ...pts.map((p) => `L${X(p.px)},${Y(p.py)}`),
              `L${X(b.x)},${Y(b.y)}`,
              "Z",
            ].join(" ");
            return (
              <g key={d.element}>
                <path d={path} fill="#2563eb" fillOpacity={0.18} stroke="#2563eb" strokeWidth={10} />
                {pts.map((p, i) =>
                  i % 4 === 0 ? (
                    <circle
                      key={i}
                      cx={X(p.px)}
                      cy={Y(p.py)}
                      r={26}
                      fill="transparent"
                      onMouseEnter={() =>
                        setHover({
                          x: X(p.px) / w,
                          y: Y(p.py) / h,
                          text: `${format(value(p.s))} · ${fmt(p.s.x)} мм от начала элемента`,
                        })
                      }
                      onMouseLeave={() => setHover(null)}
                      className="cursor-crosshair"
                    />
                  ) : null
                )}
              </g>
            );
          })}
        </svg>
        {hover ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded bg-zinc-900 px-2 py-1 font-mono text-[11px] text-white shadow-lg"
            style={{ left: `${hover.x * 100}%`, top: `${hover.y * 100}%` }}
          >
            {hover.text}
          </div>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-zinc-500">{QUANTITY_LABEL[quantity]} · наведите курсор на эпюру для значения</p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th className="px-2 py-1 text-left font-semibold">Элемент</th>
              <th className="px-2 py-1 text-right font-semibold">max |M|, кН·м</th>
              <th className="px-2 py-1 text-right font-semibold">max |Q|, кН</th>
              <th className="px-2 py-1 text-right font-semibold">max |N|, кН</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.map((d) => (
              <tr key={d.role} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-2 py-1">{ROLE_TITLES[d.role] ?? d.role}</td>
                <td className="px-2 py-1 text-right font-mono">{fmt(nmmToKNm(d.maxM))}</td>
                <td className="px-2 py-1 text-right font-mono">{fmt(nToKN(d.maxV))}</td>
                <td className="px-2 py-1 text-right font-mono">{fmt(nToKN(d.maxN))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
