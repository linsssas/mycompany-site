"use client";

import { useProjectStore } from "@/store/useProjectStore";
import NumberField from "./NumberField";
import SelectField from "./SelectField";
import Card from "../Card";

export default function PanelForm() {
  const panel = useProjectStore((s) => s.panel);
  const setPanel = useProjectStore((s) => s.setPanel);
  const derived = useProjectStore((s) => s.results.panelsDerived);

  return (
    <Card title="2. Солнечные панели">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <NumberField label="Длина панели" unit="мм" value={panel.length} onChange={(v) => setPanel({ length: v })} />
        <NumberField label="Ширина панели" unit="мм" value={panel.width} onChange={(v) => setPanel({ width: v })} />
        <NumberField label="Толщина панели" unit="мм" value={panel.thickness} onChange={(v) => setPanel({ thickness: v })} />
        <NumberField label="Вес панели" unit="кг" value={panel.weight} onChange={(v) => setPanel({ weight: v })} />
        <NumberField label="Площадь панели (0=авто)" unit="м²" step={0.01} value={panel.area} onChange={(v) => setPanel({ area: v })} />
        <NumberField label="Количество панелей (0=авто)" value={panel.count} onChange={(v) => setPanel({ count: v })} />
        <NumberField label="Расстояние между панелями" unit="мм" value={panel.gap} onChange={(v) => setPanel({ gap: v })} />
        <SelectField
          label="Ориентация"
          value={panel.orientation}
          options={[
            { value: "portrait", label: "Портрет" },
            { value: "landscape", label: "Альбом" },
          ]}
          onChange={(v) => setPanel({ orientation: v as "portrait" | "landscape" })}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 rounded-none bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50 sm:grid-cols-3">
        <div>
          <div className="text-zinc-500">Общая площадь</div>
          <div className="font-mono font-semibold">{derived.totalAreaM2.toFixed(2)} м²</div>
        </div>
        <div>
          <div className="text-zinc-500">Общий вес</div>
          <div className="font-mono font-semibold">{derived.totalWeightKg.toFixed(0)} кг</div>
        </div>
        <div>
          <div className="text-zinc-500">Центр тяжести (X, Y, Z)</div>
          <div className="font-mono font-semibold">
            {derived.centerOfGravity.x.toFixed(0)}, {derived.centerOfGravity.y.toFixed(0)}, {derived.centerOfGravity.z.toFixed(0)} мм
          </div>
        </div>
      </div>
    </Card>
  );
}
