// Снеговая нагрузка.
//
// Ветка 1 (по умолчанию): СП РК EN 1991-1-3 — s = μi · Ce · Ct · sk
// Ветка 2: СП 20.13330.2016 — S = 0,7 · ce · ct · μ · Sg
// Ветка 3: ручной ввод характеристического значения.
//
// Все нагрузки выводятся в кПа (кН/м²). Нагрузка s относится к ГОРИЗОНТАЛЬНОЙ ПРОЕКЦИИ.

import { ClimateInput, FormulaLine, Warning } from "./types";
import { fmt } from "./units";

export interface SnowLoadCase {
  key: string;
  label: string;
  ref: string;
  note: string;
  /**
   * Множитель интенсивности в зависимости от положения по скату:
   * f = 0 — нижняя кромка, f = 1 — верхняя кромка.
   */
  distribution: (f: number) => number;
  /** Доля длины стола, на которую действует нагрузка (для схем с частичным загружением) */
  lengthFraction: number;
  /** Признак несимметричной схемы вдоль стола (важна для связей и стыков) */
  asymmetricAlongTable: boolean;
}

/** Плотность гололёдных отложений, кг/м³ (ISO 12494 / СП 20.13330, разд. 12). */
export const ICE_DENSITY = 900;

/**
 * Гололёдная нагрузка на плоскость панели: вес слоя льда толщиной b.
 * g = ρ · b · g₀ — приводится к кПа на 1 м² поверхности.
 */
export function iceLoadKPa(thicknessMm: number, density = ICE_DENSITY): number {
  return (density * (thicknessMm / 1000) * 9.80665) / 1000;
}

export interface SnowResult {
  /** Характеристическое значение на грунт с учётом поправок, кПа */
  sk: number;
  /** Исходное районное значение до поправок, кПа */
  skBase: number;
  /** Коэффициент формы */
  mu1: number;
  Ce: number;
  Ct: number;
  /** Снеговая нагрузка на горизонтальную проекцию, кПа */
  s: number;
  /** То же, отнесённая к плоскости ската, кПа */
  sSlope: number;
  /** Коэффициент перехода к расчётному значению (для СП 20 — γf) */
  gammaF: number;
  /** Гололёдная нагрузка на плоскость панели, кПа (0 — не учитывается) */
  iceKPa: number;
  formulas: FormulaLine[];
  cases: SnowLoadCase[];
  warnings: Warning[];
}

/**
 * Коэффициент формы односкатного покрытия, EN 1991-1-3, табл. 5.2:
 *   μ1 = 0,8            при α ≤ 30°
 *   μ1 = 0,8·(60−α)/30  при 30° < α < 60°
 *   μ1 = 0              при α ≥ 60°
 */
export function muMonopitch(alphaDeg: number): number {
  if (alphaDeg <= 30) return 0.8;
  if (alphaDeg >= 60) return 0;
  return (0.8 * (60 - alphaDeg)) / 30;
}

/**
 * Коэффициент формы по СП 20.13330.2016 (прил. Б.1) для односкатного покрытия:
 *   μ = 1,0 при α ≤ 30°; линейно до 0 при α = 60°.
 */
export function muMonopitchSP20(alphaDeg: number): number {
  if (alphaDeg <= 30) return 1.0;
  if (alphaDeg >= 60) return 0;
  return (60 - alphaDeg) / 30;
}

/**
 * Пересчёт снеговой нагрузки на другой период повторяемости.
 * EN 1991-1-3, прил. D: sn = sk·[1 − V·(√6/π)·(ln(−ln(1−1/n)) + 0,57722)] / (1 + 2,5923·V)
 */
export function snowReturnPeriodFactor(years: number, V = 0.2): number {
  if (years <= 1) return 1;
  const p = 1 / years;
  const num = 1 - V * (Math.sqrt(6) / Math.PI) * (Math.log(-Math.log(1 - p)) + 0.57722);
  const den = 1 + 2.5923 * V;
  return num / den;
}

export interface SnowInputs {
  climate: ClimateInput;
  alphaDeg: number;
  /** Характеристическое значение по району (или ручной ввод), кПа */
  skRegion: number;
  /** Опорная высота района над уровнем моря, м */
  regionAltitude: number;
  /** Прирост sk на каждые 100 м превышения над опорной высотой, доля */
  altitudeFactorPer100m: number;
  /** Высота нижней кромки панелей над землёй, мм */
  lowerEdgeHeight: number;
}

