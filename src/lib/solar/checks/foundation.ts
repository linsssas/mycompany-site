// Стойка в грунте: горизонтальная несущая способность (метод Бромса), выдёргивание,
// вдавливание, морозное пучение.
//
// Единицы на входе: мм, Н, Н·мм; характеристики грунта — °, кПа, кН/м³.
// Внутри метода Бромса удобнее работать в метрах и кН.

import { GroundInput, MaterialInput, StatusColor, statusOf, Warning } from "../types";
import { CheckRow } from "./member";
import { fmt } from "../units";

export interface FoundationInput {
  ground: GroundInput;
  /** Ширина/диаметр элемента, воспринимающего отпор грунта, мм */
  width: number;
  /** Наибольшая сжимающая (вдавливающая) сила в основании, Н, ≥ 0 */
  Ncompression: number;
  /** Наибольшая выдёргивающая сила, Н, ≥ 0 */
  Nuplift: number;
  /** Горизонтальная сила на уровне земли, Н */
  H: number;
  /** Момент на уровне земли, Н·мм */
  M: number;
  /** Вес стойки и приходящейся на неё конструкции (постоянная нагрузка, благоприятная), Н */
  deadWeight: number;
  material: MaterialInput;
  combo: string;
}

export interface FoundationResult {
  /** Предельная горизонтальная сила по Бромсу, кН */
  Hu: number;
  /** Коэффициент использования по горизонтальной силе */
  lateralUtilization: number;
  /** Потребная глубина заглубления при заданной нагрузке, мм */
  requiredDepth: number;
  /** Несущая способность на выдёргивание, кН */
  upliftCapacity: number;
  upliftDemand: number;
  upliftSafety: number;
  /** Давление под нижним концом, кПа */
  bearingPressure: number;
  bearingUtilization: number;
  rows: CheckRow[];
  warnings: Warning[];
  /** Данные для графика «коэффициент запаса — глубина» */
  depthChart: { depthMm: number; lateralUtil: number; upliftSafety: number }[];
  /** Потребное заглубление по типам грунта (для графика) */
  soilChart: { soil: string; requiredDepthMm: number }[];
  details: string[];
}

/**
 * Предельная горизонтальная сила для короткой сваи со свободной головой (метод Бромса).
 * Песок: Hu = 0,5·γ·D·L³·Kp / (e + L)
 * Глина: решается из равновесия при эпюре отпора 9·cu·D ниже глубины 1,5·D.
 * Все величины в кН и м.
 */
export function bromsLateralCapacity(
  soilType: "sand" | "clay",
  phiDeg: number,
  cKPa: number,
  gammaKNm3: number,
  D: number,
  L: number,
  e: number,
  withDetails = true
): { Hu: number; details: string[] } {
  const details: string[] = [];
  if (L <= 0 || D <= 0) return { Hu: 0, details };

  if (soilType === "sand") {
    const Kp = Math.pow(Math.tan(Math.PI / 4 + (phiDeg * Math.PI) / 360), 2);
    const Hu = (0.5 * gammaKNm3 * D * Math.pow(L, 3) * Kp) / (e + L);
    if (!withDetails) return { Hu, details };
    details.push(
      `Kp = tan²(45° + φ/2) = tan²(45° + ${fmt(phiDeg)}/2) = ${fmt(Kp)}`,
      `Hu = 0,5·γ·D·L³·Kp/(e + L) = 0,5·${fmt(gammaKNm3)}·${fmt(D)}·${fmt(L)}³·${fmt(Kp)}/(${fmt(e)} + ${fmt(
        L
      )}) = ${fmt(Hu)} кН`
    );
    return { Hu, details };
  }

  // Связный грунт: cu ≈ c (недренированное сцепление)
  const cu = Math.max(cKPa, 1);
  // Неизвестное Hu ищем итерационно: сопротивление 9·cu·D действует ниже 1,5·D
  const f = (Hu: number) => {
    const fLen = Hu / (9 * cu * D); // длина участка положительного отпора
    const g = L - 1.5 * D - fLen;
    if (g <= 0) return -Infinity;
    const Mmax = Hu * (e + 1.5 * D + 0.5 * fLen);
    const Mres = 2.25 * D * g * g * cu;
    return Mres - Mmax;
  };
  let lo = 0.001;
  let hi = 9 * cu * D * L;
  if (f(lo) < 0) return { Hu: 0, details: ["Длина заглубления недостаточна для образования отпора грунта"] };
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) lo = mid;
    else hi = mid;
  }
  const Hu = lo;
  if (!withDetails) return { Hu, details };
  const fLen = Hu / (9 * cu * D);
  details.push(
    `cu = ${fmt(cu)} кПа, отпор 9·cu·D действует ниже глубины 1,5·D = ${fmt(1.5 * D)} м`,
    `f = Hu/(9·cu·D) = ${fmt(fLen)} м; Mmax = Hu·(e + 1,5D + 0,5f)`,
    `Hu = ${fmt(Hu)} кН (из условия Mmax = 2,25·D·g²·cu)`
  );
  return { Hu, details };
}

