// Геометрические и эффективные характеристики тонкостенных холодногнутых сечений.
//
// Методика:
//   * сечение представляется ломаной по СРЕДНЕЙ ЛИНИИ (midline) — стандартная модель
//     тонкостенного стержня;
//   * скругления гибов учитываются приближением EN 1993-1-3, п. 5.1.4(3):
//     Ag ≈ Ag,sh·(1 − δ), Ig ≈ Ig,sh·(1 − 2δ), где δ = 0,43·Σ(rj·φj/90°)/Σbp,i;
//   * центр изгиба и секториальный момент инерции Iw считаются численно
//     (метод секториальных площадей) — см. computeSectorialProps();
//   * эффективные характеристики (Aeff, Weff) — по EN 1993-1-3, п. 5.5
//     (местная потеря устойчивости плоских элементов + краевые отгибы).
//
// Единицы внутри модуля: мм, мм², мм⁴, МПа.

import { SectionDef, ManualSectionProps } from "./types";
import { cm2ToMm2, cm3ToMm3, cm4ToMm4, cm6ToMm6 } from "./units";

export interface Pt {
  u: number; // мм — горизонтальная координата (ширина сечения)
  v: number; // мм — вертикальная координата (высота сечения)
}

/** Прямолинейный участок средней линии постоянной толщины. */
export interface Strip {
  a: Pt;
  b: Pt;
  t: number;
  /** Признак «плоский элемент» для расчёта эффективной ширины */
  kind: "web" | "flange" | "lip" | "other";
}

export interface GrossProps {
  A: number; // мм²
  cu: number; // мм — центр тяжести по u
  cv: number; // мм — центр тяжести по v
  Iu: number; // мм⁴ — момент инерции относительно горизонтальной оси (сильная ось, Ix)
  Iv: number; // мм⁴ — относительно вертикальной оси (Iy)
  Iuv: number; // мм⁴ — центробежный момент
  vMax: number; // мм — расстояние до крайнего волокна вверх (с учётом t/2)
  vMin: number; // мм — вниз (отрицательное)
  uMax: number;
  uMin: number;
  Wu: number; // мм³ — Wx (по минимальному моменту сопротивления)
  Wv: number; // мм³ — Wy
  iu: number; // мм — радиус инерции
  iv: number;
  It: number; // мм⁴ — момент инерции при свободном кручении
  Iw: number; // мм⁶ — секториальный момент инерции
  /** Координаты центра изгиба относительно центра тяжести, мм */
  shearCenter: { u: number; v: number };
  /** Периметр развёртки (для массы и площади покрытия), мм */
  developedWidth: number;
  /** Площадь стенки для расчёта среза, мм² */
  Aweb: number;
  /** Высота стенки (по средней линии), мм */
  hw: number;
  /** Угол наклона стенки к вертикали, ° (для среза) */
  webAngleDeg: number;
}

export interface EffectiveProps {
  /** Эффективная площадь при равномерном сжатии, мм² */
  Aeff: number;
  /** Эффективный момент сопротивления при изгибе (сжатая зона сверху), мм³ */
  WeffTop: number;
  /** То же, сжатая зона снизу, мм³ */
  WeffBot: number;
  /** Смещение центра тяжести эффективного сечения при сжатии, мм (даёт ΔM = N·eN) */
  eN: { u: number; v: number };
  /** Коэффициенты редукции по элементам — для вывода в отчёт */
  detail: EffElementDetail[];
  /** Сечение полностью эффективно (класс 3 и лучше по местной устойчивости) */
  fullyEffective: boolean;
}

export interface EffElementDetail {
  name: string;
  bp: number; // мм — расчётная ширина плоского участка
  slenderness: number; // λ̄p
  rho: number; // коэффициент редукции
  chiD?: number; // χd — для краевого отгиба
  note: string;
}

export interface SectionProps extends GrossProps {
  key: string;
  name: string;
  effective: EffectiveProps;
  /** Погонная масса, кг/м (по площади развёртки и плотности) */
  massPerM: number;
  warnings: string[];
  /** Сечение задано вручную — эффективные характеристики не вычислялись */
  manual: boolean;
}

// ---------------------------------------------------------------------------
// Построение средней линии по типу профиля
// ---------------------------------------------------------------------------

/**
 * Средняя линия профиля.
 * Габариты h (высота стенки), b (ширина полки), c (отгиб) заданы ПО НАРУЖНОМУ КОНТУРУ.
 */