export function calcSnow(input: SnowInputs): SnowResult {
  const { climate, alphaDeg, skRegion, regionAltitude, altitudeFactorPer100m, lowerEdgeHeight } = input;
  const warnings: Warning[] = [];
  const formulas: FormulaLine[] = [];

  // --- Характеристическое значение на грунт ---
  const dAlt = Math.max(0, climate.altitude - regionAltitude);
  const altFactor = 1 + (altitudeFactorPer100m * dAlt) / 100;
  const skReturn =
    climate.returnPeriodYears === 50 || climate.norm !== "SP_RK_EN"
      ? 1
      : snowReturnPeriodFactor(climate.returnPeriodYears);
  const skBase = skRegion;
  const sk = skBase * altFactor * skReturn;

  if (dAlt > 0) {
    formulas.push({
      symbol: "sk",
      formula: "sk,район · (1 + k·ΔH/100) · cпов",
      substitution: `${fmt(skBase)} · (1 + ${fmt(altitudeFactorPer100m)}·${fmt(dAlt)}/100) · ${fmt(skReturn)}`,
      value: sk,
      unit: "кПа",
      ref: "EN 1991-1-3, п. 4.1 + национальное приложение (поправка на высоту)",
    });
    warnings.push({
      severity: "warning",
      scope: "Снег",
      message:
        "Поправка на высоту над уровнем моря выполнена по линейной зависимости с редактируемым коэффициентом. Формулу необходимо уточнить по национальному приложению СП РК EN 1991-1-3.",
    });
  } else {
    formulas.push({
      symbol: "sk",
      formula: "характеристическое значение снеговой нагрузки на грунт",
      substitution: `район «${climate.regionKey}»`,
      value: sk,
      unit: "кПа",
      ref: "EN 1991-1-3, п. 4.1",
    });
  }

  if (climate.returnPeriodYears !== 50 && climate.norm === "SP_RK_EN") {
    warnings.push({
      severity: "info",
      scope: "Снег",
      message: `Снеговая нагрузка пересчитана на период повторяемости ${climate.returnPeriodYears} лет (коэффициент ${fmt(
        skReturn
      )}) по EN 1991-1-3, прил. D. Базовое значение нормы соответствует 50 годам.`,
    });
  }

  // --- Коэффициент формы и нагрузка ---
  let mu1: number;
  let s: number;
  let gammaF: number;

  if (climate.norm === "SP20") {
    mu1 = muMonopitchSP20(alphaDeg);
    s = 0.7 * climate.Ce * climate.Ct * mu1 * sk;
    gammaF = 1.4;
    formulas.push({
      symbol: "μ",
      formula: "коэффициент перехода от веса снегового покрова к нагрузке",
      substitution: `α = ${fmt(alphaDeg)}°`,
      value: mu1,
      unit: "—",
      ref: "СП 20.13330.2016, прил. Б.1",
    });
    formulas.push({
      symbol: "S0",
      formula: "S = 0,7 · ce · ct · μ · Sg",
      substitution: `0,7 · ${fmt(climate.Ce)} · ${fmt(climate.Ct)} · ${fmt(mu1)} · ${fmt(sk)}`,
      value: s,
      unit: "кПа",
      ref: "СП 20.13330.2016, п. 10.1",
    });
  } else {
    mu1 = muMonopitch(alphaDeg);
    s = mu1 * climate.Ce * climate.Ct * sk;
    gammaF = 1.0; // расчётное значение формируется через γQ в сочетаниях
    formulas.push({
      symbol: "μ₁",
      formula: alphaDeg > 30 ? "μ₁ = 0,8·(60 − α)/30" : "μ₁ = 0,8",
      substitution: alphaDeg > 30 ? `0,8·(60 − ${fmt(alphaDeg)})/30` : "α ≤ 30°",
      value: mu1,
      unit: "—",
      ref: "EN 1991-1-3, табл. 5.2 (односкатное покрытие)",
    });
    formulas.push({
      symbol: "s",
      formula: "s = μ₁ · Ce · Ct · sk",
      substitution: `${fmt(mu1)} · ${fmt(climate.Ce)} · ${fmt(climate.Ct)} · ${fmt(sk)}`,
      value: s,
      unit: "кПа",
      ref: "EN 1991-1-3, п. 5.2(3)",
    });
  }

  const alphaRad = (alphaDeg * Math.PI) / 180;
  const sSlope = s * Math.cos(alphaRad);
  formulas.push({
    symbol: "s⊥",
    formula: "s⊥ = s · cos α (нагрузка, отнесённая к 1 м² плоскости ската)",
    substitution: `${fmt(s)} · cos ${fmt(alphaDeg)}°`,
    value: sSlope,
    unit: "кПа",
    ref: "EN 1991-1-3, п. 5.2 (нагрузка задана на горизонтальную проекцию)",
  });

  // --- Схемы загружения ---
  const cases: SnowLoadCase[] = [
    {
      key: "S1",
      label: "С1 — равномерный снег на всём столе",
      ref: "EN 1991-1-3, п. 5.3.3 (случай (i) — незанесённый снег)",
      note: "Основная схема.",
      distribution: () => 1,
      lengthFraction: 1,
      asymmetricAlongTable: false,
    },
    {
      key: "S2",
      label: "С2 — снег на половине длины стола",
      ref: "EN 1991-1-3, п. 5.3.3 (несимметричное загружение)",
      note: "Определяющая схема для связей, стыков прогонов и кручения стола.",
      distribution: () => 1,
      lengthFraction: 0.5,
      asymmetricAlongTable: true,
    },
    {
      key: "S3a",
      label: "С3а — снег только на верхнем ряду панелей",
      ref: "EN 1991-1-3, п. 5.3.3 (частичное загружение ската)",
      note: "Критична для балки и подпорки: нагрузка смещена к задней стойке.",
      distribution: (f) => (f >= 0.5 ? 1 : 0),
      lengthFraction: 1,
      asymmetricAlongTable: false,
    },
    {
      key: "S3b",
      label: "С3b — снег только на нижнем ряду панелей",
      ref: "EN 1991-1-3, п. 5.3.3 (частичное загружение ската)",
      note: "Критична для свеса балки и передней стойки.",
      distribution: (f) => (f < 0.5 ? 1 : 0),
      lengthFraction: 1,
      asymmetricAlongTable: false,
    },
  ];

  // --- Скопление снега у нижней кромки ---
  if (lowerEdgeHeight < 1000) {
    cases.push({
      key: "S4",
      label: "С4 — скопление (сползание) снега у нижней кромки",
      ref: "EN 1991-1-3, п. 5.3.6 / п. 6.2 (снеговые мешки и сползание)",
      note: `Высота нижней кромки ${fmt(lowerEdgeHeight)} мм < 1000 мм: у нижней кромки принят повышающий коэффициент 2,0 на 30 % длины ската.`,
      distribution: (f) => (f < 0.3 ? 2.0 : 1),
      lengthFraction: 1,
      asymmetricAlongTable: false,
    });
    warnings.push({
      severity: "warning",
      scope: "Снег",
      message: `Нижняя кромка панелей на высоте ${fmt(
        lowerEdgeHeight
      )} мм над землёй. При снежном покрове возможно подпирание и скопление снега у нижнего края — введена схема С4 с коэффициентом 2,0. Рекомендуется поднять нижнюю кромку выше расчётной высоты снегового покрова.`,
    });
  }

  if (alphaDeg > 15) {
    warnings.push({
      severity: "info",
      scope: "Снег",
      message:
        "Поверхность панелей гладкая (низкий коэффициент трения): возможно лавинообразное сползание снега. Схема С3 (снег на одном ряду) учитывает это состояние; при наличии снегозадержания нагрузку у нижней кромки следует увеличить.",
    });
  }

  if (climate.Ce < 1.0) {
    warnings.push({
      severity: "warning",
      scope: "Снег",
      message: `Принят коэффициент окружения Ce = ${fmt(
        climate.Ce
      )} (открытая местность). Для наземных СЭС в запас рекомендуется Ce = 1,0: между рядами панелей снег переносится ветром и накапливается.`,
    });
  }

  // --- Гололёд (опционально) ---
  const iceKPa = climate.iceEnabled ? iceLoadKPa(climate.iceThicknessMm) : 0;
  if (iceKPa > 0) {
    formulas.push({
      symbol: "g_лёд",
      formula: "g = ρ_льда · b · g₀",
      substitution: `${ICE_DENSITY} кг/м³ · ${fmt(climate.iceThicknessMm)} мм · 9,81 м/с²`,
      value: iceKPa,
      unit: "кПа",
      ref: "ISO 12494 / СП 20.13330.2016, разд. 12 (гололёдные нагрузки)",
    });
    cases.push({
      key: "ICE",
      label: `Гололёд (стенка льда ${fmt(climate.iceThicknessMm)} мм)`,
      ref: "ISO 12494 / СП 20.13330.2016, разд. 12",
      note: "Гололёд и снег рассматриваются как альтернативные воздействия, одновременно не суммируются.",
      distribution: () => 1,
      lengthFraction: 1,
      asymmetricAlongTable: false,
    });
    warnings.push({
      severity: "info",
      scope: "Гололёд",
      message: `Учтена гололёдная нагрузка ${fmt(
        iceKPa
      )} кПа на плоскость панели (слой льда ${fmt(climate.iceThicknessMm)} мм). Толщина стенки гололёда должна приниматься по району согласно карте гололёдных районов.`,
    });
  }

  return { sk, skBase, mu1, Ce: climate.Ce, Ct: climate.Ct, s, sSlope, gammaF, iceKPa, formulas, cases, warnings };
}
