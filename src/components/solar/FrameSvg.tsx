"use client";

import { useState } from "react";
import { useSolarStore } from "@/store/useSolarStore";
import { Card } from "./ui/layout";
import { fmt } from "@/lib/solar/units";
import { DerivedGeometry } from "@/lib/solar/geometry";

/** 2D-схема плоской рамы: строится по фактическим параметрам, с размерами и нагрузками. */
export default function FrameSvg() {
  const results = useSolarStore((s) => s.results);
  const [showLoads, setShowLoads] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [showPanels, setShowPanels] = useState(true);
  const geom = results.geom;

  const pad = 900;
  const minX = Math.min(geom.beamUpperTip.x, geom.beamLowerTip.x, 0) - pad;
  const maxX = Math.max(geom.beamLowerTip.x, geom.postSpacing, 0) + pad;
  const minY = -geom.embedDepth - pad * 0.6;
  const maxY = Math.max(geom.rearTopHeight, geom.upperEdgeHeight) + pad;
  const w = maxX - minX;
  const h = maxY - minY;

  // Преобразование: модель (y вверх) → SVG (y вниз)
  const X = (x: number) => x - minX;
  const Y = (y: number) => maxY - y;

  const slope = geom.slopeDir;
  const panelStart = { x: geom.beamLowerTip.x + slope.x * geom.panelOffset, y: geom.beamLowerTip.y + slope.y * geom.panelOffset };
  const panelEnd = {
    x: geom.beamLowerTip.x + slope.x * (geom.panelOffset + geom.panelFieldSlope),
    y: geom.beamLowerTip.y + slope.y * (geom.panelOffset + geom.panelFieldSlope),
  };
  // Внешняя нормаль к скату (вверх от плоскости панелей)
  const nOut = { x: slope.y, y: -slope.x };

  const stroke = "currentColor";

  return (
    <Card
      title="Расчётная схема рамы"
      right={
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          <Toggle label="панели" value={showPanels} onChange={setShowPanels} />
          <Toggle label="нагрузки" value={showLoads} onChange={setShowLoads} />
          <Toggle label="размеры" value={showDims} onChange={setShowDims} />
        </div>
      }
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full text-zinc-800 dark:text-zinc-200"
        style={{ maxHeight: "62vh" }}
        role="img"
        aria-label="Расчётная схема опорной рамы"
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
            <path d="M0,0 L10,4 L0,8 z" fill="currentColor" />
          </marker>
          <marker id="dim" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,4 L8,1 M0,4 L8,7" stroke="currentColor" strokeWidth="12" fill="none" />
          </marker>
          <pattern id="soil" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="120" stroke="currentColor" strokeWidth="8" opacity="0.25" />
          </pattern>
        </defs>

        {/* Грунт */}
        <rect x={0} y={Y(0)} width={w} height={maxY - minY - Y(0) > 0 ? h - Y(0) : 0} fill="url(#soil)" />
        <line x1={0} y1={Y(0)} x2={w} y2={Y(0)} stroke={stroke} strokeWidth={12} />

        {/* Панельное поле */}
        {showPanels ? (
          <>
            <line
              x1={X(panelStart.x) + nOut.x * 60}
              y1={Y(panelStart.y) - nOut.y * 60}
              x2={X(panelEnd.x) + nOut.x * 60}
              y2={Y(panelEnd.y) - nOut.y * 60}
              stroke="#2563eb"
              strokeWidth={40}
              strokeLinecap="round"
              opacity={0.85}
            />
            <text
              x={X(panelEnd.x) + nOut.x * 260}
              y={Y(panelEnd.y) - nOut.y * 260 - 120}
              fontSize={110}
              fill="#2563eb"
              textAnchor="start"
            >
              панели: {geom.panelRows} ряда, {fmt(geom.panelFieldSlope)} мм по скату
            </text>
          </>
        ) : null}

        {/* Балка */}
        <line x1={X(geom.beamLowerTip.x)} y1={Y(geom.beamLowerTip.y)} x2={X(geom.beamUpperTip.x)} y2={Y(geom.beamUpperTip.y)} stroke={stroke} strokeWidth={28} strokeLinecap="round" />

        {/* Стойки */}
        <line x1={X(0)} y1={Y(-geom.embedDepth)} x2={X(0)} y2={Y(geom.rearTopHeight)} stroke={stroke} strokeWidth={34} strokeLinecap="round" />
        <line x1={X(geom.postSpacing)} y1={Y(-geom.embedDepth)} x2={X(geom.postSpacing)} y2={Y(geom.frontTopHeight)} stroke={stroke} strokeWidth={34} strokeLinecap="round" />

        {/* Подпорка */}
        {geom.brace.enabled ? (
          <line x1={X(geom.brace.from.x)} y1={Y(geom.brace.from.y)} x2={X(geom.brace.to.x)} y2={Y(geom.brace.to.y)} stroke={stroke} strokeWidth={22} strokeDasharray="none" strokeLinecap="round" />
        ) : null}

        {/* Узлы прогонов */}
        {geom.purlins.map((p, i) => (
          <g key={i}>
            <circle cx={X(p.point.x)} cy={Y(p.point.y)} r={38} fill="#fff" stroke="#2563eb" strokeWidth={14} />
            <text x={X(p.point.x)} y={Y(p.point.y) - 70} fontSize={90} fill="#2563eb" textAnchor="middle">
              П{i + 1}
            </text>
          </g>
        ))}

        {/* Опоры */}
        <SupportSymbol x={X(0)} y={Y(-geom.embedDepth)} />
        <SupportSymbol x={X(geom.postSpacing)} y={Y(-geom.embedDepth)} />

        {/* Нагрузки */}
        {showLoads ? (
          <>
            {/* Снег — вертикальные стрелки вниз */}
            {Array.from({ length: 7 }).map((_, i) => {
              const t = geom.panelOffset + (geom.panelFieldSlope * (i + 0.5)) / 7;
              const px = geom.beamLowerTip.x + slope.x * t;
              const py = geom.beamLowerTip.y + slope.y * t;
              return (
                <line
                  key={`s${i}`}
                  x1={X(px)}
                  y1={Y(py) - 620}
                  x2={X(px)}
                  y2={Y(py) - 130}
                  stroke="#0891b2"
                  strokeWidth={14}
                  markerEnd="url(#arrow)"
                />
              );
            })}
            <text x={X(panelEnd.x)} y={Y(panelEnd.y) - 700} fontSize={110} fill="#0891b2" textAnchor="middle">
              снег {fmt(results.snow.s)} кПа
            </text>

            {/* Ветер — стрелки по нормали (отсос вверх) */}
            {Array.from({ length: 5 }).map((_, i) => {
              const t = geom.panelOffset + (geom.panelFieldSlope * (i + 0.5)) / 5;
              const px = geom.beamLowerTip.x + slope.x * t;
              const py = geom.beamLowerTip.y + slope.y * t;
              return (
                <line
                  key={`w${i}`}
                  x1={X(px) + nOut.x * 140}
                  y1={Y(py) - nOut.y * 140}
                  x2={X(px) + nOut.x * 520}
                  y2={Y(py) - nOut.y * 520}
                  stroke="#dc2626"
                  strokeWidth={14}
                  markerEnd="url(#arrow)"
                />
              );
            })}
            <text x={X(panelStart.x) + nOut.x * 620} y={Y(panelStart.y) - nOut.y * 620 - 60} fontSize={110} fill="#dc2626" textAnchor="middle">
              ветер (отсос)
            </text>
          </>
        ) : null}

        {/* Размеры */}
        {showDims ? <Dimensions geom={geom} X={X} Y={Y} /> : null}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-500">
        <span>α = {fmt(geom.alphaDeg)}°</span>
        <span>разнос {fmt(geom.postSpacing)} мм</span>
        <span>задняя {fmt(geom.rearTopHeight)} мм</span>
        <span>передняя {fmt(geom.frontTopHeight)} мм</span>
        <span>заглубление {fmt(geom.embedDepth)} мм</span>
        <span>балка {fmt(geom.beamLength)} мм</span>
        {geom.brace.enabled ? <span>подпорка {fmt(geom.brace.length)} мм</span> : null}
      </div>
    </Card>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-3 w-3 accent-blue-600" />
      {label}
    </label>
  );
}

function SupportSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="currentColor" strokeWidth={14} fill="none">
      <path d={`M${x - 120},${y} L${x + 120},${y}`} />
      {Array.from({ length: 5 }).map((_, i) => (
        <path key={i} d={`M${x - 120 + i * 60},${y} L${x - 180 + i * 60},${y + 70}`} />
      ))}
    </g>
  );
}

function Dimensions({
  geom,
  X,
  Y,
}: {
  geom: DerivedGeometry;
  X: (v: number) => number;
  Y: (v: number) => number;
}) {
  const dimColor = "#71717a";
  const below = Y(-geom.embedDepth) + 320;
  return (
    <g stroke={dimColor} fill={dimColor} strokeWidth={8}>
      {/* Горизонтальный разнос стоек */}
      <line x1={X(0)} y1={below} x2={X(geom.postSpacing)} y2={below} markerStart="url(#dim)" markerEnd="url(#dim)" />
      <text x={(X(0) + X(geom.postSpacing)) / 2} y={below - 40} fontSize={110} textAnchor="middle" stroke="none">
        {fmt(geom.postSpacing)}
      </text>

      {/* Высоты стоек */}
      <line x1={X(0) - 420} y1={Y(0)} x2={X(0) - 420} y2={Y(geom.rearTopHeight)} markerStart="url(#dim)" markerEnd="url(#dim)" />
      <text x={X(0) - 460} y={(Y(0) + Y(geom.rearTopHeight)) / 2} fontSize={110} textAnchor="end" stroke="none">
        {fmt(geom.rearTopHeight)}
      </text>

      <line x1={X(geom.postSpacing) + 420} y1={Y(0)} x2={X(geom.postSpacing) + 420} y2={Y(geom.frontTopHeight)} markerStart="url(#dim)" markerEnd="url(#dim)" />
      <text x={X(geom.postSpacing) + 460} y={(Y(0) + Y(geom.frontTopHeight)) / 2} fontSize={110} textAnchor="start" stroke="none">
        {fmt(geom.frontTopHeight)}
      </text>

      {/* Заглубление */}
      <line x1={X(0) - 420} y1={Y(0)} x2={X(0) - 420} y2={Y(-geom.embedDepth)} markerStart="url(#dim)" markerEnd="url(#dim)" />
      <text x={X(0) - 460} y={(Y(0) + Y(-geom.embedDepth)) / 2} fontSize={110} textAnchor="end" stroke="none">
        {fmt(geom.embedDepth)}
      </text>

      {/* Угол наклона — подписывается у передней стойки, ниже линии балки */}
      <text x={X(geom.postSpacing) - 200} y={Y(geom.frontTopHeight) + 320} fontSize={130} stroke="none" textAnchor="end">
        α = {fmt(geom.alphaDeg)}°
      </text>

      {/* Высота нижней кромки панелей */}
      <line x1={X(geom.beamLowerTip.x) + 250} y1={Y(0)} x2={X(geom.beamLowerTip.x) + 250} y2={Y(geom.lowerEdgeHeight)} markerStart="url(#dim)" markerEnd="url(#dim)" />
      <text x={X(geom.beamLowerTip.x) + 290} y={(Y(0) + Y(geom.lowerEdgeHeight)) / 2} fontSize={100} textAnchor="start" stroke="none">
        {fmt(geom.lowerEdgeHeight)}
      </text>
    </g>
  );
}