export function buildMidline(def: SectionDef): { strips: Strip[]; closed: boolean; corners: number } {
  const { shape, t } = def;
  const h = def.h;
  const b = def.b;
  const c = def.c;
  // Размеры по средней линии
  const hm = h - t;
  const bm = b - t / 2;
  const cm = Math.max(0, c - t / 2);
  const strips: Strip[] = [];
  const S = (a: Pt, bb: Pt, kind: Strip["kind"]) => strips.push({ a, b: bb, t, kind });

  switch (shape) {
    case "C": {
      // Швеллер: стенка вертикальная в u = 0, полки вправо, отгибы вниз/вверх внутрь
      S({ u: 0, v: -hm / 2 }, { u: 0, v: hm / 2 }, "web");
      S({ u: 0, v: hm / 2 }, { u: bm, v: hm / 2 }, "flange");
      S({ u: 0, v: -hm / 2 }, { u: bm, v: -hm / 2 }, "flange");
      if (cm > 0) {
        S({ u: bm, v: hm / 2 }, { u: bm, v: hm / 2 - cm }, "lip");
        S({ u: bm, v: -hm / 2 }, { u: bm, v: -hm / 2 + cm }, "lip");
      }
      return { strips, closed: false, corners: cm > 0 ? 4 : 2 };
    }
    case "SIGMA": {
      // Σ-профиль: швеллер с подкрепляющим гофром стенки
      const d = Math.max(0, def.webStiffenerDepth ?? Math.min(hm / 6, 15));
      const sw = Math.min(hm / 2, 2 * d); // ширина зоны гофра по высоте стенки
      if (d > 0 && sw > 0) {
        S({ u: 0, v: -hm / 2 }, { u: 0, v: -sw / 2 }, "web");
        S({ u: 0, v: -sw / 2 }, { u: d, v: -sw / 4 }, "web");
        S({ u: d, v: -sw / 4 }, { u: d, v: sw / 4 }, "web");
        S({ u: d, v: sw / 4 }, { u: 0, v: sw / 2 }, "web");
        S({ u: 0, v: sw / 2 }, { u: 0, v: hm / 2 }, "web");
      } else {
        S({ u: 0, v: -hm / 2 }, { u: 0, v: hm / 2 }, "web");
      }
      S({ u: 0, v: hm / 2 }, { u: bm, v: hm / 2 }, "flange");
      S({ u: 0, v: -hm / 2 }, { u: bm, v: -hm / 2 }, "flange");
      if (cm > 0) {
        S({ u: bm, v: hm / 2 }, { u: bm, v: hm / 2 - cm }, "lip");
        S({ u: bm, v: -hm / 2 }, { u: bm, v: -hm / 2 + cm }, "lip");
      }
      return { strips, closed: false, corners: (cm > 0 ? 4 : 2) + 4 };
    }
    case "Z": {
      S({ u: 0, v: -hm / 2 }, { u: 0, v: hm / 2 }, "web");
      S({ u: 0, v: hm / 2 }, { u: bm, v: hm / 2 }, "flange");
      S({ u: 0, v: -hm / 2 }, { u: -bm, v: -hm / 2 }, "flange");
      if (cm > 0) {
        S({ u: bm, v: hm / 2 }, { u: bm, v: hm / 2 - cm }, "lip");
        S({ u: -bm, v: -hm / 2 }, { u: -bm, v: -hm / 2 + cm }, "lip");
      }
      return { strips, closed: false, corners: cm > 0 ? 4 : 2 };
    }
    case "RHS": {
      const bw = b - t;
      S({ u: -bw / 2, v: -hm / 2 }, { u: -bw / 2, v: hm / 2 }, "web");
      S({ u: bw / 2, v: -hm / 2 }, { u: bw / 2, v: hm / 2 }, "web");
      S({ u: -bw / 2, v: hm / 2 }, { u: bw / 2, v: hm / 2 }, "flange");
      S({ u: -bw / 2, v: -hm / 2 }, { u: bw / 2, v: -hm / 2 }, "flange");
      return { strips, closed: true, corners: 4 };
    }
    case "ANGLE": {
      S({ u: 0, v: 0 }, { u: 0, v: hm }, "web");
      S({ u: 0, v: 0 }, { u: bm, v: 0 }, "flange");
      if (cm > 0) S({ u: bm, v: 0 }, { u: bm, v: cm }, "lip");
      return { strips, closed: false, corners: cm > 0 ? 2 : 1 };
    }
    default:
      return { strips, closed: false, corners: 0 };
  }
}

// ---------------------------------------------------------------------------
// Характеристики набора полос
// ---------------------------------------------------------------------------

interface RawProps {
  A: number;
  cu: number;
  cv: number;
  Iu: number;
  Iv: number;
  Iuv: number;
}

