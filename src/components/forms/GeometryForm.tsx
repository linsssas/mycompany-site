"use client";

import { useProjectStore } from "@/store/useProjectStore";
import NumberField from "./NumberField";
import Card from "../Card";

export default function GeometryForm() {
  const geometry = useProjectStore((s) => s.geometry);
  const setGeometry = useProjectStore((s) => s.setGeometry);
  const warnings = useProjectStore((s) => s.results.geom.warnings);

  return (
    <Card title="1. Геометрия конструкции">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <NumberField label="Общая длина" unit="мм" value={geometry.totalLength} onChange={(v) => setGeometry({ totalLength: v })} />
        <NumberField label="Общая ширина" unit="мм" value={geometry.totalWidth} onChange={(v) => setGeometry({ totalWidth: v })} />
        <NumberField label="Общая высота" unit="мм" value={geometry.totalHeight} onChange={(v) => setGeometry({ totalHeight: v })} />
        <NumberField label="Высота передней стойки" unit="мм" value={geometry.frontPostHeight} onChange={(v) => setGeometry({ frontPostHeight: v })} />
        <NumberField label="Высота задней стойки" unit="мм" value={geometry.rearPostHeight} onChange={(v) => setGeometry({ rearPostHeight: v })} />
        <NumberField label="Угол наклона панелей" unit="°" value={geometry.tiltAngle} onChange={(v) => setGeometry({ tiltAngle: v })} />
        <NumberField label="Количество пролетов" value={geometry.spanCount} onChange={(v) => setGeometry({ spanCount: v })} />
        <NumberField label="Длина пролета" unit="мм" value={geometry.spanLength} onChange={(v) => setGeometry({ spanLength: v })} />
        <NumberField label="Шаг между стойками" unit="мм" value={geometry.postPitch} onChange={(v) => setGeometry({ postPitch: v })} />
        <NumberField label="Количество стоек" value={geometry.postCount} onChange={(v) => setGeometry({ postCount: v })} />
        <NumberField label="Длина несущих балок" unit="мм" value={geometry.beamLength} onChange={(v) => setGeometry({ beamLength: v })} />
        <NumberField label="Длина прогонов" unit="мм" value={geometry.purlinLength} onChange={(v) => setGeometry({ purlinLength: v })} />
        <NumberField label="Длина подкосов" unit="мм" value={geometry.braceLength} onChange={(v) => setGeometry({ braceLength: v })} />
        <NumberField label="Длина диагональных связей" unit="мм" value={geometry.diagonalLength} onChange={(v) => setGeometry({ diagonalLength: v })} />
        <NumberField label="Размер свесов" unit="мм" value={geometry.overhang} onChange={(v) => setGeometry({ overhang: v })} />
        <NumberField label="Количество рядов панелей" value={geometry.panelRowCount} onChange={(v) => setGeometry({ panelRowCount: v })} />
        <NumberField label="Панелей в одном ряду" value={geometry.panelsPerRow} onChange={(v) => setGeometry({ panelsPerRow: v })} />
      </div>
      {warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
