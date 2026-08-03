/**
 * Расчет потери напряжения в кабельной линии по активному сопротивлению
 * (реактивное сопротивление не учитывается — для сечений до 95 мм²
 * погрешность несущественна, о чем сказано в интерфейсе).
 */

export type Conductor = "copper" | "aluminum";
export type System = "single" | "three";

/** Удельное сопротивление при 20 °C, Ом·мм²/м */
export const RESISTIVITY: Record<Conductor, number> = {
  copper: 0.0175,
  aluminum: 0.028,
};

/** Стандартный ряд сечений жил, мм² */
export const STANDARD_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240] as const;

export interface VoltageDropInput {
  system: System;
  /** Номинальное напряжение, В (фазное 220 для однофазной, линейное 380 для трехфазной) */
  voltage: number;
  /** Расчетный ток, А */
  current: number;
  /** Коэффициент мощности нагрузки */
  cosPhi: number;
  /** Длина линии в одну сторону, м */
  lengthM: number;
  conductor: Conductor;
}

export interface SectionResult {
  sectionMm2: number;
  dropV: number;
  dropPercent: number;
}

/** Ток по мощности: P в кВт → I в А */
export function currentFromPower(powerKw: number, system: System, voltage: number, cosPhi: number): number {
  const p = powerKw * 1000;
  if (voltage <= 0 || cosPhi <= 0) return 0;
  return system === "single" ? p / (voltage * cosPhi) : p / (Math.sqrt(3) * voltage * cosPhi);
}

/**
 * Потеря напряжения для заданного сечения.
 * Однофазная линия: ΔU = 2·I·ρ·L·cosφ / S
 * Трехфазная линия: ΔU = √3·I·ρ·L·cosφ / S
 */
export function voltageDrop(input: VoltageDropInput, sectionMm2: number): SectionResult {
  const { system, voltage, current, cosPhi, lengthM, conductor } = input;
  const rho = RESISTIVITY[conductor];
  const factor = system === "single" ? 2 : Math.sqrt(3);
  const dropV = sectionMm2 > 0 ? (factor * current * rho * lengthM * cosPhi) / sectionMm2 : 0;
  const dropPercent = voltage > 0 ? (dropV / voltage) * 100 : 0;
  return { sectionMm2, dropV, dropPercent };
}

export function allSections(input: VoltageDropInput): SectionResult[] {
  return STANDARD_SECTIONS.map((s) => voltageDrop(input, s));
}

/** Минимальное стандартное сечение, укладывающееся в допустимую потерю, либо null */
export function recommendSection(input: VoltageDropInput, maxDropPercent: number): SectionResult | null {
  for (const s of STANDARD_SECTIONS) {
    const r = voltageDrop(input, s);
    if (r.dropPercent <= maxDropPercent) return r;
  }
  return null;
}
