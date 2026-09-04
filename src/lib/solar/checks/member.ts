// Проверки элементов из тонкостенных холодногнутых профилей.
// СП РК EN 1993-1-3 (+ EN 1993-1-1 для устойчивости и взаимодействия усилий).
//
// Единицы: Н, мм, МПа.

import { SectionProps } from "../sections";
import { MaterialInput, MemberRole, StatusColor, statusOf } from "../types";
import { fmt, nmmToKNm, nToKN } from "../units";

export interface CheckRow {
  id: string;
  member: string;
  role: MemberRole | "joint" | "foundation";
  check: string;
  /** Расчётное усилие */
  Ed: number;
  /** Несущая способность */
  Rd: number;
  unit: string;
  utilization: number;
  status: StatusColor;
  combo: string;
  variant: string;
  ref: string;
  formula: string;
  substitution: string;
}

export interface MemberGeometryInput {
  role: MemberRole;
  name: string;
  section: SectionProps;
  /** Длина элемента, мм */
  length: number;
  /** Коэффициент расчётной длины μ в плоскости рамы (сильная ось) */
  muFactor: number;
  /** Коэффициент расчётной длины μ из плоскости рамы (слабая ось) */
  muFactorOut: number;
  /** Расстояние между закреплениями из плоскости (для устойчивости плоской формы изгиба), мм */
  ltbLength: number;
  /** Длина опирания (для местной опорной реакции), мм */
  bearingLength: number;
  /** Категория нагружения стенки: 1 — у свободного конца, 2 — промежуточная опора */
  cripplingCategory: 1 | 2;
  /** Предельная гибкость */
  slendernessLimit: number;
}

export interface MemberResistances {
  /** Растяжение, Н */
  NtRd: number;
  /** Сжатие по прочности сечения, Н */
  NcRd: number;
  /** Сжатие по устойчивости, Н */
  NbRd: number;
  /** Изгиб по прочности сечения, Н·мм */
  McRd: number;
  /** Изгиб с учётом устойчивости плоской формы, Н·мм */
  MbRd: number;
  /** Срез, Н */
  VbRd: number;
  /** Местная опорная реакция (web crippling), Н */
  RwRd: number;
  /** Гибкость */
  lambda: number;
  lambdaBar: number;
  chi: number;
  lambdaBarLT: number;
  chiLT: number;
  Ncr: number;
  Mcr: number;
  /** Дополнительный момент от смещения центра тяжести эффективного сечения, мм */
  eN: number;
  notes: string[];
}

/** Коэффициент устойчивости χ по кривой потери устойчивости (EN 1993-1-1, п. 6.3.1.2). */
export function bucklingChi(lambdaBar: number, alphaImp: number): number {
  if (lambdaBar <= 0.2) return 1;
  const phi = 0.5 * (1 + alphaImp * (lambdaBar - 0.2) + lambdaBar * lambdaBar);
  const chi = 1 / (phi + Math.sqrt(Math.max(phi * phi - lambdaBar * lambdaBar, 0)));
  return Math.min(1, chi);
}

/** Расчётное сопротивление срезу стенки fbv (EN 1993-1-3, табл. 6.1). */
export function shearBucklingStrength(lambdaW: number, fy: number, stiffenedAtSupport = false): number {
  if (lambdaW <= 0.83) return 0.58 * fy;
  if (lambdaW < 1.4) return (0.48 * fy) / lambdaW;
  return stiffenedAtSupport ? (0.48 * fy) / lambdaW : (0.67 * fy) / (lambdaW * lambdaW);
}

/** Коэффициент имперфекций: для холодногнутых профилей принята кривая «b». */
export const ALPHA_IMPERFECTION = 0.34;

