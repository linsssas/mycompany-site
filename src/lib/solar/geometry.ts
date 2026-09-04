// Геометрия стола: разрешение связки «угол ↔ высоты стоек ↔ разнос», раскладка
// панелей, положение прогонов и подпорки, координаты узлов плоской рамы.
//
// Система координат рамы: x — горизонтально (0 — ось задней стойки, рост в сторону
// передней/нижней стойки), y — вертикально (0 — уровень земли, вверх положительно).

import { GeometryInput, PanelInput, Warning } from "./types";
import { deg2rad, fmt, rad2deg } from "./units";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PurlinLine {
  index: number;
  /** Координата по скату от нижнего конца балки, мм */
  s: number;
  /** Положение в долях длины панельного поля */
  fraction: number;
  /** Точка на балке */
  point: Vec2;
  /** Грузовая полоса (ширина по скату), мм */
  tributary: number;
  /** Линия лежит в пределах балки */
  onBeam: boolean;
}

export interface DerivedGeometry {
  alphaDeg: number;
  alphaRad: number;
  postSpacing: number;
  rearTopHeight: number;
  frontTopHeight: number;

  /** Длина балки между осями стоек по скату, мм */
  slopeSpan: number;
  /** Полная длина балки с учётом свесов, мм */
  beamLength: number;
  /** Свес балки за переднюю (нижнюю) стойку по скату, мм */
  beamOverhang: number;
  /** Свес балки за заднюю (верхнюю) стойку по скату, мм */
  beamRearOverhang: number;
  /** Нижний и верхний концы балки */
  beamLowerTip: Vec2;
  beamUpperTip: Vec2;
  rearTop: Vec2;
  frontTop: Vec2;
  /** Единичный вектор вдоль балки (вверх по скату) */
  slopeDir: Vec2;

  /** Длина панельного поля по скату, мм */
  panelFieldSlope: number;
  /** Смещение нижней кромки панельного поля от нижнего конца балки, мм */
  panelOffset: number;
  /** Высота нижней/верхней кромки панелей над землёй, мм */
  lowerEdgeHeight: number;
  upperEdgeHeight: number;

  /** Общая длина стола, мм */
  tableLength: number;
  /** Длина панельного поля вдоль стола, мм */
  panelFieldLength: number;
  panelsPerRow: number;
  panelRows: number;
  panelCount: number;
  /** Площадь панелей (по скату), м² */
  panelAreaM2: number;
  /** Площадь горизонтальной проекции панелей, м² */
  projectedAreaM2: number;

  purlins: PurlinLine[];
  /** Грузовая полоса вдоль стола на одну раму, мм */
  frameTributary: number;

  /** Подпорка балки */
  brace: { enabled: boolean; from: Vec2; to: Vec2; length: number; angleDeg: number };

  /** Заглубление, мм */
  embedDepth: number;
  /** Полные длины стоек (с заглублением), мм */
  rearPostLength: number;
  frontPostLength: number;

  warnings: Warning[];
}

/** Разрешение связки «угол ↔ высоты стоек ↔ разнос». */
export function resolveLink(g: GeometryInput): { alphaDeg: number; postSpacing: number; rearTopHeight: number; frontTopHeight: number } {
  const { linkMode } = g;
  if (linkMode === "angle") {
    const alpha = rad2deg(Math.atan2(g.rearTopHeight - g.frontTopHeight, g.postSpacing));
    return { alphaDeg: alpha, postSpacing: g.postSpacing, rearTopHeight: g.rearTopHeight, frontTopHeight: g.frontTopHeight };
  }
  if (linkMode === "heights") {
    const rear = g.frontTopHeight + g.postSpacing * Math.tan(deg2rad(g.tiltDeg));
    return { alphaDeg: g.tiltDeg, postSpacing: g.postSpacing, rearTopHeight: rear, frontTopHeight: g.frontTopHeight };
  }
  // linkMode === "spacing"
  const tan = Math.tan(deg2rad(g.tiltDeg));
  const spacing = tan > 1e-6 ? (g.rearTopHeight - g.frontTopHeight) / tan : g.postSpacing;
  return { alphaDeg: g.tiltDeg, postSpacing: spacing, rearTopHeight: g.rearTopHeight, frontTopHeight: g.frontTopHeight };
}

