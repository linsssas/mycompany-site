import { ClimateData, GeometryInput, NormCode } from "./types";
import { GeometryModel } from "./geometry";

export interface SnowLoadResult {
  s0: number; // кПа — нормативный вес снегового покрова земли
  mu: number; // коэффициент формы (перехода от веса снег. покрова земли к нагрузке на покрытие)
  ce: number; // коэффициент сноса снега (открытость местности)
  ct: number; // термический коэффициент
  gammaF: number; // коэффициент надежности по нагрузке
  sg: number; // кПа — нормативная снеговая нагрузка на покрытие
  sd: number; // кПа — расчетная снеговая нагрузка на покрытие
  purlinLineLoad: number; // кН/м — на прогон
  beamLineLoad: number; // кН/м — на балку (по фронту рамы)
  postForce: number; // кН — на одну стойку
  formulas: string[];
}

/** Коэффициент формы покрытия mu по углу наклона ската (однопролетная схема, аналог СП РК/СНиП 2.01.07-85*, Прил. 3, схема 1) */
export function shapeCoefficient(alphaDeg: number): number {
  const a = Math.abs(alphaDeg);
  if (a <= 25) return 1.0;
  if (a >= 60) return 0.0;
  return (60 - a) / 35;
}

export function calcSnowLoad(
  g: GeometryInput,
  geom: GeometryModel,
  climate: ClimateData,
  norm: NormCode
): SnowLoadResult {
  const mu = shapeCoefficient(g.tiltAngle);
  const ce = climate.terrainCategory === "A" ? 0.85 : 1.0;
  const ct = 1.0;
  const gammaF = norm === "ASCE7" ? 1.0 : 1.4; // ASCE7 использует LRFD-факторы в комбинациях, а не здесь

  const sg = climate.s0 * mu * ce * ct;
  const sd = sg * gammaF;

  // Ширина грузовой полосы на прогон (по скату, между соседними прогонами), м
  const purlinRows = Math.max(1, g.panelRowCount + 1);
  const tributaryWidthM = g.totalWidth / 1000 / Math.max(1, purlinRows - 1);
  const purlinLineLoad = sd * tributaryWidthM; // кН/м (кПа*м = кН/м, на горизонтальную проекцию)

  // Нагрузка на балку рамы: грузовая полоса = полшага рам слева + полшага справа
  const spacingM = geom.frameXPositions.length > 1 ? (geom.frameXPositions[1] - geom.frameXPositions[0]) / 1000 : g.totalLength / 1000;
  const beamLineLoad = sd * spacingM;

  // Полная снеговая нагрузка на раму -> делится поровну между передней и задней стойкой
  const totalWidthM = g.totalWidth / 1000;
  const frameSnowForce = sd * totalWidthM * spacingM; // кН
  const postForce = frameSnowForce / 2;

  return {
    s0: climate.s0,
    mu,
    ce,
    ct,
    gammaF,
    sg,
    sd,
    purlinLineLoad,
    beamLineLoad,
    postForce,
    formulas: [
      "Sg = S0 · μ · Ce · Ct — нормативная снеговая нагрузка на покрытие",
      "Sd = Sg · γf — расчетная снеговая нагрузка, γf = 1.4",
      "μ(α): α≤25° → 1.0; 25°<α<60° → (60−α)/35; α≥60° → 0",
      "q_прогон = Sd · b_груз — распределенная нагрузка на прогон, b_груз — грузовая ширина",
      "q_балка = Sd · L_шаг_рам — линейная нагрузка на балку рамы",
      "N_стойка = Sd · B · L_шаг_рам / 2 — сосредоточенная сила на стойку",
    ],
  };
}
