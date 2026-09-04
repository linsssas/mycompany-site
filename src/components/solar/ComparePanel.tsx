"use client";

import { useSolarStore } from "@/store/useSolarStore";
import { Card, StatusBadge, Table, Td, Th } from "./ui/layout";
import { NumberField } from "./ui/controls";
import { fmt } from "@/lib/solar/units";
import { statusOf } from "@/lib/solar/types";
import { MEMBER_ROLES } from "@/lib/solar/types";

/** Режим сравнения: вариант A — текущий проект, вариант B — редактируется здесь. */
export default function ComparePanel() {
  const a = useSolarStore((s) => s.results);
  const bProject = useSolarStore((s) => s.compareProject);
  const b = useSolarStore((s) => s.compareResults);
  const updateCompare = useSolarStore((s) => s.updateCompare);

  if (!bProject || !b) return null;

  const rows: { label: string; a: string; b: string }[] = [
    { label: "Максимальный K", a: fmt(a.maxUtilization), b: fmt(b.maxUtilization) },
    { label: "Определяет", a: a.governing?.member ?? "—", b: b.governing?.member ?? "—" },
    { label: "Масса металла, кг", a: fmt(a.bom.steelMassWithFasteners), b: fmt(b.bom.steelMassWithFasteners) },
    { label: "Металл на 1 кВт, кг/кВт", a: fmt(a.bom.massPerKW), b: fmt(b.bom.massPerKW) },
    { label: "Потребное заглубление, мм", a: fmt(a.foundationRear.requiredDepth), b: fmt(b.foundationRear.requiredDepth) },
    {
      label: "Запас на выдёргивание",
      a: isFinite(a.foundationRear.upliftSafety) ? fmt(a.foundationRear.upliftSafety) : "—",
      b: isFinite(b.foundationRear.upliftSafety) ? fmt(b.foundationRear.upliftSafety) : "—",
    },
    { label: "Снег s, кПа", a: fmt(a.snow.s), b: fmt(b.snow.s) },
    { label: "qp(ze), кПа", a: fmt(a.wind.qp), b: fmt(b.wind.qp) },
    { label: "Стоимость металла", a: fmt(a.bom.steelCost), b: fmt(b.bom.steelCost) },
  ];

  return (
    <Card title="Сравнение вариантов">
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Вариант B: заглубление"
          unit="мм"
          value={bProject.ground.embedDepth}
          onChange={(embedDepth) => updateCompare({ ground: { ...bProject.ground, embedDepth } })}
          min={600}
          max={3000}
          step={50}
          slider
        />
        <NumberField
          label="Вариант B: угол наклона"
          unit="°"
          value={bProject.geometry.tiltDeg}
          onChange={(tiltDeg) => updateCompare({ geometry: { ...bProject.geometry, tiltDeg, linkMode: "heights" } })}
          min={5}
          max={60}
          slider
        />
        <NumberField
          label="Вариант B: прибавка к толщине профилей"
          unit="мм"
          value={0}
          onChange={(dt) => {
            const base = useSolarStore.getState().project;
            const sections = { ...bProject.sections };
            for (const role of MEMBER_ROLES) {
              sections[role] = { ...sections[role], t: Math.max(0.5, base.sections[role].t + dt) };
            }
            updateCompare({ sections });
          }}
          min={-1}
          max={3}
          step={0.5}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Показатель</Th>
            <Th className="text-right">Вариант A (текущий)</Th>
            <Th className="text-right">Вариант B</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <Td>{r.label}</Td>
              <Td mono className="text-right">
                {r.label === "Максимальный K" ? <StatusBadge status={statusOf(a.maxUtilization)}>{r.a}</StatusBadge> : r.a}
              </Td>
              <Td mono className="text-right">
                {r.label === "Максимальный K" ? <StatusBadge status={statusOf(b.maxUtilization)}>{r.b}</StatusBadge> : r.b}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
