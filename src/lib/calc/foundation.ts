import { FoundationType } from "./types";

export interface FoundationInput {
  N: number; // кН, вертикальная (+ сжатие, - отрыв)
  M: number; // кН·м, опрокидывающий момент у подошвы
  V: number; // кН, горизонтальная (сдвигающая)
  soilBearingCapacity: number; // кПа, R0 расчетное сопротивление грунта
  frictionCoefficient: number; // коэффициент трения подошвы о грунт
  frostDepthM: number; // м, глубина промерзания
  foundationType: FoundationType;
}

export interface FoundationResult {
  widthM: number;
  lengthM: number;
  depthM: number;
  weightKN: number;
  bearingPressureMax: number; // кПа
  bearingPressureMin: number;
  bearingOk: boolean;
  overturningFactor: number;
  overturningOk: boolean;
  slidingFactor: number;
  slidingOk: boolean;
  recommendedType: FoundationType;
  recommendedTypeNote: string;
  formulas: string[];
}

const CONCRETE_DENSITY = 24; // кН/м³
const MIN_SAFETY_OVERTURNING = 1.5;
const MIN_SAFETY_SLIDING = 1.5;

/** Подбор минимального размера квадратного фундамента методом последовательных приближений */
export function designFoundation(input: FoundationInput): FoundationResult {
  const { N, M, V, soilBearingCapacity, frictionCoefficient, frostDepthM } = input;
  const depthM = Math.max(0.5, frostDepthM);

  let B = 0.6;
  let result: Omit<FoundationResult, "recommendedType" | "recommendedTypeNote" | "formulas"> | null = null;

  for (let i = 0; i < 200; i++) {
    const L = B;
    const A = B * L;
    const W = (L * B * B) / 6;
    const weightKN = A * depthM * CONCRETE_DENSITY;
    const Ntot = Math.max(0, N) + weightKN;

    const sigmaAvg = Ntot / A;
    const sigmaM = W > 0 ? M / W : 0;
    const bearingPressureMax = sigmaAvg + sigmaM;
    const bearingPressureMin = sigmaAvg - sigmaM;

    const resistingMoment = Ntot * (B / 2);
    const overturningFactor = M > 0 ? resistingMoment / M : Infinity;
    const resistingShear = Ntot * frictionCoefficient;
    const slidingFactor = Math.abs(V) > 0 ? resistingShear / Math.abs(V) : Infinity;

    const bearingOk = bearingPressureMax <= soilBearingCapacity && bearingPressureMin >= -1e-6;
    const overturningOk = overturningFactor >= MIN_SAFETY_OVERTURNING;
    const slidingOk = slidingFactor >= MIN_SAFETY_SLIDING;

    result = {
      widthM: B,
      lengthM: L,
      depthM,
      weightKN,
      bearingPressureMax,
      bearingPressureMin,
      bearingOk,
      overturningFactor,
      overturningOk,
      slidingFactor,
      slidingOk,
    };

    if (bearingOk && overturningOk && slidingOk) break;
    B += 0.1;
    if (B > 4) break;
  }

  let recommendedType: FoundationType = input.foundationType;
  let recommendedTypeNote = "";
  const upliftDominant = N < 0 && Math.abs(N) > 0.3 * Math.abs(M / Math.max(0.5, result?.widthM ?? 1));
  if (upliftDominant) {
    recommendedType = "pile";
    recommendedTypeNote = "Преобладает отрывающее усилие (ветровой подъем) — рекомендуются свайные/винтовые опоры, работающие на выдергивание.";
  } else if (soilBearingCapacity < 100) {
    recommendedType = "pile";
    recommendedTypeNote = "Низкая несущая способность грунта — рекомендуются свайные фундаменты.";
  } else if ((result?.widthM ?? 0) <= 1.0) {
    recommendedType = "concrete_block";
    recommendedTypeNote = "Умеренные нагрузки и достаточная несущая способность грунта — допустимы сборные бетонные блоки/забивные стойки.";
  } else {
    recommendedType = "monolithic";
    recommendedTypeNote = "Значительные нагрузки — рекомендуется монолитный железобетонный фундамент.";
  }

  return {
    ...(result as Omit<FoundationResult, "recommendedType" | "recommendedTypeNote" | "formulas">),
    recommendedType,
    recommendedTypeNote,
    formulas: [
      "σmax,min = N/A ± M/W — краевое давление на грунт под подошвой фундамента",
      "A = B·L, W = L·B²/6 — площадь и момент сопротивления подошвы",
      "k_опр = M_удерж / M_опрокид ≥ 1.5 — коэффициент устойчивости на опрокидывание",
      "k_сдвиг = N·f / V ≥ 1.5 — коэффициент устойчивости на сдвиг, f — коэффициент трения подошвы",
      "Глубина заложения ≥ глубины промерзания грунта для данного района",
    ],
  };
}