export function memberResistances(
  m: MemberGeometryInput,
  mat: MaterialInput,
  rFactorT: number
): MemberResistances {
  const s = m.section;
  const fy = mat.fy * mat.gammaC; // коэффициент условий работы
  const notes: string[] = [];

  const A = s.A;
  const Aeff = s.effective.Aeff;
  const Weff = Math.min(s.effective.WeffTop, s.effective.WeffBot);

  const NtRd = (A * fy) / mat.gammaM0;
  const NcRd = (Aeff * fy) / mat.gammaM0;
  const McRd = (Weff * fy) / mat.gammaM0;

  // --- Устойчивость при сжатии ---
  // Расчётные длины в плоскости рамы и из плоскости различаются: из плоскости элементы
  // раскреплены прогонами, панелями и ветровыми связями.
  const LcrY = m.length * m.muFactor;
  const LcrZ = m.length * m.muFactorOut;
  const lambdaY = s.iu > 0 ? LcrY / s.iu : 0;
  const lambdaZ = s.iv > 0 ? LcrZ / s.iv : 0;
  const lambda = Math.max(lambdaY, lambdaZ);
  const NcrY = (Math.PI * Math.PI * mat.E * s.Iu) / (LcrY * LcrY);
  const NcrZ = (Math.PI * Math.PI * mat.E * s.Iv) / (LcrZ * LcrZ);
  const Ncr = Math.min(NcrY, NcrZ);
  const lambdaBar = Ncr > 0 ? Math.sqrt((Aeff * fy) / Ncr) : 0;
  const chi = bucklingChi(lambdaBar, ALPHA_IMPERFECTION);
  const NbRd = (chi * Aeff * fy) / mat.gammaM1;

  // --- Устойчивость плоской формы изгиба (LTB) ---
  const L = Math.max(m.ltbLength, 1);
  const C1 = 1.0; // консервативно: равномерная эпюра моментов
  const Iz = s.Iv;
  const term = s.Iw / Math.max(Iz, 1e-9) + (L * L * mat.G * s.It) / (Math.PI * Math.PI * mat.E * Math.max(Iz, 1e-9));
  const Mcr = Iz > 0 ? C1 * ((Math.PI * Math.PI * mat.E * Iz) / (L * L)) * Math.sqrt(Math.max(term, 0)) : Infinity;
  const lambdaBarLT = Mcr > 0 && isFinite(Mcr) ? Math.sqrt((Weff * fy) / Mcr) : 0;
  const chiLT = bucklingChi(lambdaBarLT, ALPHA_IMPERFECTION);
  const MbRd = (chiLT * Weff * fy) / mat.gammaM1;

  // --- Срез ---
  const hw = s.hw;
  const t = s.developedWidth > 0 ? s.Aweb / Math.max(hw, 1) : 1;
  const lambdaW = 0.346 * (hw / t) * Math.sqrt(fy / mat.E);
  const fbv = shearBucklingStrength(lambdaW, fy);
  const VbRd = (hw * t * fbv) / mat.gammaM0;

  // --- Местная опорная реакция (web crippling), EN 1993-1-3, п. 6.1.7.2 ---
  const k = fy / 228;
  const k1 = 1.33 - 0.33 * k;
  const rt = rFactorT; // r/t
  const k2 = Math.min(1.0, Math.max(0.5, 1.15 - 0.15 * rt));
  const k3 = 0.7 + 0.3 * Math.pow(90 / 90, 2); // стенка вертикальная, φ = 90°
  const ss = Math.max(m.bearingLength, 10);
  const bracket =
    m.cripplingCategory === 1
      ? (9.04 - hw / (60 * t)) * (1 + 0.01 * (ss / t))
      : (14.7 - hw / (49.5 * t)) * (1 + 0.007 * (ss / t));
  const RwRd = Math.max(0, (k1 * k2 * k3 * bracket * t * t * fy) / mat.gammaM1);

  if (s.effective.fullyEffective === false) {
    notes.push("Сечение не полностью эффективно: учтена местная потеря устойчивости плоских элементов.");
  }
  if (lambda > m.slendernessLimit) {
    notes.push(`Гибкость λ = ${fmt(lambda)} превышает предельную ${m.slendernessLimit}.`);
  }

  return {
    NtRd,
    NcRd,
    NbRd,
    McRd,
    MbRd,
    VbRd,
    RwRd,
    lambda,
    lambdaBar,
    chi,
    lambdaBarLT,
    chiLT,
    Ncr,
    Mcr,
    eN: s.effective.eN.v,
    notes,
  };
}

export interface StationForces {
  N: number; // Н (растяжение +)
  M: number; // Н·мм
  V: number; // Н
}

export interface UtilizationItem {
  key: string;
  check: string;
  Ed: number;
  Rd: number;
  unit: string;
  utilization: number;
  ref: string;
  formula: string;
  substitution: string;
}

/** Коэффициент Cmy формул взаимодействия (консервативно, EN 1993-1-1, прил. B). */
const CMY = 0.9;

/** Фиксированный порядок проверок элемента — индексы в быстром массиве результатов. */
export const MEMBER_CHECK_KEYS = [
  "tension",
  "compression",
  "buckling",
  "bending",
  "ltb",
  "shear",
  "N+M",
  "N+M_stab",
  "N+M_tension",
  "M+V",
] as const;