/** Несущая способность на выдёргивание: вес стойки + вес бетона + вес грунта в конусе + трение. */
export function upliftCapacity(
  ground: GroundInput,
  widthMm: number,
  depthMm: number,
  deadWeightN: number,
  concreteDensityKNm3 = 24,
  withDetails = true
): { capacityKN: number; details: string[] } {
  const details: string[] = [];
  const L = depthMm / 1000;
  const D = widthMm / 1000;
  const concreted = ground.foundationType === "concreted" || ground.foundationType === "footing";

  // Вес бетона
  const Vconc = concreted ? Math.PI * Math.pow(D / 2, 2) * L : 0;
  const Wconc = Vconc * concreteDensityKNm3;

  // Вес грунта в конусе выпора: усечённый конус с полууглом β = φ/3
  const beta = ((ground.phi / 3) * Math.PI) / 180;
  const rTop = D / 2 + L * Math.tan(beta);
  const Vcone = ((Math.PI * L) / 3) * (Math.pow(rTop, 2) + rTop * (D / 2) + Math.pow(D / 2, 2)) - Vconc;
  const Wsoil = Math.max(0, Vcone) * ground.gamma;

  // Трение по боковой поверхности: F = K0·γ·(L²/2)·tanδ·P
  const K0 = Math.max(0.3, 1 - Math.sin((ground.phi * Math.PI) / 180));
  const delta = ((2 / 3) * ground.phi * Math.PI) / 180;
  const perimeter = concreted ? Math.PI * D : 4 * D;
  const Ffric = K0 * ground.gamma * ((L * L) / 2) * Math.tan(delta) * perimeter;
  // Для связных грунтов добавляется адгезия
  const adhesion = ground.c > 0 ? 0.5 * ground.c * perimeter * L : 0;

  const Wsteel = deadWeightN / 1000;
  const capacity = Wconc + Wsoil + Ffric + adhesion + Wsteel;

  // Пояснения формируются только для итогового расчёта: функция вызывается сотни раз
  // при подборе потребного заглубления и построении графиков.
  if (!withDetails) return { capacityKN: capacity, details };

  details.push(
    `Вес стали и конструкции: ${fmt(Wsteel)} кН`,
    concreted ? `Вес бетона: V = ${fmt(Vconc)} м³ → ${fmt(Wconc)} кН` : "Бетонирование не применяется",
    `Вес грунта в конусе выпора (β = φ/3 = ${fmt(ground.phi / 3)}°): V = ${fmt(Math.max(0, Vcone))} м³ → ${fmt(
      Wsoil
    )} кН`,
    `Трение по боковой поверхности: K0 = ${fmt(K0)}, δ = 2φ/3 = ${fmt((2 / 3) * ground.phi)}° → ${fmt(Ffric)} кН`,
    ground.c > 0 ? `Адгезия по боковой поверхности: ${fmt(adhesion)} кН` : "Адгезия не учитывается (несвязный грунт)",
    `Итого R_выдёрг = ${fmt(capacity)} кН`
  );

  return { capacityKN: capacity, details };
}