/** Площадь, центр тяжести и моменты инерции набора тонких полос (относительно центра тяжести). */
export function stripProps(strips: Strip[]): RawProps {
  let A = 0;
  let Su = 0; // статический момент относительно оси v (для координаты u)
  let Sv = 0;
  for (const s of strips) {
    const L = Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v);
    const a = L * s.t;
    A += a;
    Su += a * ((s.a.u + s.b.u) / 2);
    Sv += a * ((s.a.v + s.b.v) / 2);
  }
  if (A === 0) return { A: 0, cu: 0, cv: 0, Iu: 0, Iv: 0, Iuv: 0 };
  const cu = Su / A;
  const cv = Sv / A;

  let Iu = 0;
  let Iv = 0;
  let Iuv = 0;
  for (const s of strips) {
    const du = s.b.u - s.a.u;
    const dv = s.b.v - s.a.v;
    const L = Math.hypot(du, dv);
    if (L === 0) continue;
    const nu = du / L;
    const nv = dv / L;
    const a = L * s.t;
    const mu = (s.a.u + s.b.u) / 2 - cu;
    const mv = (s.a.v + s.b.v) / 2 - cv;
    // Собственные моменты инерции наклонной тонкой полосы
    const own = (s.t * L) / 12;
    Iu += own * (L * L * nv * nv + s.t * s.t * nu * nu) + a * mv * mv;
    Iv += own * (L * L * nu * nu + s.t * s.t * nv * nv) + a * mu * mu;
    Iuv += own * (L * L - s.t * s.t) * nu * nv + a * mu * mv;
  }
  return { A, cu, cv, Iu, Iv, Iuv };
}

/**
 * Центр изгиба и секториальный момент инерции Iw для ОТКРЫТОГО односвязного сечения.
 * Метод секториальных площадей: ω(s) вычисляется относительно полюса (центра тяжести),
 * затем полюс переносится в центр изгиба из условий ∫ω·u dA = ∫ω·v dA = 0.
 */
export function computeSectorialProps(
  strips: Strip[],
  props: RawProps
): { shearCenter: { u: number; v: number }; Iw: number } {
  const { A, cu, cv, Iu, Iv, Iuv } = props;
  if (A === 0 || strips.length === 0) return { shearCenter: { u: 0, v: 0 }, Iw: 0 };

  // Полосы в центральных координатах
  const cs = strips.map((s) => ({
    a: { u: s.a.u - cu, v: s.a.v - cv },
    b: { u: s.b.u - cu, v: s.b.v - cv },
    t: s.t,
  }));

  // Упорядочиваем полосы в непрерывную цепочку, чтобы ω была непрерывной вдоль контура.
  const chain = orderChain(cs);

  // ω относительно полюса в центре тяжести (полюс = (0,0) в центральных координатах)
  const omega: { w1: number; w2: number; seg: (typeof chain)[number] }[] = [];
  const nodeOmega = new Map<string, number>();
  const keyOf = (p: Pt) => `${p.u.toFixed(6)},${p.v.toFixed(6)}`;
  if (chain.length > 0) nodeOmega.set(keyOf(chain[0].a), 0);
  for (const seg of chain) {
    const ka = keyOf(seg.a);
    const kb = keyOf(seg.b);
    const w1 = nodeOmega.get(ka) ?? 0;
    // ∫ r ds по отрезку = векторное произведение (a − P) × (b − a)
    const dw = seg.a.u * (seg.b.v - seg.a.v) - seg.a.v * (seg.b.u - seg.a.u);
    const w2 = w1 + dw;
    if (!nodeOmega.has(ka)) nodeOmega.set(ka, w1);
    nodeOmega.set(kb, w2);
    omega.push({ w1, w2, seg });
  }

  // Интегралы ∫ω dA, ∫ω·u dA, ∫ω·v dA (ω и координаты линейны вдоль отрезка)
  let Iomega = 0;
  let Iou = 0;
  let Iov = 0;
  for (const { w1, w2, seg } of omega) {
    const L = Math.hypot(seg.b.u - seg.a.u, seg.b.v - seg.a.v);
    const dA = L * seg.t;
    if (dA === 0) continue;
    Iomega += dA * ((w1 + w2) / 2);
    Iou += (dA / 6) * (2 * w1 * seg.a.u + w1 * seg.b.u + w2 * seg.a.u + 2 * w2 * seg.b.u);
    Iov += (dA / 6) * (2 * w1 * seg.a.v + w1 * seg.b.v + w2 * seg.a.v + 2 * w2 * seg.b.v);
  }
  // Смещение полюса (Δu, Δv) = P − S из системы:
  //   Iou + Δu·Iuv − Δv·Iv = 0
  //   Iov + Δu·Iu  − Δv·Iuv = 0
  const det = Iuv * Iuv - Iu * Iv;
  let du = 0;
  let dv = 0;
  if (Math.abs(det) > 1e-9) {
    // Решение системы методом Крамера
    du = (-Iou * Iuv + Iov * Iv) / det;
    dv = (-Iou * Iu + Iov * Iuv) / det;
  }
  const shearCenter = { u: -du, v: -dv };

  // Пересчёт ω относительно центра изгиба и нормировка
  const shifted = omega.map(({ w1, w2, seg }) => {
    const w1s = w1 + du * (seg.a.v - chain[0].a.v) - dv * (seg.a.u - chain[0].a.u);
    const w2s = w2 + du * (seg.b.v - chain[0].a.v) - dv * (seg.b.u - chain[0].a.u);
    return { w1: w1s, w2: w2s, seg };
  });
  let sum = 0;
  let totalA = 0;
  for (const { w1, w2, seg } of shifted) {
    const L = Math.hypot(seg.b.u - seg.a.u, seg.b.v - seg.a.v);
    const dA = L * seg.t;
    sum += dA * ((w1 + w2) / 2);
    totalA += dA;
  }
  const wMean = totalA > 0 ? sum / totalA : 0;
  let Iw = 0;
  for (const { w1, w2, seg } of shifted) {
    const L = Math.hypot(seg.b.u - seg.a.u, seg.b.v - seg.a.v);
    const dA = L * seg.t;
    const a1 = w1 - wMean;
    const a2 = w2 - wMean;
    Iw += (dA * (a1 * a1 + a1 * a2 + a2 * a2)) / 3;
  }
  return { shearCenter, Iw: Math.max(0, Iw) };
}