export type MemberCheckKey = (typeof MEMBER_CHECK_KEYS)[number];
export const MEMBER_CHECK_COUNT = MEMBER_CHECK_KEYS.length;

/**
 * Быстрый расчёт ТОЛЬКО коэффициентов использования, без формирования текстовых
 * пояснений и без выделения памяти: результат записывается в переданный массив
 * (индексы — по MEMBER_CHECK_KEYS, значение −1 означает «проверка неприменима»).
 *
 * Используется во внутреннем цикле перебора сочетаний и сечений (десятки тысяч точек);
 * подробные строки формируются затем лишь для определяющих проверок функцией
 * memberUtilizations(). Соответствие обеих функций закреплено юнит-тестом.
 */
export function memberUtilizationsInto(r: MemberResistances, f: StationForces, out: Float64Array): void {
  out.fill(-1);
  const Nc = f.N < 0 ? -f.N : 0;
  const Nt = f.N > 0 ? f.N : 0;
  const M = f.M < 0 ? -f.M : f.M;
  const V = f.V < 0 ? -f.V : f.V;
  const Mtot = M + Nc * (r.eN < 0 ? -r.eN : r.eN);

  if (Nt > 0) out[0] = Nt / r.NtRd;
  if (Nc > 0) {
    out[1] = Nc / r.NcRd;
    out[2] = Nc / r.NbRd;
  }
  if (Mtot > 0) {
    out[3] = Mtot / r.McRd;
    out[4] = Mtot / r.MbRd;
  }
  if (V > 0) out[5] = V / r.VbRd;
  if (Nc > 0 && Mtot > 0) {
    out[6] = Nc / r.NcRd + Mtot / r.McRd;
    const nBar = Nc / (r.NbRd > 1e-9 ? r.NbRd : 1e-9);
    let kyy = CMY * (1 + 0.6 * r.lambdaBar * nBar);
    const kyyMax = CMY * 1.6;
    if (kyy > kyyMax) kyy = kyyMax;
    out[7] = Nc / r.NbRd + (kyy * Mtot) / r.MbRd;
  }
  if (Nt > 0 && Mtot > 0) out[8] = Nt / r.NtRd + Mtot / r.McRd;
  if (V > 0.5 * r.VbRd && Mtot > 0) {
    const x = (2 * V) / r.VbRd - 1;
    out[9] = Mtot / r.McRd + x * x;
  }
}

/**
 * Коэффициенты использования в одном сечении.
 * Cmy принят 0,9 (консервативно) — упрощение формул взаимодействия 6.61/6.62
 * EN 1993-1-1, прил. B (метод 2).
 */