export function checkFoundation(input: FoundationInput): FoundationResult {
  const { ground, width, Ncompression, Nuplift, H, M, deadWeight, combo } = input;
  const warnings: Warning[] = [];
  const rows: CheckRow[] = [];
  const details: string[] = [];

  const L = ground.embedDepth / 1000; // м
  const D = (ground.foundationType === "concreted" || ground.foundationType === "footing"
    ? ground.concreteDia
    : width) / 1000; // м
  const Hk = Math.abs(H) / 1000; // кН
  const Mk = Math.abs(M) / 1e6; // кН·м
  // Эксцентриситет приложения горизонтальной силы (приведение момента к силе)
  const e = Hk > 1e-6 ? Mk / Hk : 0;

  const soilType: "sand" | "clay" = ground.nh > 0 && ground.c < 10 ? "sand" : "clay";
  const broms = bromsLateralCapacity(soilType, ground.phi, ground.c, ground.gamma, D, L, e);
  details.push(...broms.details);

  // Коэффициент запаса по Бромсу принимается 2,0 (обычная практика для метода)
  const bromsSafety = 2.0;
  const HRd = broms.Hu / bromsSafety;
  const lateralUtil = HRd > 0 ? Hk / HRd : Hk > 0 ? 99 : 0;

  rows.push({
    id: "found-lateral",
    member: "Стойка в грунте",
    role: "foundation",
    check: "Горизонтальная несущая способность (метод Бромса)",
    Ed: Hk,
    Rd: HRd,
    unit: "кН",
    utilization: lateralUtil,
    status: statusOf(lateralUtil),
    combo,
    variant: "—",
    ref: `Broms (1964), короткая свая со свободной головой, ${soilType === "sand" ? "несвязный" : "связный"} грунт; коэффициент запаса ${bromsSafety}`,
    formula: soilType === "sand" ? "Hu = 0,5·γ·D·L³·Kp/(e + L)" : "Hu из условия Mmax = 2,25·D·g²·cu",
    substitution: `Hu = ${fmt(broms.Hu)} кН → H_Rd = ${fmt(HRd)} кН при e = ${fmt(e)} м`,
  });

  // --- Выдёргивание ---
  const uplift = upliftCapacity(ground, D * 1000, ground.embedDepth, deadWeight);
  details.push(...uplift.details);
  const upliftDemand = Math.max(0, Nuplift) / 1000; // кН
  const upliftSafety = upliftDemand > 1e-6 ? uplift.capacityKN / upliftDemand : Infinity;
  const upliftUtil = upliftDemand > 1e-6 ? (upliftDemand * ground.upliftSafetyFactor) / uplift.capacityKN : 0;

  rows.push({
    id: "found-uplift",
    member: "Стойка в грунте",
    role: "foundation",
    check: "Выдёргивание (ветровой подъём)",
    Ed: upliftDemand,
    Rd: uplift.capacityKN / ground.upliftSafetyFactor,
    unit: "кН",
    utilization: upliftUtil,
    status: statusOf(upliftUtil),
    combo,
    variant: "—",
    ref: "Вес стойки + вес бетона + вес грунта в конусе выпора + трение по боковой поверхности",
    formula: `R_выд/F_выд ≥ ${ground.upliftSafetyFactor}`,
    substitution: `${fmt(uplift.capacityKN)} / ${fmt(upliftDemand)} = ${
      isFinite(upliftSafety) ? fmt(upliftSafety) : "∞"
    } (требуется ≥ ${ground.upliftSafetyFactor})`,
  });

  // --- Вдавливание ---
  const baseAreaM2 =
    ground.foundationType === "concreted" || ground.foundationType === "footing"
      ? Math.PI * Math.pow(D / 2, 2)
      : (width / 1000) * (width / 1000);
  const compression = Math.max(0, Ncompression) / 1000; // кН
  // Для забивной стойки лобовое сопротивление под торцом мало: основная часть нагрузки
  // передаётся трением по боковой поверхности. Несущая способность на вдавливание
  // принимается как R·A + трение (то же трение, что и при выдёргивании).
  const bearingCapacityKN = ground.R * baseAreaM2 + (uplift.capacityKN - deadWeight / 1000) * 0.7;
  const bearingPressure = baseAreaM2 > 0 ? compression / baseAreaM2 : 0; // кПа
  const bearingUtil = bearingCapacityKN > 0 ? compression / bearingCapacityKN : 0;
  rows.push({
    id: "found-bearing",
    member: "Стойка в грунте",
    role: "foundation",
    check: "Вдавливание",
    Ed: compression,
    Rd: bearingCapacityKN,
    unit: "кН",
    utilization: bearingUtil,
    status: statusOf(bearingUtil),
    combo,
    variant: "—",
    ref: "СП РК 5.01-102 / СП 22.13330: лобовое сопротивление R·A + трение по боковой поверхности (0,7 от расчёта на выдёргивание)",
    formula: "N ≤ R·A + F_трения",
    substitution: `${fmt(compression)} кН ≤ ${fmt(ground.R)}·${fmt(baseAreaM2)} + ${fmt(
      (uplift.capacityKN - deadWeight / 1000) * 0.7
    )} = ${fmt(bearingCapacityKN)} кН (давление под торцом ${fmt(bearingPressure)} кПа)`,
  });

  // --- Морозное пучение ---
  if (ground.embedDepth / 1000 < ground.frostDepthM) {
    warnings.push({
      severity: "error",
      scope: "Фундамент",
      message: `Заглубление ${fmt(ground.embedDepth)} мм МЕНЬШЕ нормативной глубины промерзания ${fmt(
        ground.frostDepthM * 1000
      )} мм. В пучинистых грунтах это приводит к выдавливанию стоек и перекосу стола. Требуется заглубление ниже границы промерзания либо мероприятия против пучения.`,
    });
  }

  // --- Потребное заглубление ---
  const requiredDepth = findRequiredDepth(input, D * 1000);

  // --- Данные для графиков ---
  const depthChart: FoundationResult["depthChart"] = [];
  for (let d = 600; d <= 3000; d += 100) {
    const g2: GroundInput = { ...ground, embedDepth: d };
    const b2 = bromsLateralCapacity(soilType, ground.phi, ground.c, ground.gamma, D, d / 1000, e, false);
    const u2 = upliftCapacity(g2, D * 1000, d, deadWeight, 24, false);
    const HRd2 = b2.Hu / bromsSafety;
    depthChart.push({
      depthMm: d,
      lateralUtil: HRd2 > 0 ? Hk / HRd2 : 99,
      upliftSafety: upliftDemand > 1e-6 ? u2.capacityKN / upliftDemand : 10,
    });
  }

  return {
    Hu: broms.Hu,
    lateralUtilization: lateralUtil,
    requiredDepth,
    upliftCapacity: uplift.capacityKN,
    upliftDemand,
    upliftSafety,
    bearingPressure,
    bearingUtilization: bearingUtil,
    rows,
    warnings,
    depthChart,
    soilChart: [],
    details,
  };
}