/** Упорядочивание отрезков в непрерывную цепочку (для непрерывности ω). */
function orderChain<T extends { a: Pt; b: Pt; t: number }>(segs: T[]): T[] {
  if (segs.length <= 1) return segs.slice();
  const key = (p: Pt) => `${p.u.toFixed(6)},${p.v.toFixed(6)}`;
  const remaining = segs.slice();
  // Стартуем с концевого узла (встречается один раз)
  const degree = new Map<string, number>();
  for (const s of remaining) {
    degree.set(key(s.a), (degree.get(key(s.a)) ?? 0) + 1);
    degree.set(key(s.b), (degree.get(key(s.b)) ?? 0) + 1);
  }
  let startIdx = remaining.findIndex((s) => degree.get(key(s.a)) === 1 || degree.get(key(s.b)) === 1);
  if (startIdx < 0) startIdx = 0;
  const first = remaining.splice(startIdx, 1)[0];
  const chain: T[] = [];
  let head: T = first;
  if ((degree.get(key(first.a)) ?? 0) !== 1 && (degree.get(key(first.b)) ?? 0) === 1) {
    head = { ...first, a: first.b, b: first.a };
  }
  chain.push(head);
  let tail = key(head.b);
  while (remaining.length > 0) {
    const idx = remaining.findIndex((s) => key(s.a) === tail || key(s.b) === tail);
    if (idx < 0) break; // разветвлённое или разорванное сечение — оставшиеся добавим как есть
    const s = remaining.splice(idx, 1)[0];
    const oriented = key(s.a) === tail ? s : ({ ...s, a: s.b, b: s.a } as T);
    chain.push(oriented);
    tail = key(oriented.b);
  }
  chain.push(...remaining);
  return chain;
}

// ---------------------------------------------------------------------------
// Эффективные характеристики (EN 1993-1-3, п. 5.5)
// ---------------------------------------------------------------------------

/** Коэффициент редукции ρ для плоского элемента, опертого по двум краям (EN 1993-1-3, п. 5.5.2). */
export function rhoInternal(lambdaP: number): number {
  if (lambdaP <= 0.673) return 1;
  return Math.min(1, (1 - 0.22 / lambdaP) / lambdaP);
}

/** Коэффициент редукции ρ для свеса (элемента, опертого по одному краю). */
export function rhoOutstand(lambdaP: number): number {
  if (lambdaP <= 0.748) return 1;
  return Math.min(1, (1 - 0.188 / lambdaP) / lambdaP);
}

/** Условная гибкость пластинки λ̄p = (b̄/t) / (28,4·ε·√kσ) — EN 1993-1-5, п. 4.4(2). */
export function plateSlenderness(bp: number, t: number, kSigma: number, fy: number): number {
  const eps = Math.sqrt(235 / fy);
  return bp / t / (28.4 * eps * Math.sqrt(Math.max(kSigma, 1e-6)));
}

/** kσ для внутреннего (опертого по двум краям) элемента, EN 1993-1-5, табл. 4.1. */
export function kSigmaInternal(psi: number): number {
  const p = Math.max(-3, Math.min(1, psi));
  if (p === 1) return 4.0;
  if (p > 0) return 8.2 / (1.05 + p);
  if (p === 0) return 7.81;
  if (p > -1) return 7.81 - 6.29 * p + 9.78 * p * p;
  if (p === -1) return 23.9;
  return 5.98 * (1 - p) * (1 - p);
}

