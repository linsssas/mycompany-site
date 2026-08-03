"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { BOLT_GRADES } from "@/lib/calc/anchors";
import { NormCode, ResponsibilityCategory, FoundationType } from "@/lib/calc/types";
import NumberField from "./NumberField";
import SelectField from "./SelectField";
import Card from "../Card";

const NORM_OPTIONS: { value: NormCode; label: string }[] = [
  { value: "SP_RK", label: "СП РК / СН РК" },
  { value: "EN1991_1993", label: "Еврокод EN 1991 / EN 1993" },
  { value: "ASCE7", label: "ASCE 7" },
];

const RESP_OPTIONS: { value: ResponsibilityCategory; label: string }[] = [
  { value: "I", label: "I — повышенная" },
  { value: "II", label: "II — нормальная" },
  { value: "III", label: "III — пониженная" },
];

const FOUNDATION_OPTIONS: { value: FoundationType; label: string }[] = [
  { value: "pile", label: "Сваи" },
  { value: "driven_post", label: "Забивные стойки" },
  { value: "concrete_block", label: "Бетонные блоки" },
  { value: "monolithic", label: "Монолитный фундамент" },
];

export default function SettingsForm() {
  const settings = useProjectStore((s) => s.settings);
  const setSettings = useProjectStore((s) => s.setSettings);
  const foundationSoil = useProjectStore((s) => s.foundationSoil);
  const setFoundationSoil = useProjectStore((s) => s.setFoundationSoil);
  const anchorSettings = useProjectStore((s) => s.anchorSettings);
  const setAnchorSettings = useProjectStore((s) => s.setAnchorSettings);

  return (
    <Card title="Нормативы, ответственность, фундамент, анкеры">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <SelectField label="Нормативная база" value={settings.norm} options={NORM_OPTIONS} onChange={(v) => setSettings({ norm: v as NormCode })} />
        <NumberField label="Коэффициент запаса" step={0.05} value={settings.safetyFactor} onChange={(v) => setSettings({ safetyFactor: v })} />
        <NumberField label="Срок службы" unit="лет" value={settings.serviceLife} onChange={(v) => setSettings({ serviceLife: v })} />
        <SelectField label="Категория ответственности" value={settings.responsibilityCategory} options={RESP_OPTIONS} onChange={(v) => setSettings({ responsibilityCategory: v as ResponsibilityCategory })} />
        <SelectField label="Тип фундамента" value={settings.foundationType} options={FOUNDATION_OPTIONS} onChange={(v) => setSettings({ foundationType: v as FoundationType })} />
        <NumberField label="Расч. сопротивление грунта R0" unit="кПа" value={foundationSoil.soilBearingCapacity} onChange={(v) => setFoundationSoil({ soilBearingCapacity: v })} />
        <NumberField label="Коэфф. трения подошвы" step={0.05} value={foundationSoil.frictionCoefficient} onChange={(v) => setFoundationSoil({ frictionCoefficient: v })} />
        <NumberField label="Глубина промерзания" unit="м" step={0.1} value={foundationSoil.frostDepthM} onChange={(v) => setFoundationSoil({ frostDepthM: v })} />
        <SelectField label="Класс прочности анкеров" value={anchorSettings.boltGradeKey} options={BOLT_GRADES.map((b) => ({ value: b.key, label: b.label }))} onChange={(v) => setAnchorSettings({ boltGradeKey: v })} />
        <NumberField label="Количество анкеров на базу" value={anchorSettings.boltCount} onChange={(v) => setAnchorSettings({ boltCount: v })} />
      </div>
    </Card>
  );
}