/** Минимальная глубина заглубления, при которой проходят все проверки. */
export function findRequiredDepth(input: FoundationInput, widthMm: number): number {
  const { ground } = input;
  const Hk = Math.abs(input.H) / 1000;
  const Mk = Math.abs(input.M) / 1e6;
  const e = Hk > 1e-6 ? Mk / Hk : 0;
  const D = widthMm / 1000;
  const soilType: "sand" | "clay" = ground.nh > 0 && ground.c < 10 ? "sand" : "clay";
  const upliftDemand = Math.max(0, input.Nuplift) / 1000;

  for (let d = 400; d <= 4000; d += 50) {
    const b = bromsLateralCapacity(soilType, ground.phi, ground.c, ground.gamma, D, d / 1000, e, false);
    const HRd = b.Hu / 2.0;
    const u = upliftCapacity({ ...ground, embedDepth: d }, widthMm, d, input.deadWeight, 24, false);
    const lateralOk = HRd >= Hk;
    const upliftOk = upliftDemand < 1e-6 || u.capacityKN >= upliftDemand * ground.upliftSafetyFactor;
    const frostOk = d / 1000 >= ground.frostDepthM;
    if (lateralOk && upliftOk && frostOk) return d;
  }
  return 4000;
}

export function foundationStatus(r: FoundationResult): StatusColor {
  return statusOf(Math.max(...r.rows.map((row) => row.utilization), 0));
}