/** kσ для свеса, EN 1993-1-5, табл. 4.2 (сжатие у опертого края). */
export function kSigmaOutstand(psi: number): number {
  const p = Math.max(-1, Math.min(1, psi));
  if (p >= 0) return 0.578 / (p + 0.34);
  return 1.7 - 5 * p + 17.1 * p * p;
}

/**
 * Распределение эффективной ширины внутреннего элемента (EN 1993-1-5, табл. 4.1).
 * Возвращает доли ширины, оставшиеся у краёв 1 (более сжатый) и 2.
 */
function effectiveInternalParts(bp: number, psi: number, rho: number): { be1: number; be2: number; bc: number } {
  if (psi >= 0) {
    const beff = rho * bp;
    if (psi === 1) return { be1: beff / 2, be2: beff / 2, bc: bp };
    const be1 = (2 * beff) / (5 - psi);
    return { be1, be2: beff - be1, bc: bp };
  }
  // Часть сечения растянута: редуцируется только сжатая зона bc
  const bc = bp / (1 - psi);
  const beff = rho * bc;
  return { be1: 0.4 * beff, be2: 0.6 * beff, bc };
}

/** Редукционный коэффициент χd для краевого отгиба (EN 1993-1-3, п. 5.5.3.2). */
export function chiDistortional(lambdaD: number): number {
  if (lambdaD <= 0.65) return 1;
  if (lambdaD < 1.38) return Math.max(0, 1.47 - 0.723 * lambdaD);
  return 0.66 / lambdaD;
}

interface EffectiveContext {
  def: SectionDef;
  fy: number;
  gross: GrossProps;
}

/**
 * Эффективные характеристики при равномерном сжатии и при изгибе.
 * Реализация — один проход по элементам сечения (стенка / полки / отгибы) с
 * последующим пересчётом геометрии. Итерация по положению нейтральной оси при
 * изгибе выполняется 3 раза (норма допускает 1–2 итерации).
 */
function computeEffective(ctx: EffectiveContext): EffectiveProps {
  const { def, fy, gross } = ctx;
  const t = def.t;
  const detail: EffElementDetail[] = [];
  const { strips, closed } = buildMidline(def);

  // ---- 1. Равномерное сжатие (ψ = 1 для всех элементов) ----
  const compStrips: Strip[] = [];
  let anyReduction = false;

  // Коэффициент редукции отгиба (распорная жёсткость) — общий для полок
  const lipChi = def.c > 0 && !closed ? distortionalReduction(def, fy) : 1;

  for (const s of strips) {
    const L = Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v);
    const isOutstand = s.kind === "lip";
    const kSig = isOutstand ? 0.5 : kSigmaInternal(1);
    const lam = plateSlenderness(L, t, kSig, fy);
    const rho = isOutstand ? rhoOutstand(lam) : rhoInternal(lam);
    if (rho < 0.999) anyReduction = true;
    if (isOutstand) {
      // Отгиб: редукция по местной устойчивости и по распорной (дистортной) форме
      const chi = lipChi;
      if (chi < 0.999) anyReduction = true;
      compStrips.push(scaleStrip(s, rho, chi));
      detail.push({
        name: labelOf(s.kind),
        bp: L,
        slenderness: lam,
        rho,
        chiD: chi,
        note: "Краевой отгиб: kσ = 0,5 (EN 1993-1-3, п. 5.5.3.2), χd — распорная устойчивость",
      });
    } else {
      const parts = effectiveInternalParts(L, 1, rho);
      compStrips.push(...splitStrip(s, parts.be1, parts.be2));
      detail.push({
        name: labelOf(s.kind),
        bp: L,
        slenderness: lam,
        rho,
        note: `kσ = ${kSig.toFixed(2)} (ψ = 1, равномерное сжатие)`,
      });
    }
  }

  const compProps = stripProps(compStrips);
  const deltaRound = roundingCorrection(def);
  const Aeff = compProps.A * (1 - deltaRound);

  // ---- 2. Изгиб относительно сильной оси ----
  const weffTop = effectiveBending(def, fy, gross, "top", deltaRound);
  const weffBot = effectiveBending(def, fy, gross, "bot", deltaRound);

  return {
    Aeff,
    WeffTop: weffTop,
    WeffBot: weffBot,
    eN: { u: compProps.cu - gross.cu, v: compProps.cv - gross.cv },
    detail,
    fullyEffective: !anyReduction,
  };
}

function labelOf(kind: Strip["kind"]): string {
  switch (kind) {
    case "web":
      return "Стенка";
    case "flange":
      return "Полка";
    case "lip":
      return "Отгиб (губка)";
    default:
      return "Элемент";
  }
}