export function buildGeometry(g: GeometryInput, panel: PanelInput, embedDepth: number): DerivedGeometry {
  const warnings: Warning[] = [];
  const { alphaDeg, postSpacing, rearTopHeight, frontTopHeight } = resolveLink(g);
  const alphaRad = deg2rad(alphaDeg);

  // --- Контроль согласованности геометрии (требование ТЗ) ---
  const alphaFromGeom = rad2deg(Math.atan2(rearTopHeight - frontTopHeight, postSpacing));
  if (Math.abs(alphaFromGeom - g.tiltDeg) > 0.5 && g.linkMode !== "angle") {
    warnings.push({
      severity: "warning",
      scope: "Геометрия",
      message: `Несогласованность: заданный угол ${fmt(g.tiltDeg)}° не соответствует высотам стоек и разносу — atan((${fmt(
        rearTopHeight
      )} − ${fmt(frontTopHeight)}) / ${fmt(postSpacing)}) = ${fmt(alphaFromGeom)}°.`,
    });
  }
  if (alphaDeg <= 0.5) {
    warnings.push({ severity: "warning", scope: "Геометрия", message: "Угол наклона близок к нулю: сток воды и сползание снега не обеспечены." });
  }

  // --- Балка ---
  const slopeSpan = Math.hypot(postSpacing, rearTopHeight - frontTopHeight);
  const rearTop: Vec2 = { x: 0, y: rearTopHeight };
  const frontTop: Vec2 = { x: postSpacing, y: frontTopHeight };
  // Единичный вектор ВВЕРХ по скату (от передней стойки к задней)
  const slopeDir: Vec2 = {
    x: slopeSpan > 0 ? (rearTop.x - frontTop.x) / slopeSpan : -1,
    y: slopeSpan > 0 ? (rearTop.y - frontTop.y) / slopeSpan : 0,
  };
  const beamLowerTip: Vec2 = { x: frontTop.x - slopeDir.x * g.beamOverhang, y: frontTop.y - slopeDir.y * g.beamOverhang };
  const beamUpperTip: Vec2 = { x: rearTop.x + slopeDir.x * g.beamRearOverhang, y: rearTop.y + slopeDir.y * g.beamRearOverhang };
  const beamLength = slopeSpan + g.beamOverhang + g.beamRearOverhang;

  // --- Раскладка панелей ---
  const panelAlongSlope = g.panelOrientation === "portrait" ? panel.length : panel.width;
  const panelAlongTable = g.panelOrientation === "portrait" ? panel.width : panel.length;
  const panelFieldSlope = g.panelRows * panelAlongSlope + Math.max(0, g.panelRows - 1) * g.panelGap;

  const tableLength = Math.max(0, (g.frameCount - 1) * g.framePitch + 2 * g.edgeOverhang);
  const panelsPerRow = Math.max(0, Math.floor((tableLength + g.panelGap) / (panelAlongTable + g.panelGap)));
  const panelFieldLength = panelsPerRow > 0 ? panelsPerRow * panelAlongTable + (panelsPerRow - 1) * g.panelGap : 0;
  const panelCount = panel.countOverride ?? panelsPerRow * g.panelRows;

  const panelOffset =
    g.panelFieldMode === "centered" ? (beamLength - panelFieldSlope) / 2 : g.panelFieldOffset;

  const lowerEdgeHeight = beamLowerTip.y + slopeDir.y * panelOffset;
  const upperEdgeHeight = beamLowerTip.y + slopeDir.y * (panelOffset + panelFieldSlope);

  if (panelOffset < -1) {
    warnings.push({
      severity: "warning",
      scope: "Геометрия",
      message: `Панельное поле по скату (${fmt(panelFieldSlope)} мм) длиннее балки (${fmt(
        beamLength
      )} мм): панели свешиваются за концы балки на ${fmt(-panelOffset)} мм с каждой стороны. Проверьте вылет консоли панели и допуск производителя модуля.`,
    });
  }
  if (lowerEdgeHeight < 0) {
    warnings.push({ severity: "error", scope: "Геометрия", message: "Нижняя кромка панелей ниже уровня земли." });
  }

  const panelAreaM2 = (panelCount * panel.length * panel.width) / 1e6;
  const projectedAreaM2 = panelAreaM2 * Math.cos(alphaRad);

  // --- Линии прогонов ---
  const pcts = normalizePurlinPositions(g.purlinLines, g.purlinPositionsPct);
  const purlins: PurlinLine[] = pcts.map((pct, index) => {
    const s = panelOffset + (pct / 100) * panelFieldSlope;
    return {
      index,
      s,
      fraction: pct / 100,
      point: { x: beamLowerTip.x + slopeDir.x * s, y: beamLowerTip.y + slopeDir.y * s },
      tributary: 0,
      onBeam: s >= -1 && s <= beamLength + 1,
    };
  });
  // Грузовые полосы: половина расстояния до соседей, крайние забирают консольные участки панели
  const fieldStart = panelOffset;
  const fieldEnd = panelOffset + panelFieldSlope;
  purlins.forEach((p, i) => {
    const prevMid = i === 0 ? fieldStart : (purlins[i - 1].s + p.s) / 2;
    const nextMid = i === purlins.length - 1 ? fieldEnd : (purlins[i + 1].s + p.s) / 2;
    p.tributary = Math.max(0, nextMid - prevMid);
  });
  const outside = purlins.filter((p) => !p.onBeam);
  if (outside.length > 0) {
    warnings.push({
      severity: "error",
      scope: "Геометрия",
      message: `Линии прогонов №${outside.map((p) => p.index + 1).join(", ")} выходят за пределы балки — прогон не имеет опоры. Измените положение линий прогонов или длину балки.`,
    });
  }

  // --- Подпорка балки ---
  const braceFrom: Vec2 = { x: 0, y: g.bracePostAttachHeight };
  const braceS = g.beamOverhang + (1 - g.braceBeamPositionPct / 100) * slopeSpan;
  const braceTo: Vec2 = { x: beamLowerTip.x + slopeDir.x * braceS, y: beamLowerTip.y + slopeDir.y * braceS };
  const braceLength = Math.hypot(braceTo.x - braceFrom.x, braceTo.y - braceFrom.y);
  const braceAngle = rad2deg(Math.atan2(braceTo.y - braceFrom.y, braceTo.x - braceFrom.x));

  if (g.braceEnabled && braceLength < 200) {
    warnings.push({ severity: "warning", scope: "Геометрия", message: "Длина подпорки менее 200 мм — проверьте точки крепления." });
  }

  const frameTributary = g.framePitch;

  return {
    alphaDeg,
    alphaRad,
    postSpacing,
    rearTopHeight,
    frontTopHeight,
    slopeSpan,
    beamLength,
    beamOverhang: g.beamOverhang,
    beamRearOverhang: g.beamRearOverhang,
    beamLowerTip,
    beamUpperTip,
    rearTop,
    frontTop,
    slopeDir,
    panelFieldSlope,
    panelOffset,
    lowerEdgeHeight,
    upperEdgeHeight,
    tableLength,
    panelFieldLength,
    panelsPerRow,
    panelRows: g.panelRows,
    panelCount,
    panelAreaM2,
    projectedAreaM2,
    purlins,
    frameTributary,
    brace: {
      enabled: g.braceEnabled,
      from: braceFrom,
      to: braceTo,
      length: braceLength,
      angleDeg: braceAngle,
    },
    embedDepth,
    rearPostLength: rearTopHeight + embedDepth,
    frontPostLength: frontTopHeight + embedDepth,
    warnings,
  };
}

/** Приведение списка положений прогонов к нужному количеству линий. */
export function normalizePurlinPositions(lines: number, pcts: number[]): number[] {
  const n = Math.max(1, Math.round(lines));
  const list = (pcts ?? []).slice(0, n).map((v) => Math.max(0, Math.min(100, v)));
  while (list.length < n) {
    // Равномерная раскладка по умолчанию
    const i = list.length;
    list.push(((i + 0.5) / n) * 100);
  }
  return list.sort((a, b) => a - b);
}

/** Температурное удлинение стола: ΔL = α·ΔT·L (α = 12·10⁻⁶ 1/°C). */
export function thermalElongation(lengthMm: number, deltaT: number, alphaT = 12e-6): number {
  return alphaT * deltaT * lengthMm;
}
