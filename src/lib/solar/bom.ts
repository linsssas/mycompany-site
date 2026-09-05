// Спецификация металла и экономика.
// Погонная масса профиля = площадь сечения × плотность (площадь считается по средней
// линии развёртки с поправкой на скругления, см. sections.ts).

import { DerivedGeometry } from "./geometry";
import { SectionProps } from "./sections";
import { MemberRole, SectionDef, SolarProject } from "./types";
import { fmt } from "./units";

export interface BomItem {
  pos: number;
  zone: string;
  name: string;
  profile: string;
  /** Длина одной детали, мм */
  length: number;
  count: number;
  /** Погонная масса, кг/м */
  massPerM: number;
  /** Масса одной детали, кг */
  massEach: number;
  /** Масса позиции, кг */
  massTotal: number;
  coating: string;
  note: string;
}

export interface BomResult {
  items: BomItem[];
  /** Масса профилей, кг */
  steelMass: number;
  /** Масса с учётом коэффициента на крепёж и мелочёвку, кг */
  steelMassWithFasteners: number;
  /** Масса панелей, кг */
  panelMass: number;
  /** Общая масса стола, кг */
  totalMass: number;
  /** Установленная мощность, кВт */
  powerKW: number;
  /** Металл на 1 кВт, кг/кВт */
  massPerKW: number;
  /** Металл на 1 м² панелей, кг/м² */
  massPerM2: number;
  /** Стоимость металла, ден. ед. */
  steelCost: number;
  costPerKW: number;
  /** Коэффициент масштабирования при ручном вводе массы */
  manualScale: number;
  /** Погонный вес элементов рамы (Н/мм) по ролям — для расчётной схемы */
  selfWeightLine: Record<string, number>;
  /** Вес панелей и прогонов, приходящийся на 1 м² ската, Н/мм² */
  panelPressure: number;
  purlinPressure: number;
}

const G = 9.80665; // м/с²

