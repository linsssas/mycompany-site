"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { PROFILE_LIBRARY, computeRectTubeProperties } from "@/lib/calc/profiles";
import { MATERIAL_LIST } from "@/lib/calc/materials";
import { ElementRole, MaterialKey } from "@/lib/calc/types";
import { resolveSection } from "@/lib/calc/profileResolve";
import NumberField from "./NumberField";
import SelectField from "./SelectField";
import Card from "../Card";

const ROLE_LABELS: Record<ElementRole, string> = {
  post: "Профиль стоек",
  beam: "Профиль балки",
  purlin: "Профиль прогонов",
  brace: "Профиль подкосов",
  diagonal: "Профиль связей",
};

const ROLE_ORDER: ElementRole[] = ["post", "beam", "purlin", "brace", "diagonal"];

function RoleRow({ role }: { role: ElementRole }) {
  const assignment = useProjectStore((s) => s.profiles[role]);
  const setProfile = useProjectStore((s) => s.setProfile);
  const isCustom = !assignment.sectionKey;
  const section = resolveSection(assignment);

  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h4 className="text-sm font-semibold">{ROLE_LABELS[role]}</h4>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={isCustom}
            onChange={(e) =>
              setProfile(role, e.target.checked ? { sectionKey: null, custom: { ...section, name: "Пользовательский профиль" } } : { sectionKey: PROFILE_LIBRARY[0].name, custom: undefined })
            }
          />
          Ввести размеры вручную
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {!isCustom && (
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <SelectField
              label="Профиль из библиотеки"
              value={assignment.sectionKey ?? ""}
              options={PROFILE_LIBRARY.map((p) => ({ value: p.name, label: `${p.name} (${p.standard})` }))}
              onChange={(v) => setProfile(role, { sectionKey: v })}
            />
          </div>
        )}
        {isCustom && (
          <>
            <NumberField
              label="Высота"
              unit="мм"
              value={section.h}
              onChange={(v) => {
                const props = computeRectTubeProperties(v, section.b, section.t);
                setProfile(role, { custom: { ...section, h: v, ...props } });
              }}
            />
            <NumberField
              label="Ширина"
              unit="мм"
              value={section.b}
              onChange={(v) => {
                const props = computeRectTubeProperties(section.h, v, section.t);
                setProfile(role, { custom: { ...section, b: v, ...props } });
              }}
            />
            <NumberField
              label="Толщина"
              unit="мм"
              value={section.t}
              onChange={(v) => {
                const props = computeRectTubeProperties(section.h, section.b, v);
                setProfile(role, { custom: { ...section, t: v, ...props } });
              }}
            />
          </>
        )}
        <SelectField
          label="Марка стали"
          value={assignment.materialKey}
          options={MATERIAL_LIST.map((m) => ({ value: m.key, label: m.name }))}
          onChange={(v) => setProfile(role, { materialKey: v as MaterialKey })}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400 sm:grid-cols-4">
        <span>Площадь: {section.area.toFixed(2)} см²</span>
        <span>Масса: {section.mass.toFixed(2)} кг/м</span>
        <span>Ix: {section.Ix.toFixed(1)} см⁴</span>
        <span>Iy: {section.Iy.toFixed(1)} см⁴</span>
        <span>Wx: {section.Wx.toFixed(2)} см³</span>
        <span>Wy: {section.Wy.toFixed(2)} см³</span>
      </div>
    </div>
  );
}

export default function ProfilesForm() {
  return (
    <Card title="3. Профили элементов">
      <div className="space-y-3">
        {ROLE_ORDER.map((role) => (
          <RoleRow key={role} role={role} />
        ))}
      </div>
    </Card>
  );
}