/** Полоса с редуцированной толщиной (для отгиба). */
function scaleStrip(s: Strip, rho: number, chi: number): Strip {
  const L = Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v);
  const Le = L * rho;
  const nu = L === 0 ? 0 : (s.b.u - s.a.u) / L;
  const nv = L === 0 ? 0 : (s.b.v - s.a.v) / L;
  return {
    a: s.a,
    b: { u: s.a.u + nu * Le, v: s.a.v + nv * Le },
    t: s.t * chi,
    kind: s.kind,
  };
}

/** Разбиение полосы на две эффективные части у краёв (be1 — у начала, be2 — у конца). */
function splitStrip(s: Strip, be1: number, be2: number): Strip[] {
  const L = Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v);
  if (L === 0) return [];
  const nu = (s.b.u - s.a.u) / L;
  const nv = (s.b.v - s.a.v) / L;
  const out: Strip[] = [];
  if (be1 > 1e-6) {
    out.push({ a: s.a, b: { u: s.a.u + nu * be1, v: s.a.v + nv * be1 }, t: s.t, kind: s.kind });
  }
  if (be2 > 1e-6) {
    out.push({ a: { u: s.b.u - nu * be2, v: s.b.v - nv * be2 }, b: s.b, t: s.t, kind: s.kind });
  }
  return out;
}

/**
 * Редукция краевого отгиба по распорной (дистортной) форме потери устойчивости.
 * EN 1993-1-3, п. 5.5.3.2: K — упругая опора отгиба, σcr,s — критическое напряжение.
 */
function distortionalReduction(def: SectionDef, fy: number): number {
  const t = def.t;
  const hw = def.h - t;
  const bp = def.b - t / 2; // ширина полки по средней линии
  const cp = Math.max(0, def.c - t / 2);
  if (cp <= 0) return 1;

  // Площадь и момент инерции краевого подкрепления (полка bp,ef + отгиб) — упрощённо
  // принимается сечение «отгиб + прилегающая эффективная часть полки».
  const beff = bp * 0.5; // часть полки, участвующая в подкреплении (консервативно)
  const As = (beff + cp) * t;
  // Момент инерции подкрепления относительно собственной оси
  const yc = (cp * t * (cp / 2)) / As; // положение ц.т. относительно линии полки
  const Is = (t * Math.pow(cp, 3)) / 12 + cp * t * Math.pow(cp / 2 - yc, 2) + beff * t * yc * yc;

  const E = 210000;
  const nu = 0.3;
  const b1 = beff; // расстояние от угла стенка-полка до ц.т. подкрепления
  const kf = 0; // одиночное подкрепление (вторая полка не учитывается)
  const denom = b1 * b1 * hw + Math.pow(b1, 3) + 0.5 * b1 * b1 * hw * kf;
  if (denom <= 0) return 1;
  const K = ((E * Math.pow(t, 3)) / (4 * (1 - nu * nu))) * (1 / denom); // Н/мм на мм
  const sigmaCrS = (2 * Math.sqrt(K * E * Is)) / As;
  if (!isFinite(sigmaCrS) || sigmaCrS <= 0) return 1;
  const lambdaD = Math.sqrt(fy / sigmaCrS);
  return chiDistortional(lambdaD);
}

/** Поправка на скругления гибов, EN 1993-1-3, п. 5.1.4(3). */
function roundingCorrection(def: SectionDef): number {
  const { strips, corners } = buildMidline(def);
  if (corners === 0) return 0;
  const r = def.rFactor * def.t;
  const sumBp = strips.reduce((acc, s) => acc + Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v), 0);
  if (sumBp <= 0) return 0;
  // Все гибы приняты под 90°
  const delta = (0.43 * (corners * r)) / sumBp;
  return Math.min(0.25, Math.max(0, delta));
}

/**
 * Эффективный момент сопротивления при изгибе: итерация по положению нейтральной оси
 * эффективного сечения (норма допускает 1–2 итерации, здесь 3).
 */
