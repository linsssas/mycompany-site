// Конвертация единиц. Внутри расчётного ядра — только Н, мм, МПа.

export const N_PER_KN = 1000;
export const MM2_PER_M2 = 1e6;

/** кПа → Н/мм² (МПа) */
export const kPaToNmm2 = (kPa: number) => kPa / 1000;
/** Н/мм² → кПа */
export const nmm2TokPa = (v: number) => v * 1000;
/** кН → Н */
export const kNToN = (kN: number) => kN * 1000;
/** Н → кН */
export const nToKN = (n: number) => n / 1000;
/** Н·мм → кН·м */
export const nmmToKNm = (v: number) => v / 1e6;
/** кН·м → Н·мм */
export const kNmToNmm = (v: number) => v * 1e6;
/** мм² → см² */
export const mm2ToCm2 = (v: number) => v / 100;
/** мм⁴ → см⁴ */
export const mm4ToCm4 = (v: number) => v / 1e4;
/** мм³ → см³ */
export const mm3ToCm3 = (v: number) => v / 1000;
/** мм⁶ → см⁶ */
export const mm6ToCm6 = (v: number) => v / 1e6;
/** см² → мм² */
export const cm2ToMm2 = (v: number) => v * 100;
export const cm4ToMm4 = (v: number) => v * 1e4;
export const cm3ToMm3 = (v: number) => v * 1000;
export const cm6ToMm6 = (v: number) => v * 1e6;
/** Н/мм → кН/м */
export const nPerMmToKNPerM = (v: number) => v;
export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;

/** Округление до n значащих цифр (по умолчанию 3) — для вывода «без мусорных разрядов». */
export function sig(value: number, digits = 3): number {
  if (!isFinite(value) || value === 0) return 0;
  const mag = Math.ceil(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, digits - mag);
  return Math.round(value * factor) / factor;
}

/**
 * Форматирование числа для вывода: 3 значащие цифры, разделитель разрядов — узкий
 * пробел, десятичный разделитель — запятая (русская типографика).
 *
 * Реализовано вручную: Number.prototype.toLocaleString на порядок медленнее и
 * заметно тормозит расчёт, в котором формируются тысячи строк с подстановкой чисел.
 */
export function fmt(value: number, digits = 3): string {
  if (!isFinite(value)) return "—";
  const v = sig(value, digits);
  const abs = Math.abs(v);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4;
  const fixed = v.toFixed(decimals);
  let [intPart, fracPart] = fixed.split(".");
  let sign = "";
  if (intPart.startsWith("-")) {
    sign = "−";
    intPart = intPart.slice(1);
  }
  // Разделитель разрядов начиная с 5 знаков (1000 пишется слитно)
  if (intPart.length > 4) {
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  }
  if (fracPart) {
    fracPart = fracPart.replace(/0+$/, "");
  }
  return sign + intPart + (fracPart ? "," + fracPart : "");
}
