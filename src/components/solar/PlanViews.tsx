"use client";

import { useSolarStore } from "@/store/useSolarStore";
import { Card } from "./ui/layout";
import { fmt } from "@/lib/solar/units";

/** Схематичные план и вид сбоку с ключевыми размерами. */
export default function PlanViews() {
  const results = useSolarStore((s) => s.results);
  const g = results.project.geometry;
  const geom = results.geom;

  // ---- План (вид сверху): длина стола × горизонтальная проекция ската ----
  const planW = geom.tableLength;
  const planD = geom.panelFieldSlope * Math.cos(geom.alphaRad);
  const pad = 900;
  const pw = planW + pad * 2;
  const ph = planD + pad * 2;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="План (вид сверху)">
        <svg viewBox={`0 0 ${pw} ${ph}`} className="w-full text-zinc-700 dark:text-zinc-300" style={{ maxHeight: "40vh" }}>
          {/* Панельное поле */}
          <rect x={pad} y={pad} width={geom.panelFieldLength} height={planD} fill="#2563eb" fillOpacity={0.12} stroke="#2563eb" strokeWidth={14} />
          {/* Панели */}
          {Array.from({ length: geom.panelsPerRow }).map((_, i) => {
            const pwid = g.panelOrientation === "portrait" ? results.project.panel.width : results.project.panel.length;
            const x = pad + i * (pwid + g.panelGap);
            return <rect key={i} x={x} y={pad} width={pwid} height={planD} fill="none" stroke="#2563eb" strokeWidth={6} opacity={0.5} />;
          })}
          {/* Рамы */}
          {Array.from({ length: g.frameCount }).map((_, i) => {
            const x = pad - g.edgeOverhang + i * g.framePitch + g.edgeOverhang;
            return <line key={i} x1={x} y1={pad - 250} x2={x} y2={pad + planD + 250} stroke="currentColor" strokeWidth={16} />;
          })}
          {/* Прогоны */}
          {geom.purlins.map((p, i) => {
            const y = pad + (p.s - geom.panelOffset) * Math.cos(geom.alphaRad);
            return <line key={i} x1={pad - g.edgeOverhang} y1={y} x2={pad - g.edgeOverhang + geom.tableLength} y2={y} stroke="#059669" strokeWidth={12} strokeDasharray="120 80" />;
          })}
          {/* Размер длины */}
          <line x1={pad - g.edgeOverhang} y1={pad + planD + 600} x2={pad - g.edgeOverhang + geom.tableLength} y2={pad + planD + 600} stroke="#71717a" strokeWidth={8} markerStart="url(#dim)" markerEnd="url(#dim)" />
          <text x={pad + geom.tableLength / 2} y={pad + planD + 540} fontSize={220} fill="#71717a" textAnchor="middle">
            {fmt(geom.tableLength)} мм
          </text>
        </svg>
        <div className="mt-1 font-mono text-[11px] text-zinc-500">
          {g.frameCount} рам с шагом {fmt(g.framePitch)} мм · {geom.panelsPerRow} панелей в ряду · {geom.purlins.length} линии прогонов
        </div>
      </Card>

      <Card title="Вид сбоку (торец стола)">
        <svg viewBox={`0 0 ${geom.postSpacing + 2400} ${geom.rearTopHeight + geom.embedDepth + 1600}`} className="w-full text-zinc-700 dark:text-zinc-300" style={{ maxHeight: "40vh" }}>
          {(() => {
            const H = geom.rearTopHeight + geom.embedDepth + 1600;
            const X = (x: number) => x + 1200;
            const Y = (y: number) => H - 800 - (y + geom.embedDepth);
            return (
              <>
                <line x1={0} y1={Y(0)} x2={geom.postSpacing + 2400} y2={Y(0)} stroke="currentColor" strokeWidth={14} />
                <line x1={X(0)} y1={Y(-geom.embedDepth)} x2={X(0)} y2={Y(geom.rearTopHeight)} stroke="currentColor" strokeWidth={34} />
                <line x1={X(geom.postSpacing)} y1={Y(-geom.embedDepth)} x2={X(geom.postSpacing)} y2={Y(geom.frontTopHeight)} stroke="currentColor" strokeWidth={34} />
                <line x1={X(geom.beamLowerTip.x)} y1={Y(geom.beamLowerTip.y)} x2={X(geom.beamUpperTip.x)} y2={Y(geom.beamUpperTip.y)} stroke="currentColor" strokeWidth={26} />
                {geom.brace.enabled ? (
                  <line x1={X(geom.brace.from.x)} y1={Y(geom.brace.from.y)} x2={X(geom.brace.to.x)} y2={Y(geom.brace.to.y)} stroke="currentColor" strokeWidth={20} />
                ) : null}
                <text x={X(geom.postSpacing / 2)} y={Y(geom.rearTopHeight) - 150} fontSize={200} fill="#71717a" textAnchor="middle">
                  α = {fmt(geom.alphaDeg)}°
                </text>
              </>
            );
          })()}
        </svg>
        <div className="mt-1 font-mono text-[11px] text-zinc-500">
          Высоты стоек {fmt(geom.rearTopHeight)} / {fmt(geom.frontTopHeight)} мм · разнос {fmt(geom.postSpacing)} мм
        </div>
      </Card>
    </div>
  );
}