function effectiveBending(
  def: SectionDef,
  fy: number,
  gross: GrossProps,
  compressedSide: "top" | "bot",
  deltaRound: number
): number {
  const t = def.t;
  const { strips, closed } = buildMidline(def);
  const lipChi = def.c > 0 && !closed ? distortionalReduction(def, fy) : 1;
  let na = gross.cv; // положение нейтральной оси (в исходных координатах средней линии)

  let effStrips: Strip[] = strips;
  let props = stripProps(strips);
  for (let iter = 0; iter < 3; iter++) {
    effStrips = [];
    for (const s of strips) {
      const L = Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v);
      if (L === 0) continue;
      // Напряжения по краям элемента пропорциональны расстоянию до нейтральной оси.
      // Знак: сжатие положительно.
      const sign = compressedSide === "top" ? 1 : -1;
      const s1 = sign * (s.a.v - na);
      const s2 = sign * (s.b.v - na);
      const maxAbs = Math.max(Math.abs(s1), Math.abs(s2));
      if (maxAbs < 1e-9 || Math.max(s1, s2) <= 0) {
        // Полностью растянутый элемент — эффективен целиком
        effStrips.push(s);
        continue;
      }
      // Край 1 — более сжатый
      const comp1 = s1 >= s2;
      const sigma1 = comp1 ? s1 : s2;
      const sigma2 = comp1 ? s2 : s1;
      const psi = sigma1 !== 0 ? sigma2 / sigma1 : 1;
      const isOutstand = s.kind === "lip";
      const kSig = isOutstand ? 0.5 : kSigmaInternal(psi);
      const lam = plateSlenderness(L, t, kSig, fy);
      const rho = isOutstand ? rhoOutstand(lam) : rhoInternal(lam);
      if (isOutstand) {
        const oriented = comp1 ? s : ({ a: s.b, b: s.a, t: s.t, kind: s.kind } as Strip);
        effStrips.push(scaleStrip(oriented, rho, lipChi));
      } else {
        const parts = effectiveInternalParts(L, psi, rho);
        const oriented = comp1 ? s : ({ a: s.b, b: s.a, t: s.t, kind: s.kind } as Strip);
        if (psi >= 0) {
          effStrips.push(...splitStrip(oriented, parts.be1, parts.be2));
        } else {
          // Сжатая зона длиной bc от более сжатого края + вся растянутая часть
          const L1 = Math.hypot(oriented.b.u - oriented.a.u, oriented.b.v - oriented.a.v);
          const nu = (oriented.b.u - oriented.a.u) / L1;
          const nv = (oriented.b.v - oriented.a.v) / L1;
          const bc = parts.bc;
          const compPart: Strip = {
            a: oriented.a,
            b: { u: oriented.a.u + nu * bc, v: oriented.a.v + nv * bc },
            t: oriented.t,
            kind: oriented.kind,
          };
          effStrips.push(...splitStrip(compPart, parts.be1, parts.be2));
          effStrips.push({
            a: { u: oriented.a.u + nu * bc, v: oriented.a.v + nv * bc },
            b: oriented.b,
            t: oriented.t,
            kind: oriented.kind,
          });
        }
      }
    }
    props = stripProps(effStrips);
    na = props.cv;
  }

  const halfT = t / 2;
  const vs = effStrips.flatMap((s) => [s.a.v, s.b.v]);
  const vTop = Math.max(...vs) + halfT;
  const vBot = Math.min(...vs) - halfT;
  const Ieff = props.Iu * (1 - 2 * deltaRound);
  const cTop = vTop - props.cv;
  const cBot = props.cv - vBot;
  const c = compressedSide === "top" ? Math.max(cTop, cBot) : Math.max(cTop, cBot);
  return c > 0 ? Ieff / c : 0;
}

// ---------------------------------------------------------------------------
// Публичная функция
// ---------------------------------------------------------------------------