export function buildBom(project: SolarProject, geom: DerivedGeometry, sections: Record<MemberRole, SectionProps>): BomResult {
  const { geometry: g, panel, selfWeight, economics } = project;
  const items: BomItem[] = [];
  let pos = 1;

  const add = (
    zone: string,
    name: string,
    def: SectionDef | null,
    sec: SectionProps | null,
    length: number,
    count: number,
    note = "",
    explicitMassEach?: number
  ) => {
    const massPerM = sec ? sec.massPerM : 0;
    const massEach = explicitMassEach ?? (massPerM * length) / 1000;
    items.push({
      pos: pos++,
      zone,
      name,
      profile: def ? def.name : "—",
      length,
      count,
      massPerM,
      massEach,
      massTotal: massEach * count,
      coating: def ? def.coating : "—",
      note,
    });
  };

  const n = g.frameCount;
  add("Рама", "Стойка задняя (высокая)", project.sections.rearPost, sections.rearPost, geom.rearPostLength, n, `заглубление ${fmt(geom.embedDepth)} мм`);
  add("Рама", "Стойка передняя (низкая)", project.sections.frontPost, sections.frontPost, geom.frontPostLength, n, `заглубление ${fmt(geom.embedDepth)} мм`);
  add("Рама", "Балка (стропило)", project.sections.beam, sections.beam, geom.beamLength, n, `свес ${fmt(g.beamOverhang)} мм`);
  if (g.braceEnabled) {
    add("Рама", "Подпорка балки (раскос)", project.sections.brace, sections.brace, geom.brace.length, n);
    // Пластина для подпорки: лист 4 мм, 150×150 мм (типовой размер узла)
    const plateArea = 150 * 150; // мм²
    const plateMass = (plateArea * 4 * 7850) / 1e9;
    add("Рама", "Пластина для подпорки", null, null, 150, n, "лист HDZ 4,0 мм, 150×150", plateMass);
  }

  // Прогоны: число секций по длине стола
  const sectionsPerLine = g.purlinSectionLength > 0 ? Math.ceil(geom.tableLength / g.purlinSectionLength) : 1;
  const purlinCount = g.purlinLines * sectionsPerLine;
  add("Покрытие", "Прогон", project.sections.purlin, sections.purlin, g.purlinSectionLength, purlinCount, `${g.purlinLines} линии × ${sectionsPerLine} секций`);

  // Бандажи стыков
  const spliceCount = g.purlinLines * Math.max(0, sectionsPerLine - 1);
  if (spliceCount > 0) {
    add("Покрытие", "Бандаж стыка прогонов", project.sections.purlin, sections.purlin, 370, spliceCount, "накладка на монтажном стыке");
  }

  // Ветровые связи
  const windBraceLength = Math.hypot(g.framePitch, geom.rearTopHeight);
  add("Связи", "Связь ветровая", project.sections.windBrace, sections.windBrace, windBraceLength, 4, "по торцам стола");

  const steelMass = items.reduce((a, i) => a + i.massTotal, 0);
  const manualScale = selfWeight.mode === "manual" && steelMass > 0 ? selfWeight.manualMassKg / steelMass : 1;
  const steelMassWithFasteners = steelMass * manualScale * selfWeight.fastenerFactor;

  const panelMass = geom.panelCount * panel.mass;
  const totalMass = steelMassWithFasteners + panelMass;
  const powerKW = (geom.panelCount * panel.powerW) / 1000;
  const massPerKW = powerKW > 0 ? steelMassWithFasteners / powerKW : 0;
  const massPerM2 = geom.panelAreaM2 > 0 ? steelMassWithFasteners / geom.panelAreaM2 : 0;
  const steelCost = steelMassWithFasteners * economics.steelPricePerKg;

  // ---- Нагрузки от собственного веса для расчётной схемы ----
  // Погонный вес элементов рамы, Н/мм
  const lineWeight = (sec: SectionProps) => (sec.massPerM * G * manualScale * selfWeight.fastenerFactor) / 1000;
  const selfWeightLine: Record<string, number> = {
    rearPost: lineWeight(sections.rearPost),
    rearPostEmbedded: lineWeight(sections.rearPost),
    frontPost: lineWeight(sections.frontPost),
    frontPostEmbedded: lineWeight(sections.frontPost),
    beam: lineWeight(sections.beam),
    brace: g.braceEnabled ? lineWeight(sections.brace) : 0,
    jointRear: 0,
    jointFront: 0,
  };

  // Давление от панелей на плоскость ската, Н/мм²
  const panelAreaMm2 = geom.panelCount * panel.length * panel.width;
  const panelPressure = panelAreaMm2 > 0 ? (geom.panelCount * panel.mass * G) / panelAreaMm2 : 0;
  // Вес прогонов, приведённый к площади ската
  const purlinTotalWeightN = sections.purlin.massPerM * G * ((purlinCount * g.purlinSectionLength) / 1000);
  const purlinPressure = panelAreaMm2 > 0 ? (purlinTotalWeightN * manualScale * selfWeight.fastenerFactor) / panelAreaMm2 : 0;

  return {
    items,
    steelMass,
    steelMassWithFasteners,
    panelMass,
    totalMass,
    powerKW,
    massPerKW,
    massPerM2,
    steelCost,
    costPerKW: powerKW > 0 ? steelCost / powerKW : 0,
    manualScale,
    selfWeightLine,
    panelPressure,
    purlinPressure,
  };
}

/** Ведомость метизов: потребное и фактическое количество болтов. */
export interface FastenerRow {
  d: number;
  required: number;
  drawing: number;
  utilization: number;
  note: string;
}

export function buildFastenerSummary(
  required: { d: number; count: number }[],
  drawing: { d: number; count: number }[]
): FastenerRow[] {
  const diameters = [...new Set([...required.map((r) => r.d), ...drawing.map((d) => d.d)])].sort((a, b) => a - b);
  return diameters.map((d) => {
    const req = required.filter((r) => r.d === d).reduce((a, r) => a + r.count, 0);
    const drw = drawing.find((x) => x.d === d)?.count ?? 0;
    return {
      d,
      required: req,
      drawing: drw,
      utilization: drw > 0 ? req / drw : req > 0 ? 99 : 0,
      note: drw === 0 ? "Нет данных по чертежу" : req > drw ? "Требуется больше, чем заложено по чертежу" : "",
    };
  });
}
