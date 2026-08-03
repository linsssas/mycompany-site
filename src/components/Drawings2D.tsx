"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { ElementRole } from "@/lib/calc/types";
import Card from "./Card";
import { resolveSection } from "@/lib/calc/profileResolve";

const ROLE_LABELS: Record<ElementRole, string> = {
  post: "Стойки",
  beam: "Балки",
  purlin: "Прогоны",
  brace: "Подкосы",
  diagonal: "Связи",
};

function useScale(spanMm: number, targetPx: number) {
  return targetPx / Math.max(1, spanMm);
}

function FrontView() {
  const geom = useProjectStore((s) => s.results.geom);
  const g = useProjectStore((s) => s.geometry);
  const W = 760;
  const H = 260;
  const pad = 30;
  const scale = useScale(g.totalLength, W - pad * 2);
  const scaleY = useScale(Math.max(g.frontPostHeight, g.rearPostHeight) * 1.3, H - pad * 2);
  const s = Math.min(scale, scaleY);

  const x = (v: number) => pad + v * s;
  const y = (v: number) => H - pad - v * s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <line x1={pad} y1={y(0)} x2={W - pad} y2={y(0)} stroke="currentColor" strokeOpacity={0.3} />
      {geom.members
        .filter((m) => m.role === "post" || m.role === "beam")
        .map((m) => (
          <line key={m.id} x1={x(m.a.x)} y1={y(m.a.z)} x2={x(m.b.x)} y2={y(m.b.z)} stroke="#3b82f6" strokeWidth={2} />
        ))}
      {geom.frameXPositions.map((xp, i) => (
        <text key={i} x={x(xp)} y={H - 8} fontSize={9} textAnchor="middle" className="fill-zinc-500">
          {Math.round(xp)}
        </text>
      ))}
    </svg>
  );
}

function SideView() {
  const g = useProjectStore((s) => s.geometry);
  const W = 420;
  const H = 260;
  const pad = 30;
  const scaleX = useScale(g.totalWidth, W - pad * 2);
  const scaleY = useScale(Math.max(g.frontPostHeight, g.rearPostHeight) * 1.3, H - pad * 2);
  const s = Math.min(scaleX, scaleY);
  const x = (v: number) => pad + v * s;
  const y = (v: number) => H - pad - v * s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <line x1={pad} y1={y(0)} x2={W - pad} y2={y(0)} stroke="currentColor" strokeOpacity={0.3} />
      <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(g.frontPostHeight)} stroke="#3b82f6" strokeWidth={3} />
      <line x1={x(g.totalWidth)} y1={y(0)} x2={x(g.totalWidth)} y2={y(g.rearPostHeight)} stroke="#3b82f6" strokeWidth={3} />
      <line x1={x(0)} y1={y(g.frontPostHeight)} x2={x(g.totalWidth)} y2={y(g.rearPostHeight)} stroke="#f59e0b" strokeWidth={3} />
      <text x={x(g.totalWidth / 2)} y={y((g.frontPostHeight + g.rearPostHeight) / 2) - 8} fontSize={11} textAnchor="middle" className="fill-zinc-600">
        {g.tiltAngle}°
      </text>
      <text x={x(0) - 4} y={y(g.frontPostHeight) - 4} fontSize={9} textAnchor="end" className="fill-zinc-500">
        {g.frontPostHeight}
      </text>
      <text x={x(g.totalWidth) + 4} y={y(g.rearPostHeight) - 4} fontSize={9} className="fill-zinc-500">
        {g.rearPostHeight}
      </text>
    </svg>
  );
}

function TopView() {
  const geom = useProjectStore((s) => s.results.geom);
  const g = useProjectStore((s) => s.geometry);
  const panelQuads = useProjectStore((s) => s.results.panelQuads);
  const W = 760;
  const H = 320;
  const pad = 30;
  const scaleX = useScale(g.totalLength, W - pad * 2);
  const scaleY = useScale(g.totalWidth, H - pad * 2);
  const s = Math.min(scaleX, scaleY);
  const x = (v: number) => pad + v * s;
  const y = (v: number) => pad + v * s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <rect x={x(0)} y={y(0)} width={g.totalLength * s} height={g.totalWidth * s} fill="none" stroke="currentColor" strokeOpacity={0.3} />
      {panelQuads.map((q, i) => (
        <rect
          key={i}
          x={x(Math.min(q.corners[0][0], q.corners[3][0]))}
          y={y(Math.min(q.corners[0][1], q.corners[1][1]))}
          width={Math.abs(q.corners[1][0] - q.corners[0][0]) * s}
          height={Math.abs(q.corners[3][1] - q.corners[0][1]) * s}
          fill="#1e293b22"
          stroke="#1e293b"
          strokeWidth={0.5}
        />
      ))}
      {geom.footings.map((f) => (
        <circle key={f.id} cx={x(f.x)} cy={y(f.y)} r={4} fill="#9ca3af" stroke="#374151" />
      ))}
    </svg>
  );
}

const SPEC_ROLES: ElementRole[] = ["post", "beam", "purlin", "brace", "diagonal"];

function SpecTable() {
  const geom = useProjectStore((s) => s.results.geom);
  const profiles = useProjectStore((s) => s.profiles);

  const rows = useMemo(
    () =>
      SPEC_ROLES.map((role) => {
        const section = resolveSection(profiles[role]);
        const c = geom.counts[role];
        return { role, section, count: c.count, unitLength: c.unitLength, totalLength: c.totalLength, mass: (c.totalLength / 1000) * section.mass };
      }),
    [geom, profiles]
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
          <th className="py-1">Элемент</th>
          <th className="py-1">Профиль</th>
          <th className="py-1 text-right">Кол-во, шт</th>
          <th className="py-1 text-right">Длина, мм</th>
          <th className="py-1 text-right">Общая длина, м</th>
          <th className="py-1 text-right">Масса, кг</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.role} className="border-b border-zinc-100 dark:border-zinc-800/50">
            <td className="py-1">{ROLE_LABELS[r.role]}</td>
            <td className="py-1">{r.section.name}</td>
            <td className="py-1 text-right font-mono">{r.count}</td>
            <td className="py-1 text-right font-mono">{r.unitLength.toFixed(0)}</td>
            <td className="py-1 text-right font-mono">{(r.totalLength / 1000).toFixed(1)}</td>
            <td className="py-1 text-right font-mono">{r.mass.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Drawings2D() {
  const anchorSettings = useProjectStore((s) => s.anchorSettings);
  const geom = useProjectStore((s) => s.results.geom);
  const anchorFront = useProjectStore((s) => s.results.anchorFront);
  const totalAnchors = geom.footings.length * anchorSettings.boltCount;

  return (
    <div className="space-y-4">
      <Card title="15. Общий вид / вид спереди">
        <FrontView />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Card title="Вид сбоку">
          <SideView />
        </Card>
        <Card title="Вид сверху / схема расположения панелей">
          <TopView />
        </Card>
      </div>
      <Card title="Спецификация / ведомость металла">
        <SpecTable />
      </Card>
      <Card title="Ведомость крепежа">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-1">Анкерные болты (фундамент), M{anchorFront.recommendedDiameter}</td>
              <td className="py-1 text-right font-mono">{totalAnchors} шт</td>
            </tr>
            <tr>
              <td className="py-1 text-zinc-500">Крепеж узлов конструкции (болты, гайки, шайбы, клеммы панелей)</td>
              <td className="py-1 text-right text-zinc-500">уточняется на стадии КМД</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