export function memberUtilizations(r: MemberResistances, f: StationForces, mat: MaterialInput): UtilizationItem[] {
  const items: UtilizationItem[] = [];
  const Nc = Math.max(0, -f.N); // сжатие
  const Nt = Math.max(0, f.N); // растяжение
  const M = Math.abs(f.M);
  const V = Math.abs(f.V);

  // Дополнительный момент от смещения центра тяжести эффективного сечения (EN 1993-1-3, п. 6.1.9)
  const dM = Nc * Math.abs(r.eN);
  const Mtot = M + dM;

  if (Nt > 0) {
    items.push({
      key: "tension",
      check: "Растяжение",
      Ed: nToKN(Nt),
      Rd: nToKN(r.NtRd),
      unit: "кН",
      utilization: Nt / r.NtRd,
      ref: "EN 1993-1-3, п. 6.1.2",
      formula: "N_t,Rd = A·fy/γM0",
      substitution: `${fmt(nToKN(Nt))} / ${fmt(nToKN(r.NtRd))}`,
    });
  }
  if (Nc > 0) {
    items.push({
      key: "compression",
      check: "Сжатие (прочность сечения)",
      Ed: nToKN(Nc),
      Rd: nToKN(r.NcRd),
      unit: "кН",
      utilization: Nc / r.NcRd,
      ref: "EN 1993-1-3, п. 6.1.3 (N_c,Rd = Aeff·fy/γM0)",
      formula: "N_c,Rd = Aeff·fy/γM0",
      substitution: `${fmt(nToKN(Nc))} / ${fmt(nToKN(r.NcRd))}`,
    });
    items.push({
      key: "buckling",
      check: "Устойчивость при сжатии",
      Ed: nToKN(Nc),
      Rd: nToKN(r.NbRd),
      unit: "кН",
      utilization: Nc / r.NbRd,
      ref: "EN 1993-1-1, п. 6.3.1 (кривая b, α = 0,34)",
      formula: "N_b,Rd = χ·Aeff·fy/γM1",
      substitution: `χ = ${fmt(r.chi)}, λ̄ = ${fmt(r.lambdaBar)} → ${fmt(nToKN(Nc))} / ${fmt(nToKN(r.NbRd))}`,
    });
  }
  if (Mtot > 0) {
    items.push({
      key: "bending",
      check: "Изгиб (прочность сечения)",
      Ed: nmmToKNm(Mtot),
      Rd: nmmToKNm(r.McRd),
      unit: "кН·м",
      utilization: Mtot / r.McRd,
      ref: "EN 1993-1-3, п. 6.1.4 (M_c,Rd = Weff·fy/γM0)",
      formula: "M_c,Rd = Weff·fy/γM0",
      substitution:
        dM > 0
          ? `M + ΔM = ${fmt(nmmToKNm(M))} + ${fmt(nmmToKNm(dM))} = ${fmt(nmmToKNm(Mtot))} кН·м`
          : `${fmt(nmmToKNm(Mtot))} / ${fmt(nmmToKNm(r.McRd))}`,
    });
    items.push({
      key: "ltb",
      check: "Устойчивость плоской формы изгиба",
      Ed: nmmToKNm(Mtot),
      Rd: nmmToKNm(r.MbRd),
      unit: "кН·м",
      utilization: Mtot / r.MbRd,
      ref: "EN 1993-1-1, п. 6.3.2 (χLT)",
      formula: "M_b,Rd = χLT·Weff·fy/γM1",
      substitution: `χLT = ${fmt(r.chiLT)}, λ̄LT = ${fmt(r.lambdaBarLT)}`,
    });
  }
  if (V > 0) {
    items.push({
      key: "shear",
      check: "Срез стенки",
      Ed: nToKN(V),
      Rd: nToKN(r.VbRd),
      unit: "кН",
      utilization: V / r.VbRd,
      ref: "EN 1993-1-3, п. 6.1.5 (V_b,Rd = hw·t·fbv/γM0)",
      formula: "V_b,Rd = hw·t·fbv/γM0",
      substitution: `${fmt(nToKN(V))} / ${fmt(nToKN(r.VbRd))}`,
    });
  }

  // Совместное действие
  if (Nc > 0 && Mtot > 0) {
    const crossSection = Nc / r.NcRd + Mtot / r.McRd;
    items.push({
      key: "N+M",
      check: "Совместное N + M (сечение)",
      Ed: crossSection,
      Rd: 1,
      unit: "—",
      utilization: crossSection,
      ref: "EN 1993-1-3, п. 6.1.9 (сжатие с изгибом)",
      formula: "N_Ed/N_c,Rd + (M_Ed + ΔM)/M_c,Rd ≤ 1",
      substitution: `${fmt(Nc / r.NcRd)} + ${fmt(Mtot / r.McRd)} = ${fmt(crossSection)}`,
    });
    const nBar = Nc / Math.max(r.NbRd, 1e-9);
    const kyy = Math.min(CMY * (1 + 0.6 * r.lambdaBar * nBar), CMY * 1.6);
    const stability = Nc / r.NbRd + (kyy * Mtot) / r.MbRd;
    items.push({
      key: "N+M_stab",
      check: "Совместное N + M (устойчивость)",
      Ed: stability,
      Rd: 1,
      unit: "—",
      utilization: stability,
      ref: "EN 1993-1-1, п. 6.3.3, формулы 6.61/6.62 (прил. B, метод 2)",
      formula: "N_Ed/N_b,Rd + kyy·M_Ed/M_b,Rd ≤ 1",
      substitution: `${fmt(Nc / r.NbRd)} + ${fmt(kyy)}·${fmt(Mtot / r.MbRd)} = ${fmt(stability)}`,
    });
  }
  if (Nt > 0 && Mtot > 0) {
    const u = Nt / r.NtRd + Mtot / r.McRd;
    items.push({
      key: "N+M_tension",
      check: "Совместное N + M (растяжение с изгибом)",
      Ed: u,
      Rd: 1,
      unit: "—",
      utilization: u,
      ref: "EN 1993-1-3, п. 6.1.8",
      formula: "N_Ed/N_t,Rd + M_Ed/M_c,Rd ≤ 1",
      substitution: `${fmt(Nt / r.NtRd)} + ${fmt(Mtot / r.McRd)} = ${fmt(u)}`,
    });
  }

  // Совместное действие момента и среза (EN 1993-1-3, п. 6.1.10)
  if (V > 0.5 * r.VbRd && Mtot > 0) {
    const u = Mtot / r.McRd + Math.pow((2 * V) / r.VbRd - 1, 2);
    items.push({
      key: "M+V",
      check: "Совместное M + V",
      Ed: u,
      Rd: 1,
      unit: "—",
      utilization: u,
      ref: "EN 1993-1-3, п. 6.1.10",
      formula: "M_Ed/M_c,Rd + (2·V_Ed/V_b,Rd − 1)² ≤ 1",
      substitution: `${fmt(Mtot / r.McRd)} + (2·${fmt(V / r.VbRd)} − 1)² = ${fmt(u)}`,
    });
  }

  void mat;
  return items;
}