/** Полные характеристики сечения. rho — плотность стали, кг/м³. */
export function sectionProperties(def: SectionDef, fy: number, rho = 7850): SectionProps {
  const warnings: string[] = [];

  if (def.shape === "CUSTOM") {
    const m: ManualSectionProps = def.manual ?? {
      A: 0,
      Ix: 0,
      Iy: 0,
      Wx: 0,
      Wy: 0,
      ix: 0,
      iy: 0,
      It: 0,
      Iw: 0,
    };
    const A = cm2ToMm2(m.A);
    const Iu = cm4ToMm4(m.Ix);
    const Iv = cm4ToMm4(m.Iy);
    const Wu = cm3ToMm3(m.Wx);
    const Wv = cm3ToMm3(m.Wy);
    const Aeff = m.Aeff !== undefined && m.Aeff > 0 ? cm2ToMm2(m.Aeff) : A;
    const Weff = m.Weff !== undefined && m.Weff > 0 ? cm3ToMm3(m.Weff) : Wu;
    if (m.Aeff === undefined || m.Weff === undefined) {
      warnings.push(
        "Сечение задано вручную: эффективные характеристики приняты равными полным. Для тонкостенного профиля это НЕ в запас — задайте Aeff и Weff явно."
      );
    }
    const gross: GrossProps = {
      A,
      cu: 0,
      cv: 0,
      Iu,
      Iv,
      Iuv: 0,
      vMax: Wu > 0 ? Iu / Wu : def.h / 2,
      vMin: Wu > 0 ? -Iu / Wu : -def.h / 2,
      uMax: Wv > 0 ? Iv / Wv : def.b / 2,
      uMin: Wv > 0 ? -Iv / Wv : -def.b / 2,
      Wu,
      Wv,
      iu: A > 0 ? Math.sqrt(Iu / A) : 0,
      iv: A > 0 ? Math.sqrt(Iv / A) : 0,
      It: cm4ToMm4(m.It),
      Iw: cm6ToMm6(m.Iw),
      shearCenter: { u: 0, v: 0 },
      developedWidth: def.t > 0 ? A / def.t : 0,
      Aweb: def.h * def.t,
      hw: def.h - def.t,
      webAngleDeg: 0,
    };
    return {
      ...gross,
      key: def.key,
      name: def.name,
      manual: true,
      massPerM: (A / 1e6) * rho,
      warnings,
      effective: {
        Aeff,
        WeffTop: Weff,
        WeffBot: Weff,
        eN: { u: 0, v: 0 },
        detail: [],
        fullyEffective: Aeff >= A * 0.999,
      },
    };
  }

  const { strips, closed } = buildMidline(def);
  const raw = stripProps(strips);
  const delta = roundingCorrection(def);

  const halfT = def.t / 2;
  const allV = strips.flatMap((s) => [s.a.v, s.b.v]);
  const allU = strips.flatMap((s) => [s.a.u, s.b.u]);
  const vMax = Math.max(...allV) + halfT - raw.cv;
  const vMin = Math.min(...allV) - halfT - raw.cv;
  const uMax = Math.max(...allU) + halfT - raw.cu;
  const uMin = Math.min(...allU) - halfT - raw.cu;

  const A = raw.A * (1 - delta);
  const Iu = raw.Iu * (1 - 2 * delta);
  const Iv = raw.Iv * (1 - 2 * delta);

  // Кручение
  const developedWidth = strips.reduce((acc, s) => acc + Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v), 0);
  let It: number;
  let Iw: number;
  let shearCenter = { u: 0, v: 0 };
  if (closed) {
    // Замкнутое сечение — формула Бредта It = 4·Am²/∮(ds/t)
    const bw = def.b - def.t;
    const hm = def.h - def.t;
    const Am = bw * hm;
    const perimeter = 2 * (bw + hm);
    It = (4 * Am * Am) / (perimeter / def.t);
    Iw = 0; // депланация замкнутого прямоугольного сечения пренебрежимо мала
  } else {
    It = strips.reduce((acc, s) => {
      const L = Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v);
      return acc + (L * Math.pow(s.t, 3)) / 3;
    }, 0);
    const sect = computeSectorialProps(strips, raw);
    Iw = sect.Iw;
    shearCenter = sect.shearCenter;
  }

  // Стенка для проверки среза
  const webStrips = strips.filter((s) => s.kind === "web");
  const hw = webStrips.reduce((acc, s) => acc + Math.abs(s.b.v - s.a.v), 0) || def.h - def.t;
  const Aweb = webStrips.reduce((acc, s) => acc + Math.hypot(s.b.u - s.a.u, s.b.v - s.a.v) * s.t, 0) || hw * def.t;
  const webAngleDeg = 0;

  const gross: GrossProps = {
    A,
    cu: raw.cu,
    cv: raw.cv,
    Iu,
    Iv,
    Iuv: raw.Iuv * (1 - 2 * delta),
    vMax,
    vMin,
    uMax,
    uMin,
    Wu: Iu / Math.max(Math.abs(vMax), Math.abs(vMin)),
    Wv: Iv / Math.max(Math.abs(uMax), Math.abs(uMin)),
    iu: A > 0 ? Math.sqrt(Iu / A) : 0,
    iv: A > 0 ? Math.sqrt(Iv / A) : 0,
    It,
    Iw,
    shearCenter,
    developedWidth,
    Aweb,
    hw,
    webAngleDeg,
  };

  const effective = computeEffective({ def, fy, gross });

  if (def.h / def.t > 500) warnings.push("Отношение h/t > 500 — вне области применения EN 1993-1-3 (п. 5.2).");
  if (def.t < 0.45) warnings.push("Толщина менее 0,45 мм — вне области применения EN 1993-1-3.");
  if (Math.abs(gross.Iuv) > 0.01 * Math.sqrt(gross.Iu * gross.Iv)) {
    warnings.push(
      "Сечение несимметричное (Iuv ≠ 0): главные оси повёрнуты. Проверки выполняются относительно геометрических осей — требуется уточнение для косого изгиба."
    );
  }

  return {
    ...gross,
    key: def.key,
    name: def.name,
    manual: false,
    massPerM: (A / 1e6) * rho,
    effective,
    warnings,
  };
}
