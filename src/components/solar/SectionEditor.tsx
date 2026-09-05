"use client";

import { useSolarStore } from "@/store/useSolarStore";
import { loadSectionLibrary } from "@/lib/solar/presets";
import { MemberRole, MEMBER_ROLE_LABELS, SectionShape, SECTION_SHAPE_LABELS, SectionDef } from "@/lib/solar/types";
import { NumberField, SelectField } from "./ui/controls";
import { sectionProperties } from "@/lib/solar/sections";
import { fmt, mm2ToCm2, mm3ToCm3, mm4ToCm4 } from "@/lib/solar/units";

const LIBRARY = loadSectionLibrary();

const SHAPE_OPTIONS = (Object.keys(SECTION_SHAPE_LABELS) as SectionShape[]).map((s) => ({
  value: s,
  label: SECTION_SHAPE_LABELS[s],
}));

/** Редактор сечения одного элемента: выбор из библиотеки + правка габаритов. */
export default function SectionEditor({ role }: { role: MemberRole }) {
  const def = useSolarStore((s) => s.project.sections[role]);
  const fy = useSolarStore((s) => s.project.material.fy);
  const rho = useSolarStore((s) => s.project.material.rho);
  const setSection = useSolarStore((s) => s.setSection);

  const props = sectionProperties(def, fy, rho);
  const patch = (p: Partial<SectionDef>) => setSection(role, { ...def, ...p });

  return (
    <div className="space-y-2 rounded border border-zinc-200 p-2 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{MEMBER_ROLE_LABELS[role]}</span>
        <span className="font-mono text-[10px] text-zinc-500">{fmt(props.massPerM)} кг/м</span>
      </div>

      <select
        value={LIBRARY.some((l) => l.key === def.key) ? def.key : ""}
        onChange={(e) => {
          const found = LIBRARY.find((l) => l.key === e.target.value);
          if (found) setSection(role, found);
        }}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">— изменённое сечение —</option>
        {LIBRARY.map((l) => (
          <option key={l.key} value={l.key}>
            {l.name}
          </option>
        ))}
      </select>

      <SelectField
        label="Тип сечения"
        value={def.shape}
        options={SHAPE_OPTIONS}
        onChange={(shape) => patch({ shape, key: `${def.key}-custom` })}
      />

      {def.shape === "CUSTOM" ? (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="A" unit="см²" value={def.manual?.A ?? 0} onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, A: v } })} step={0.1} />
          <NumberField label="Ix" unit="см⁴" value={def.manual?.Ix ?? 0} onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, Ix: v } })} />
          <NumberField label="Iy" unit="см⁴" value={def.manual?.Iy ?? 0} onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, Iy: v } })} />
          <NumberField label="Wx" unit="см³" value={def.manual?.Wx ?? 0} onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, Wx: v } })} />
          <NumberField label="Wy" unit="см³" value={def.manual?.Wy ?? 0} onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, Wy: v } })} />
          <NumberField label="It" unit="см⁴" value={def.manual?.It ?? 0} onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, It: v } })} step={0.01} />
          <NumberField label="Iw" unit="см⁶" value={def.manual?.Iw ?? 0} onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, Iw: v } })} />
          <NumberField
            label="Aeff"
            unit="см²"
            hint="Эффективная площадь при сжатии. Если не задана, принимается равной полной — для тонкостенного профиля это не в запас."
            value={def.manual?.Aeff ?? 0}
            onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, Aeff: v } })}
            step={0.1}
          />
          <NumberField
            label="Weff"
            unit="см³"
            value={def.manual?.Weff ?? 0}
            onChange={(v) => patch({ manual: { ...emptyManual(), ...def.manual, Weff: v } })}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <NumberField label="H" unit="мм" value={def.h} onChange={(v) => patch({ h: v })} min={20} max={400} />
            <NumberField label="B" unit="мм" value={def.b} onChange={(v) => patch({ b: v })} min={15} max={300} />
            <NumberField label="c" unit="мм" hint="Длина краевого отгиба (губки). 0 — без отгиба." value={def.c} onChange={(v) => patch({ c: v })} min={0} max={60} />
            <NumberField label="t" unit="мм" value={def.t} onChange={(v) => patch({ t: v })} min={0.5} max={8} step={0.1} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Радиус гиба r/t"
              unit="—"
              hint="Радиус гиба задаётся кратно толщине. По умолчанию 1,5·t (EN 1993-1-3, п. 5.1.4)."
              value={def.rFactor}
              onChange={(v) => patch({ rFactor: v })}
              min={0.5}
              max={5}
              step={0.5}
            />
            {def.shape === "SIGMA" ? (
              <NumberField
                label="Глубина гофра стенки"
                unit="мм"
                value={def.webStiffenerDepth ?? 12}
                onChange={(v) => patch({ webStiffenerDepth: v })}
                min={0}
                max={40}
              />
            ) : (
              <SelectField
                label="Покрытие"
                value={def.coating}
                options={[
                  { value: "Sz", label: "Sz — рулонное цинкование" },
                  { value: "HDZ", label: "HDZ — горячее цинкование" },
                  { value: "none", label: "без покрытия" },
                ]}
                onChange={(v) => patch({ coating: v })}
              />
            )}
          </div>
        </>
      )}

      <dl className="grid grid-cols-3 gap-x-2 gap-y-0.5 border-t border-zinc-200 pt-2 font-mono text-[10px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <Row k="A" v={`${fmt(mm2ToCm2(props.A))} см²`} />
        <Row k="Aeff" v={`${fmt(mm2ToCm2(props.effective.Aeff))} см²`} />
        <Row k="Aeff/A" v={fmt(props.effective.Aeff / Math.max(props.A, 1e-9))} />
        <Row k="Ix" v={`${fmt(mm4ToCm4(props.Iu))} см⁴`} />
        <Row k="Iy" v={`${fmt(mm4ToCm4(props.Iv))} см⁴`} />
        <Row k="It" v={`${fmt(mm4ToCm4(props.It))} см⁴`} />
        <Row k="Wx" v={`${fmt(mm3ToCm3(props.Wu))} см³`} />
        <Row k="Weff" v={`${fmt(mm3ToCm3(Math.min(props.effective.WeffTop, props.effective.WeffBot)))} см³`} />
        <Row k="ix / iy" v={`${fmt(props.iu / 10)} / ${fmt(props.iv / 10)} см`} />
      </dl>

      {props.effective.detail.length > 0 ? (
        <details className="text-[10px] text-zinc-500">
          <summary className="cursor-pointer">Эффективные характеристики по элементам сечения</summary>
          <ul className="mt-1 space-y-0.5">
            {props.effective.detail.map((d, i) => (
              <li key={i} className="font-mono">
                {d.name}: bp = {fmt(d.bp)} мм, λ̄p = {fmt(d.slenderness)}, ρ = {fmt(d.rho)}
                {d.chiD !== undefined ? `, χd = ${fmt(d.chiD)}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="col-span-1 text-zinc-500">{k}</dt>
      <dd className="col-span-2">{v}</dd>
    </>
  );
}

function emptyManual() {
  return { A: 0, Ix: 0, Iy: 0, Wx: 0, Wy: 0, ix: 0, iy: 0, It: 0, Iw: 0 };
}
