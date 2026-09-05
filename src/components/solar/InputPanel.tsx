"use client";

import { useSolarStore } from "@/store/useSolarStore";
import { REGIONS, SOILS, region } from "@/lib/solar/presets";
import {
  FOUNDATION_LABELS,
  FoundationType,
  JOINT_LABELS,
  JointKey,
  MEMBER_ROLES,
  MEMBER_ROLE_LABELS,
  MemberRole,
  NormCode,
  TerrainCategory,
} from "@/lib/solar/types";
import { CheckboxField, NumberField, OptionalNumberField, SelectField, TextField } from "./ui/controls";
import { Grid2, Note, Section } from "./ui/layout";
import SectionEditor from "./SectionEditor";
import { fmt } from "@/lib/solar/units";

const STEEL_GRADES = [235, 250, 280, 320, 350, 390, 450];

export default function InputPanel() {
  const p = useSolarStore((s) => s.project);
  const results = useSolarStore((s) => s.results);
  const setGeometry = useSolarStore((s) => s.setGeometry);
  const setMaterial = useSolarStore((s) => s.setMaterial);
  const setPanel = useSolarStore((s) => s.setPanel);
  const setSelfWeight = useSolarStore((s) => s.setSelfWeight);
  const setGround = useSolarStore((s) => s.setGround);
  const setClimate = useSolarStore((s) => s.setClimate);
  const setDesign = useSolarStore((s) => s.setDesign);
  const setEconomics = useSolarStore((s) => s.setEconomics);
  const setJoint = useSolarStore((s) => s.setJoint);
  const setBolts = useSolarStore((s) => s.setBolts);
  const setSoilPreset = useSolarStore((s) => s.setSoilPreset);
  const setRegionPreset = useSolarStore((s) => s.setRegionPreset);
  const setMeta = useSolarStore((s) => s.setMeta);

  const g = p.geometry;
  const reg = region(p.climate.regionKey);

  return (
    <div className="space-y-2">
      <Section title="Геометрия" subtitle="стол, рамы, панели, прогоны" defaultOpen badge={`${fmt(results.geom.tableLength)} мм`}>
        <SelectField
          label="Что вычислять автоматически"
          hint="Угол, высоты стоек и горизонтальный разнос связаны: две величины задаются, третья вычисляется."
          value={g.linkMode}
          options={[
            { value: "angle", label: "Угол — из высот и разноса" },
            { value: "heights", label: "Высоту задней стойки — из угла" },
            { value: "spacing", label: "Разнос стоек — из угла и высот" },
          ]}
          onChange={(linkMode) => setGeometry({ linkMode })}
        />
        <NumberField
          label="Угол наклона панелей α"
          unit="°"
          starred
          slider
          min={0}
          max={60}
          value={g.linkMode === "angle" ? Number(results.geom.alphaDeg.toFixed(2)) : g.tiltDeg}
          onChange={(tiltDeg) => setGeometry({ tiltDeg })}
          disabled={g.linkMode === "angle"}
          hint="Основной параметр. При режиме «угол — из высот» поле только показывает результат."
        />
        <Grid2>
          <NumberField label="Количество рам N" unit="шт" value={g.frameCount} onChange={(frameCount) => setGeometry({ frameCount: Math.max(2, Math.round(frameCount)) })} min={2} max={60} slider />
          <NumberField label="Шаг рам" unit="мм" value={g.framePitch} onChange={(framePitch) => setGeometry({ framePitch })} min={800} max={4000} step={50} slider />
          <NumberField label="Свес по краям" unit="мм" value={g.edgeOverhang} onChange={(edgeOverhang) => setGeometry({ edgeOverhang })} min={0} max={1500} />
          <NumberField label="Зазор между панелями" unit="мм" value={g.panelGap} onChange={(panelGap) => setGeometry({ panelGap })} min={0} max={100} />
          <NumberField label="Разнос осей стоек" unit="мм" value={g.linkMode === "spacing" ? Number(results.geom.postSpacing.toFixed(0)) : g.postSpacing} onChange={(postSpacing) => setGeometry({ postSpacing })} disabled={g.linkMode === "spacing"} min={800} max={6000} step={10} />
          <NumberField label="Высота верха задней стойки" unit="мм" value={g.linkMode === "heights" ? Number(results.geom.rearTopHeight.toFixed(0)) : g.rearTopHeight} onChange={(rearTopHeight) => setGeometry({ rearTopHeight })} disabled={g.linkMode === "heights"} min={500} max={6000} step={10} />
          <NumberField label="Высота верха передней стойки" unit="мм" value={g.frontTopHeight} onChange={(frontTopHeight) => setGeometry({ frontTopHeight })} min={200} max={4000} step={10} />
          <NumberField label="Свес балки за переднюю стойку" unit="мм" value={g.beamOverhang} onChange={(beamOverhang) => setGeometry({ beamOverhang })} min={0} max={2000} step={10} />
          <NumberField label="Свес балки за заднюю стойку" unit="мм" value={g.beamRearOverhang} onChange={(beamRearOverhang) => setGeometry({ beamRearOverhang })} min={0} max={2000} step={10} />
          <NumberField label="Число рядов панелей по скату" unit="шт" value={g.panelRows} onChange={(panelRows) => setGeometry({ panelRows: Math.max(1, Math.round(panelRows)) })} min={1} max={4} />
        </Grid2>
        <SelectField
          label="Ориентация панели"
          value={g.panelOrientation}
          options={[
            { value: "portrait", label: "Портрет (длинная сторона по скату)" },
            { value: "landscape", label: "Ландшафт (длинная сторона вдоль стола)" },
          ]}
          onChange={(panelOrientation) => setGeometry({ panelOrientation })}
        />
        <SelectField
          label="Положение панельного поля на балке"
          hint="Панельное поле по скату может быть длиннее балки. «По центру» — свесы одинаковы с двух сторон."
          value={g.panelFieldMode}
          options={[
            { value: "centered", label: "По центру балки" },
            { value: "manual", label: "Задать смещение вручную" },
          ]}
          onChange={(panelFieldMode) => setGeometry({ panelFieldMode })}
        />
        {g.panelFieldMode === "manual" ? (
          <NumberField label="Смещение нижней кромки поля от конца балки" unit="мм" value={g.panelFieldOffset} onChange={(panelFieldOffset) => setGeometry({ panelFieldOffset })} min={-2000} max={2000} step={10} />
        ) : null}

        <div className="rounded bg-zinc-50 px-2 py-1.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
          Нижняя кромка панелей над землёй: {fmt(results.geom.lowerEdgeHeight)} мм · верхняя: {fmt(results.geom.upperEdgeHeight)} мм
          <br />
          Панелей: {results.geom.panelCount} ({results.geom.panelsPerRow} × {results.geom.panelRows}) · поле {fmt(results.geom.panelFieldLength)} × {fmt(results.geom.panelFieldSlope)} мм
          <br />
          Балка: {fmt(results.geom.beamLength)} мм (пролёт {fmt(results.geom.slopeSpan)} мм) · подпорка {fmt(results.geom.brace.length)} мм
        </div>

        <NumberField label="Число линий прогонов" unit="шт" value={g.purlinLines} onChange={(purlinLines) => setGeometry({ purlinLines: Math.max(2, Math.min(6, Math.round(purlinLines))) })} min={2} max={6} />
        <div className="space-y-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Положение линий прогонов, % длины ската</span>
          <div className="grid grid-cols-3 gap-2">
            {results.geom.purlins.map((line, i) => (
              <NumberField
                key={i}
                label={`Линия ${i + 1}`}
                unit="%"
                value={Number((line.fraction * 100).toFixed(1))}
                onChange={(v) => {
                  const next = results.geom.purlins.map((x) => x.fraction * 100);
                  next[i] = v;
                  setGeometry({ purlinPositionsPct: next });
                }}
                min={0}
                max={100}
                step={0.5}
              />
            ))}
          </div>
        </div>
        <NumberField label="Длина секции прогона (монтажный стык)" unit="мм" value={g.purlinSectionLength} onChange={(purlinSectionLength) => setGeometry({ purlinSectionLength })} min={0} max={12000} step={10} hint="0 — прогон без монтажных стыков." />

        <CheckboxField label="Подпорка балки (раскос)" checked={g.braceEnabled} onChange={(braceEnabled) => setGeometry({ braceEnabled })} />
        {g.braceEnabled ? (
          <Grid2>
            <NumberField label="Крепление подпорки на задней стойке" unit="мм" value={g.bracePostAttachHeight} onChange={(bracePostAttachHeight) => setGeometry({ bracePostAttachHeight })} min={0} max={3000} step={10} />
            <NumberField label="Положение на балке" unit="% пролёта" value={g.braceBeamPositionPct} onChange={(braceBeamPositionPct) => setGeometry({ braceBeamPositionPct })} min={5} max={95} slider />
          </Grid2>
        ) : null}
      </Section>

      <Section title="Профили и материал" subtitle="сечения элементов, сталь" badge={`fy = ${p.material.fy} МПа`}>
        <SelectField
          label="Предел текучести fy (Ry)"
          unit="МПа"
          starred
          value={STEEL_GRADES.includes(p.material.fy) ? String(p.material.fy) : "custom"}
          options={[...STEEL_GRADES.map((v) => ({ value: String(v), label: `${v} МПа` })), { value: "custom", label: "Ручной ввод" }]}
          onChange={(v) => {
            if (v !== "custom") setMaterial({ fy: Number(v) });
          }}
        />
        <Grid2>
          <NumberField label="fy" unit="МПа" starred value={p.material.fy} onChange={(fy) => setMaterial({ fy })} min={200} max={700} />
          <NumberField label="Предел прочности fu" unit="МПа" value={p.material.fu} onChange={(fu) => setMaterial({ fu })} min={300} max={900} />
          <NumberField label="Модуль упругости E" unit="МПа" value={p.material.E} onChange={(E) => setMaterial({ E })} />
          <NumberField label="Модуль сдвига G" unit="МПа" value={p.material.G} onChange={(G) => setMaterial({ G })} />
          <NumberField label="Плотность ρ" unit="кг/м³" value={p.material.rho} onChange={(rho) => setMaterial({ rho })} />
          <NumberField label="Коэффициент условий работы γc" unit="—" value={p.material.gammaC} onChange={(gammaC) => setMaterial({ gammaC })} min={0.7} max={1.1} step={0.05} />
          <NumberField label="γM0" unit="—" hint="Частный коэффициент по материалу для прочности сечения." value={p.material.gammaM0} onChange={(gammaM0) => setMaterial({ gammaM0 })} min={1} max={1.5} step={0.05} />
          <NumberField label="γM1" unit="—" hint="Частный коэффициент для проверок устойчивости." value={p.material.gammaM1} onChange={(gammaM1) => setMaterial({ gammaM1 })} min={1} max={1.5} step={0.05} />
          <NumberField label="γM2" unit="—" hint="Частный коэффициент для соединений и разрушения сечения." value={p.material.gammaM2} onChange={(gammaM2) => setMaterial({ gammaM2 })} min={1} max={1.6} step={0.05} />
        </Grid2>
        <div className="space-y-2 pt-1">
          {MEMBER_ROLES.map((role: MemberRole) => (
            <SectionEditor key={role} role={role} />
          ))}
        </div>
      </Section>

      <Section title="Панели" subtitle="габариты, масса, мощность" badge={`${results.geom.panelCount} шт`}>
        <Grid2>
          <NumberField label="Масса одной панели" unit="кг" starred value={p.panel.mass} onChange={(mass) => setPanel({ mass })} min={15} max={45} step={0.5} slider />
          <NumberField label="Мощность панели" unit="Вт" value={p.panel.powerW} onChange={(powerW) => setPanel({ powerW })} min={100} max={900} step={5} />
          <NumberField label="Длина панели" unit="мм" value={p.panel.length} onChange={(length) => setPanel({ length })} min={800} max={2600} />
          <NumberField label="Ширина панели" unit="мм" value={p.panel.width} onChange={(width) => setPanel({ width })} min={500} max={1400} />
        </Grid2>
        <CheckboxField
          label="Задать количество панелей вручную"
          checked={p.panel.countOverride !== null}
          onChange={(v) => setPanel({ countOverride: v ? results.geom.panelCount : null })}
        />
        {p.panel.countOverride !== null ? (
          <NumberField label="Количество панелей" unit="шт" value={p.panel.countOverride} onChange={(countOverride) => setPanel({ countOverride })} min={1} max={500} />
        ) : null}
        <div className="font-mono text-[11px] text-zinc-500">
          Площадь панелей {fmt(results.geom.panelAreaM2)} м² · мощность стола {fmt(results.bom.powerKW)} кВт
        </div>
      </Section>

      <Section title="Собственный вес" subtitle="спецификация или ручной ввод" badge={`${fmt(results.bom.steelMassWithFasteners)} кг`}>
        <SelectField
          label="Режим"
          starred
          value={p.selfWeight.mode}
          options={[
            { value: "auto", label: "Автоматически по спецификации" },
            { value: "manual", label: "Ручной ввод общей массы металла" },
          ]}
          onChange={(mode) => setSelfWeight({ mode })}
        />
        {p.selfWeight.mode === "manual" ? (
          <NumberField
            label="Масса металлоконструкции"
            unit="кг"
            starred
            hint="Нагрузка распределяется пропорционально автоматическому расчёту."
            value={p.selfWeight.manualMassKg}
            onChange={(manualMassKg) => setSelfWeight({ manualMassKg })}
            min={100}
            max={20000}
            step={10}
          />
        ) : null}
        <NumberField label="Коэффициент на крепёж и мелочёвку" unit="—" value={p.selfWeight.fastenerFactor} onChange={(fastenerFactor) => setSelfWeight({ fastenerFactor })} min={1} max={1.3} step={0.01} />
        <NumberField label="Цена стали" unit={`${p.economics.currency}/кг`} value={p.economics.steelPricePerKg} onChange={(steelPricePerKg) => setEconomics({ steelPricePerKg })} min={0} max={10000} step={10} />
        <div className="font-mono text-[11px] text-zinc-500">
          Металл {fmt(results.bom.steelMassWithFasteners)} кг · панели {fmt(results.bom.panelMass)} кг · итого {fmt(results.bom.totalMass / 1000)} т
        </div>
      </Section>

      <Section title="Грунт и фундамент" subtitle="заглубление, тип, характеристики грунта" badge={`${fmt(p.ground.embedDepth)} мм`}>
        <NumberField label="Глубина заглубления стойки" unit="мм" starred slider min={600} max={3000} step={50} value={p.ground.embedDepth} onChange={(embedDepth) => setGround({ embedDepth })} />
        <SelectField
          label="Тип фундамента"
          value={p.ground.foundationType}
          options={(Object.keys(FOUNDATION_LABELS) as FoundationType[]).map((v) => ({ value: v, label: FOUNDATION_LABELS[v] }))}
          onChange={(foundationType) => setGround({ foundationType })}
        />
        {p.ground.foundationType === "concreted" || p.ground.foundationType === "footing" ? (
          <NumberField label="Диаметр (сторона) бетонирования" unit="мм" value={p.ground.concreteDia} onChange={(concreteDia) => setGround({ concreteDia })} min={150} max={800} step={10} />
        ) : null}
        <SelectField
          label="Тип грунта"
          hint="Выбор типа подставляет справочные характеристики. Значения редактируются и должны уточняться по изысканиям."
          value={p.ground.soilKey}
          options={SOILS.map((s) => ({ value: s.key, label: s.name }))}
          onChange={setSoilPreset}
        />
        <Grid2>
          <NumberField label="Угол внутреннего трения φ" unit="°" value={p.ground.phi} onChange={(phi) => setGround({ phi })} min={0} max={45} />
          <NumberField label="Удельное сцепление c" unit="кПа" value={p.ground.c} onChange={(c) => setGround({ c })} min={0} max={200} />
          <NumberField label="Удельный вес грунта γ" unit="кН/м³" value={p.ground.gamma} onChange={(gamma) => setGround({ gamma })} min={10} max={25} step={0.5} />
          <NumberField label="Расчётное сопротивление R" unit="кПа" value={p.ground.R} onChange={(R) => setGround({ R })} min={50} max={800} step={10} />
          <NumberField label="Коэффициент nh (пески)" unit="кН/м³" hint="Коэффициент возрастания модуля реакции с глубиной. 0 — грунт считается связным." value={p.ground.nh} onChange={(nh) => setGround({ nh })} min={0} max={30000} step={100} />
          <NumberField label="Коэффициент ks (глины)" unit="кН/м³" value={p.ground.ks} onChange={(ks) => setGround({ ks })} min={0} max={60000} step={500} />
          <NumberField label="Глубина промерзания" unit="м" value={p.ground.frostDepthM} onChange={(frostDepthM) => setGround({ frostDepthM })} min={0} max={4} step={0.1} />
          <NumberField label="Требуемый запас на выдёргивание" unit="—" value={p.ground.upliftSafetyFactor} onChange={(upliftSafetyFactor) => setGround({ upliftSafetyFactor })} min={1} max={3} step={0.1} />
        </Grid2>
        <SelectField
          label="Модель опирания в расчётной схеме"
          hint="Упругое защемление моделирует отпор грунта пружинами по длине заглубления; жёсткая заделка — для сравнения."
          value={p.ground.supportModel}
          options={[
            { value: "elastic", label: "Упругое защемление в грунте" },
            { value: "fixed", label: "Жёсткая заделка на уровне земли" },
          ]}
          onChange={(supportModel) => setGround({ supportModel })}
        />
        {p.ground.embedDepth / 1000 < p.ground.frostDepthM ? (
          <Note kind="error">
            Заглубление меньше глубины промерзания {fmt(p.ground.frostDepthM * 1000)} мм — риск морозного пучения.
          </Note>
        ) : null}
      </Section>

      <Section title="Болты и узлы" subtitle="диаметры, классы, расстановка">
        {p.bolts.joints.map((j) => (
          <div key={j.key} className="space-y-2 rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{JOINT_LABELS[j.key as JointKey]}</div>
            <div className="grid grid-cols-3 gap-2">
              <SelectField label="Диаметр" unit="мм" value={String(j.d)} options={[8, 10, 12, 16].map((d) => ({ value: String(d), label: `М${d}` }))} onChange={(v) => setJoint(j.key, { d: Number(v) })} />
              <SelectField label="Класс" value={j.grade} options={["4.8", "5.8", "8.8", "10.9", "A2-70"].map((v) => ({ value: v, label: v }))} onChange={(grade) => setJoint(j.key, { grade })} />
              <NumberField label="Болтов в узле" unit="шт" value={j.n} onChange={(n) => setJoint(j.key, { n: Math.max(1, Math.round(n)) })} min={1} max={12} />
              <NumberField label="t₁" unit="мм" value={j.t1} onChange={(t1) => setJoint(j.key, { t1 })} min={0.5} max={20} step={0.5} />
              <NumberField label="t₂" unit="мм" value={j.t2} onChange={(t2) => setJoint(j.key, { t2 })} min={0.5} max={20} step={0.5} />
              <NumberField label="e₁" unit="мм" hint="Расстояние до края вдоль усилия. Минимум 1,2·d₀, рекомендуется 1,5·d₀." value={j.e1} onChange={(e1) => setJoint(j.key, { e1 })} min={5} max={100} />
              <NumberField label="e₂" unit="мм" value={j.e2} onChange={(e2) => setJoint(j.key, { e2 })} min={5} max={100} />
              <NumberField label="p₁" unit="мм" hint="Шаг болтов вдоль усилия. Минимум 3·d₀." value={j.p1} onChange={(p1) => setJoint(j.key, { p1 })} min={10} max={200} />
              <CheckboxField label="Резьба в срезе" checked={j.threadInShear} onChange={(threadInShear) => setJoint(j.key, { threadInShear })} />
            </div>
          </div>
        ))}
        <Grid2>
          <NumberField label="Зажимов концевых по чертежу" unit="шт" value={p.bolts.clampEndCount} onChange={(clampEndCount) => setBolts({ clampEndCount })} min={0} max={500} />
          <NumberField label="Зажимов центральных по чертежу" unit="шт" value={p.bolts.clampMidCount} onChange={(clampMidCount) => setBolts({ clampMidCount })} min={0} max={1000} />
          <NumberField label="Несущая способность зажима" unit="кН" hint="Паспортное значение изготовителя зажима." value={p.bolts.clampCapacityKN} onChange={(clampCapacityKN) => setBolts({ clampCapacityKN })} min={0.2} max={10} step={0.1} />
        </Grid2>
        <div className="space-y-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Фактическое количество болтов по чертежу</span>
          {p.bolts.drawingCounts.map((d, i) => (
            <div key={d.d} className="grid grid-cols-2 gap-2">
              <NumberField label={`М${d.d}`} unit="шт" value={d.count} onChange={(count) => {
                const next = p.bolts.drawingCounts.map((x, xi) => (xi === i ? { ...x, count } : x));
                setBolts({ drawingCounts: next });
              }} min={0} max={2000} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Климат и нормы" subtitle="снег, ветер, район" defaultOpen badge={`${fmt(results.snow.s)} кПа / ${fmt(results.wind.qp)} кПа`}>
        <SelectField
          label="Норма расчёта"
          starred
          value={p.climate.norm}
          options={[
            { value: "SP_RK_EN", label: "СП РК EN 1991-1-3 / 1991-1-4 (Казахстан)" },
            { value: "SP20", label: "СП 20.13330.2016 (РФ)" },
            { value: "MANUAL", label: "Ручной ввод характеристических нагрузок" },
          ]}
          onChange={(norm) => setClimate({ norm: norm as NormCode })}
        />
        <SelectField
          label="Регион / город"
          value={p.climate.regionKey}
          options={REGIONS.map((r) => ({ value: r.key, label: `${r.city} (снег ${r.sk} кПа, ветер ${r.vb} м/с)` }))}
          onChange={setRegionPreset}
        />
        <Grid2>
          <OptionalNumberField label="Снеговая нагрузка на грунт sk" unit="кПа" starred value={p.climate.skManual} autoValue={reg.sk} onChange={(skManual) => setClimate({ skManual })} />
          <OptionalNumberField label="Базовая скорость ветра vb" unit="м/с" starred value={p.climate.vbManual} autoValue={reg.vb} onChange={(vbManual) => setClimate({ vbManual })} />
        </Grid2>
        <Grid2>
          <SelectField
            label="Категория местности"
            value={p.climate.terrain}
            options={[
              { value: "0", label: "0 — море, прибрежная зона" },
              { value: "I", label: "I — открытая местность" },
              { value: "II", label: "II — редкие препятствия (СЭС)" },
              { value: "III", label: "III — застройка, лес" },
              { value: "IV", label: "IV — плотная застройка" },
            ]}
            onChange={(terrain) => setClimate({ terrain: terrain as TerrainCategory })}
          />
          <NumberField label="Высота над уровнем моря" unit="м" value={p.climate.altitude} onChange={(altitude) => setClimate({ altitude })} min={-100} max={3000} step={10} />
          <NumberField label="Термический коэффициент Ct" unit="—" value={p.climate.Ct} onChange={(Ct) => setClimate({ Ct })} min={0.8} max={1.2} step={0.05} />
          <SelectField
            label="Коэффициент окружения Ce"
            hint="Учитывает снос снега ветром. Для открытых полей СЭС в запас рекомендуется 1,0."
            value={String(p.climate.Ce)}
            options={[
              { value: "1.2", label: "1,2 — защищённый" },
              { value: "1", label: "1,0 — обычный (рекомендуется)" },
              { value: "0.8", label: "0,8 — открытый" },
            ]}
            onChange={(v) => setClimate({ Ce: Number(v) })}
          />
          <NumberField label="Период повторяемости" unit="лет" value={p.climate.returnPeriodYears} onChange={(returnPeriodYears) => setClimate({ returnPeriodYears })} min={5} max={200} step={5} />
          <NumberField label="Срок службы" unit="лет" value={p.climate.serviceLifeYears} onChange={(serviceLifeYears) => setClimate({ serviceLifeYears })} min={5} max={60} step={5} />
          <NumberField label="Перепад температур ΔT" unit="±°C" value={p.climate.deltaT} onChange={(deltaT) => setClimate({ deltaT })} min={0} max={80} step={5} />
        </Grid2>
        <SelectField
          label="Коэффициент заполнения под столом φ"
          hint="φ = 0 — свободный поток под столом, φ = 1 — пространство заблокировано снегом или растительностью."
          value={p.climate.blockage}
          options={[
            { value: "both", label: "Считать оба (в запас — худший)" },
            { value: "0", label: "φ = 0 — свободный поток" },
            { value: "1", label: "φ = 1 — заблокировано" },
          ]}
          onChange={(blockage) => setClimate({ blockage })}
        />
        <CheckboxField
          label="Учитывать гололёдную нагрузку"
          hint="Вес слоя льда на поверхности панелей. Толщина стенки гололёда принимается по карте гололёдных районов."
          checked={p.climate.iceEnabled}
          onChange={(iceEnabled) => setClimate({ iceEnabled })}
        />
        {p.climate.iceEnabled ? (
          <NumberField
            label="Толщина стенки гололёда"
            unit="мм"
            value={p.climate.iceThicknessMm}
            onChange={(iceThicknessMm) => setClimate({ iceThicknessMm })}
            min={0}
            max={40}
            step={1}
            slider
          />
        ) : null}
        <CheckboxField
          label="Проверочный расчёт по ASCE 7-22, гл. 29.4.4 (GCrn)"
          hint="Альтернативная методика для наземных фотоэлектрических установок. Коэффициенты редактируются в data/solar/wind_coefficients.json."
          checked={p.climate.useAsce}
          onChange={(useAsce) => setClimate({ useAsce })}
        />
      </Section>

      <Section title="Расчётные настройки" subtitle="коэффициенты, прогибы, сочетания">
        <div className="space-y-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Коэффициенты расчётной длины μ</span>
          {MEMBER_ROLES.map((role) => (
            <div key={role} className="grid grid-cols-2 gap-2">
              <NumberField label={`${MEMBER_ROLE_LABELS[role]} — в плоскости`} unit="—" value={p.design.bucklingFactors[role]} onChange={(v) => setDesign({ bucklingFactors: { ...p.design.bucklingFactors, [role]: v } })} min={0.5} max={3} step={0.1} />
              <NumberField label="из плоскости" unit="—" value={p.design.bucklingFactorsOut[role]} onChange={(v) => setDesign({ bucklingFactorsOut: { ...p.design.bucklingFactorsOut, [role]: v } })} min={0.5} max={3} step={0.1} />
            </div>
          ))}
        </div>
        <Grid2>
          <NumberField label="Прогиб прогона L/" unit="—" value={p.design.deflectionLimits.purlin} onChange={(v) => setDesign({ deflectionLimits: { ...p.design.deflectionLimits, purlin: v } })} min={50} max={500} step={10} />
          <NumberField label="Прогиб балки L/" unit="—" value={p.design.deflectionLimits.beam} onChange={(v) => setDesign({ deflectionLimits: { ...p.design.deflectionLimits, beam: v } })} min={50} max={500} step={10} />
          <NumberField label="Смещение верха стойки H/" unit="—" value={p.design.deflectionLimits.postDrift} onChange={(v) => setDesign({ deflectionLimits: { ...p.design.deflectionLimits, postDrift: v } })} min={50} max={500} step={10} />
          <NumberField label="Допуск прогиба под панелью" unit="мм" hint="Допуск изготовителя модуля. Превышение — риск микротрещин в ячейках." value={p.design.deflectionLimits.panelAbsMm} onChange={(v) => setDesign({ deflectionLimits: { ...p.design.deflectionLimits, panelAbsMm: v } })} min={5} max={60} />
          <NumberField label="Монтажная нагрузка" unit="кН" value={p.design.montageLoadKN} onChange={(montageLoadKN) => setDesign({ montageLoadKN })} min={0} max={5} step={0.1} />
          <NumberField label="Коэффициент краевых зон" unit="—" hint="Повышение ветровой нагрузки на крайние рамы. Типовой диапазон 1,3…1,5." value={p.design.edgeZoneFactor} onChange={(edgeZoneFactor) => setDesign({ edgeZoneFactor })} min={1} max={2} step={0.05} />
          <NumberField label="γG" unit="—" value={p.design.gammaG} onChange={(gammaG) => setDesign({ gammaG })} min={1} max={1.6} step={0.05} />
          <NumberField label="γG,inf (благоприятная)" unit="—" value={p.design.gammaGfav} onChange={(gammaGfav) => setDesign({ gammaGfav })} min={0.8} max={1.1} step={0.05} />
          <NumberField label="γQ" unit="—" value={p.design.gammaQ} onChange={(gammaQ) => setDesign({ gammaQ })} min={1} max={1.8} step={0.05} />
          <NumberField label="ξ (для 6.10b)" unit="—" value={p.design.xi} onChange={(xi) => setDesign({ xi })} min={0.7} max={1} step={0.05} />
          <NumberField label="ψ₀ снег" unit="—" value={p.design.psi0Snow} onChange={(psi0Snow) => setDesign({ psi0Snow })} min={0} max={1} step={0.05} />
          <NumberField label="ψ₀ ветер" unit="—" value={p.design.psi0Wind} onChange={(psi0Wind) => setDesign({ psi0Wind })} min={0} max={1} step={0.05} />
          <NumberField label="Мин. доля продольной ветровой силы" unit="—" hint="Нижняя граница силы ветра вдоль стола в долях от поперечной." value={p.design.alongMinFraction} onChange={(alongMinFraction) => setDesign({ alongMinFraction })} min={0} max={0.5} step={0.01} />
          <NumberField label="Глубина торцевого силуэта" unit="мм" value={p.design.structuralDepthMm} onChange={(structuralDepthMm) => setDesign({ structuralDepthMm })} min={50} max={1500} step={50} />
        </Grid2>
        <CheckboxField
          label="Монтажный стык прогона считать шарниром"
          hint="Консервативное допущение: бандаж не передаёт изгибающий момент."
          checked={p.design.spliceAsHinge}
          onChange={(spliceAsHinge) => setDesign({ spliceAsHinge })}
        />
      </Section>

      <Section title="Проект" subtitle="наименование и автор">
        <TextField label="Наименование" value={p.meta.name} onChange={(name) => setMeta({ name })} />
        <TextField label="Объект" value={p.meta.object} onChange={(object) => setMeta({ object })} />
        <TextField label="Исполнитель" value={p.meta.author} onChange={(author) => setMeta({ author })} placeholder="ФИО" />
      </Section>
    </div>
  );
}