/** Проверка местной опорной реакции (web crippling) в месте опирания. */
export function webCripplingCheck(r: MemberResistances, reaction: number): UtilizationItem {
  const R = Math.abs(reaction);
  return {
    key: "crippling",
    check: "Местная опорная реакция (смятие стенки)",
    Ed: nToKN(R),
    Rd: nToKN(r.RwRd),
    unit: "кН",
    utilization: r.RwRd > 0 ? R / r.RwRd : 0,
    ref: "EN 1993-1-3, п. 6.1.7.2 (одностенчатый профиль)",
    formula: "R_w,Rd = k1·k2·k3·[…]·t²·fy/γM1",
    substitution: `${fmt(nToKN(R))} / ${fmt(nToKN(r.RwRd))}`,
  };
}

/** Совместное действие изгибающего момента и местной опорной реакции. */
export function bendingPlusCripplingCheck(r: MemberResistances, M: number, reaction: number): UtilizationItem {
  const u = Math.abs(M) / r.McRd + Math.abs(reaction) / Math.max(r.RwRd, 1e-9);
  return {
    key: "M+Rw",
    check: "Совместное M + местная опорная реакция",
    Ed: u,
    Rd: 1.25,
    unit: "—",
    utilization: u / 1.25,
    ref: "EN 1993-1-3, п. 6.1.11 (M_Ed/M_c,Rd + F_Ed/R_w,Rd ≤ 1,25)",
    formula: "M_Ed/M_c,Rd + F_Ed/R_w,Rd ≤ 1,25",
    substitution: `${fmt(Math.abs(M) / r.McRd)} + ${fmt(Math.abs(reaction) / Math.max(r.RwRd, 1e-9))} = ${fmt(u)}`,
  };
}

/** Проверка кручения от эксцентриситета приложения нагрузки. */
export function torsionCheck(section: SectionProps, torque: number, mat: MaterialInput): UtilizationItem {
  const fy = mat.fy * mat.gammaC;
  const tauRd = fy / Math.sqrt(3) / mat.gammaM0;
  // Свободное кручение тонкостенного открытого сечения: τ = T·t/It
  const tMax = section.Aweb / Math.max(section.hw, 1);
  const tau = section.It > 0 ? (Math.abs(torque) * tMax) / section.It : 0;
  return {
    key: "torsion",
    check: "Кручение (свободное) от эксцентриситета",
    Ed: tau,
    Rd: tauRd,
    unit: "МПа",
    utilization: tau / tauRd,
    ref: "EN 1993-1-3, п. 6.1.6 (кручение); τ = T·t/It",
    formula: "τ_t = T·t/It ≤ fy/(√3·γM0)",
    substitution: `${fmt(Math.abs(torque) / 1e6)} кН·м · ${fmt(tMax)} мм / ${fmt(section.It / 1e4)} см⁴ = ${fmt(tau)} МПа`,
  };
}

/** Проверка предельной гибкости. */
export function slendernessCheck(r: MemberResistances, limit: number): UtilizationItem {
  return {
    key: "slenderness",
    check: "Предельная гибкость",
    Ed: r.lambda,
    Rd: limit,
    unit: "—",
    utilization: limit > 0 ? r.lambda / limit : 0,
    ref: "EN 1993-1-1 / СП 16.13330, предельные гибкости элементов",
    formula: "λ = μ·L/i ≤ [λ]",
    substitution: `${fmt(r.lambda)} / ${limit}`,
  };
}

export function toCheckRow(
  item: UtilizationItem,
  member: string,
  role: MemberRole | "joint" | "foundation",
  combo: string,
  variant: string
): CheckRow {
  return {
    id: `${role}-${item.key}`,
    member,
    role,
    check: item.check,
    Ed: item.Ed,
    Rd: item.Rd,
    unit: item.unit,
    utilization: item.utilization,
    status: statusOf(item.utilization),
    combo,
    variant,
    ref: item.ref,
    formula: item.formula,
    substitution: item.substitution,
  };
}
