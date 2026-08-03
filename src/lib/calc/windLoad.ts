import { ClimateData, GeometryInput, NormCode } from "./types";
import { PanelDerived } from "./types";

export type WindDirection = "0" | "45" | "90" | "180" | "below" | "above";

export const WIND_DIRECTIONS: { key: WindDirection; label: string }[] = [
  { key: "0", label: "0° (по скату, спереди)" },
  { key: "45", label: "45° (косой)" },
  { key: "90", label: "90° (вдоль торца)" },
  { key: "180", label: "180° (сзади)" },
  { key: "below", label: "Ветер снизу (отрыв)" },
  { key: "above", label: "Ветер сверху (прижим)" },
];

/**
 * Индикативные суммарные аэродинамические коэффициенты cp,net для открытой (навесной)
 * панельной конструкции солнечной электростанции, по аналогии с методикой для навесов/козырьков
 * (EN 1991-1-4, Table 7.7 "Canopy roofs"; СП РК/СНиП 2.01.07-85* Прил. 4).
 * Знак: положительный — подъемная сила (отсос снизу вверх), отрицательный — прижимающее давление.
 * ВНИМАНИЕ: значения ориентировочные для предварительного расчета, для окончательного проекта
 * необходима верификация по действующим нормам/продувкам.
 */
const CP_NET: Record<WindDirection, number> = {
  "0": 1.4,
  "45": 1.1,
  "90": 0.9,
  "180": -1.0,
  below: 1.6,
  above: -0.8,
};

/** Коэффициент k(ze), учитывающий изменение ветрового давления по высоте и типу местности (табличная аппроксимация СНиП/СП РК табл. 6) */
export function terrainCoefficient(zeM: number, category: "A" | "B" | "C"): number {
  const table: Record<"A" | "B" | "C", [number, number][]> = {
    A: [[5, 0.75], [10, 1.0], [20, 1.25], [40, 1.5], [60, 1.7], [80, 1.85], [100, 2.0]],
    B: [[5, 0.5], [10, 0.65], [20, 0.85], [40, 1.1], [60, 1.3], [80, 1.45], [100, 1.6]],
    C: [[5, 0.4], [10, 0.4], [20, 0.55], [40, 0.8], [60, 1.0], [80, 1.15], [100, 1.25]],
  };
  const pts = table[category];
  const z = Math.max(pts[0][0], zeM);
  for (let i = 0; i < pts.length - 1; i++) {
    const [z1, k1] = pts[i];
    const [z2, k2] = pts[i + 1];
    if (z >= z1 && z <= z2) {
      return k1 + ((k2 - k1) * (z - z1)) / (z2 - z1);
    }
  }
  return pts[pts.length - 1][1];
}

export interface WindDirectionResult {
  direction: WindDirection;
  label: string;
  ze: number; // м — расчетная высота
  k: number; // коэффициент по высоте/местности
  w: number; // кПа — нормативное давление
  wd: number; // кПа — расчетное давление
  cNet: number;
  pressure: number; // кПа, прижимающая составляющая (>=0)
  suction: number; // кПа, отсасывающая/подъемная составляющая (>=0)
  horizontalForce: number; // кН
  verticalForce: number; // кН, положительная = подъем (вверх)
  overturningMoment: number; // кН·м
}

export interface WindLoadResult {
  gammaF: number;
  directions: WindDirectionResult[];
  worst: WindDirectionResult;
  formulas: string[];
}

export function calcWindLoad(
  g: GeometryInput,
  panels: PanelDerived,
  climate: ClimateData,
  norm: NormCode
): WindLoadResult {
  const gammaF = norm === "ASCE7" ? 1.0 : 1.4;
  const tiltRad = (g.tiltAngle * Math.PI) / 180;
  const ze = Math.max(g.frontPostHeight, g.rearPostHeight) / 1000;
  const areaM2 = panels.totalAreaM2 > 0 ? panels.totalAreaM2 : (g.totalLength / 1000) * (g.totalWidth / 1000);
  const avgHeightM = (g.frontPostHeight + g.rearPostHeight) / 2 / 1000;
  const widthM = g.totalWidth / 1000;

  const directions: WindDirectionResult[] = WIND_DIRECTIONS.map(({ key, label }) => {
    const k = terrainCoefficient(ze, climate.terrainCategory);
    const w = climate.w0 * k;
    const wd = w * gammaF;
    const cNet = CP_NET[key];
    const fn = wd * areaM2 * Math.abs(cNet); // кН, суммарная сила по нормали к плоскости панелей

    let horizontalForce: number;
    let verticalForce: number;

    if (key === "90") {
      // Ветер вдоль торца — преимущественно горизонтальная составляющая на профиль конструкции
      horizontalForce = fn;
      verticalForce = 0;
    } else {
      horizontalForce = fn * Math.sin(tiltRad);
      verticalForce = cNet > 0 ? fn * Math.cos(tiltRad) : -fn * Math.cos(tiltRad);
    }

    const overturningMoment = Math.abs(horizontalForce) * avgHeightM + Math.abs(verticalForce) * (widthM / 2);

    return {
      direction: key,
      label,
      ze,
      k,
      w,
      wd,
      cNet,
      pressure: cNet < 0 ? wd * Math.abs(cNet) : 0,
      suction: cNet > 0 ? wd * Math.abs(cNet) : 0,
      horizontalForce,
      verticalForce,
      overturningMoment,
    };
  });

  const worst = directions.reduce((a, b) => (b.overturningMoment > a.overturningMoment ? b : a));

  return {
    gammaF,
    directions,
    worst,
    formulas: [
      "w = w0 · k(ze) — нормативное ветровое давление на высоте ze",
      "wd = w · γf — расчетное давление, γf = 1.4",
      "Fn = wd · A · |cp,net| — суммарная сила нормально к плоскости панелей",
      "Fh = Fn · sin(α); Fv = ±Fn · cos(α) — горизонтальная и вертикальная составляющие",
      "M_опр = Fh · Hср + Fv · B/2 — момент опрокидывания относительно центра опорного контура",
    ],
  };
}
