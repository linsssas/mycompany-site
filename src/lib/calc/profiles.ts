import { SectionProperties, ElementRole } from "./types";

/**
 * Библиотека типовых стальных профилей.
 * Значения приведены по справочным таблицам ГОСТ 30245 (гнутые замкнутые профили),
 * ГОСТ 8240 (швеллеры), ГОСТ 8509 (уголки равнополочные), ГОСТ 8239 (двутавры).
 * ВНИМАНИЕ: значения носят справочный характер для целей предварительного расчета —
 * перед выпуском рабочей документации сверяйте сортамент с актуальным ГОСТ/EN.
 */
export const PROFILE_LIBRARY: SectionProperties[] = [
  // Квадратные гнутые профили (ГОСТ 30245)
  { name: "Труба проф. 40x40x2", standard: "ГОСТ 30245", h: 40, b: 40, t: 2, area: 2.95, mass: 2.32, Ix: 8.02, Iy: 8.02, Wx: 4.01, Wy: 4.01, ix: 1.65, iy: 1.65 },
  { name: "Труба проф. 40x40x3", standard: "ГОСТ 30245", h: 40, b: 40, t: 3, area: 4.24, mass: 3.33, Ix: 10.85, Iy: 10.85, Wx: 5.43, Wy: 5.43, ix: 1.6, iy: 1.6 },
  { name: "Труба проф. 50x50x2", standard: "ГОСТ 30245", h: 50, b: 50, t: 2, area: 3.75, mass: 2.95, Ix: 16.4, Iy: 16.4, Wx: 6.56, Wy: 6.56, ix: 2.09, iy: 2.09 },
  { name: "Труба проф. 50x50x3", standard: "ГОСТ 30245", h: 50, b: 50, t: 3, area: 5.44, mass: 4.27, Ix: 22.6, Iy: 22.6, Wx: 9.04, Wy: 9.04, ix: 2.04, iy: 2.04 },
  { name: "Труба проф. 60x60x3", standard: "ГОСТ 30245", h: 60, b: 60, t: 3, area: 6.63, mass: 5.2, Ix: 40.2, Iy: 40.2, Wx: 13.4, Wy: 13.4, ix: 2.46, iy: 2.46 },
  { name: "Труба проф. 60x60x4", standard: "ГОСТ 30245", h: 60, b: 60, t: 4, area: 8.62, mass: 6.77, Ix: 50.8, Iy: 50.8, Wx: 16.9, Wy: 16.9, ix: 2.43, iy: 2.43 },
  { name: "Труба проф. 80x80x4", standard: "ГОСТ 30245", h: 80, b: 80, t: 4, area: 11.8, mass: 9.28, Ix: 126, Iy: 126, Wx: 31.5, Wy: 31.5, ix: 3.27, iy: 3.27 },
  { name: "Труба проф. 80x80x5", standard: "ГОСТ 30245", h: 80, b: 80, t: 5, area: 14.5, mass: 11.4, Ix: 150, Iy: 150, Wx: 37.5, Wy: 37.5, ix: 3.22, iy: 3.22 },
  { name: "Труба проф. 100x100x4", standard: "ГОСТ 30245", h: 100, b: 100, t: 4, area: 15.1, mass: 11.9, Ix: 260, Iy: 260, Wx: 52, Wy: 52, ix: 4.15, iy: 4.15 },
  { name: "Труба проф. 100x100x5", standard: "ГОСТ 30245", h: 100, b: 100, t: 5, area: 18.6, mass: 14.6, Ix: 313, Iy: 313, Wx: 62.6, Wy: 62.6, ix: 4.1, iy: 4.1 },
  // Прямоугольные гнутые профили
  { name: "Труба проф. 60x40x3", standard: "ГОСТ 30245", h: 60, b: 40, t: 3, area: 5.64, mass: 4.43, Ix: 27.4, Iy: 14.0, Wx: 9.13, Wy: 7.02, ix: 2.2, iy: 1.58 },
  { name: "Труба проф. 80x40x3", standard: "ГОСТ 30245", h: 80, b: 40, t: 3, area: 6.84, mass: 5.37, Ix: 53.5, Iy: 17.3, Wx: 13.4, Wy: 8.65, ix: 2.8, iy: 1.59 },
  { name: "Труба проф. 100x50x4", standard: "ГОСТ 30245", h: 100, b: 50, t: 4, area: 11.0, mass: 8.62, Ix: 132, Iy: 44.0, Wx: 26.4, Wy: 17.6, ix: 3.46, iy: 2.0 },
  // Швеллеры (ГОСТ 8240-97)
  { name: "Швеллер 5", standard: "ГОСТ 8240", h: 50, b: 32, t: 4.4, area: 6.16, mass: 4.84, Ix: 22.8, Iy: 5.61, Wx: 9.1, Wy: 2.75, ix: 1.92, iy: 0.95 },
  { name: "Швеллер 8", standard: "ГОСТ 8240", h: 80, b: 40, t: 4.5, area: 8.98, mass: 7.05, Ix: 89.4, Iy: 12.8, Wx: 22.4, Wy: 4.75, ix: 3.16, iy: 1.19 },
  { name: "Швеллер 10", standard: "ГОСТ 8240", h: 100, b: 46, t: 4.5, area: 10.9, mass: 8.59, Ix: 174, Iy: 20.4, Wx: 34.8, Wy: 6.46, ix: 4.0, iy: 1.37 },
  { name: "Швеллер 12", standard: "ГОСТ 8240", h: 120, b: 52, t: 4.8, area: 13.3, mass: 10.4, Ix: 304, Iy: 31.2, Wx: 50.6, Wy: 8.52, ix: 4.78, iy: 1.53 },
  { name: "Швеллер 16", standard: "ГОСТ 8240", h: 160, b: 64, t: 5.0, area: 18.1, mass: 14.2, Ix: 747, Iy: 63.3, Wx: 93.4, Wy: 13.8, ix: 6.42, iy: 1.87 },
  // Равнополочные уголки (ГОСТ 8509-93)
  { name: "Уголок 50x5", standard: "ГОСТ 8509", h: 50, b: 50, t: 5, area: 4.8, mass: 3.77, Ix: 11.2, Iy: 11.2, Wx: 3.05, Wy: 3.05, ix: 1.53, iy: 1.53 },
  { name: "Уголок 63x5", standard: "ГОСТ 8509", h: 63, b: 63, t: 5, area: 6.13, mass: 4.81, Ix: 23.1, Iy: 23.1, Wx: 5.06, Wy: 5.06, ix: 1.94, iy: 1.94 },
  { name: "Уголок 75x6", standard: "ГОСТ 8509", h: 75, b: 75, t: 6, area: 8.78, mass: 6.89, Ix: 47.0, Iy: 47.0, Wx: 8.62, Wy: 8.62, ix: 2.31, iy: 2.31 },
  { name: "Уголок 90x7", standard: "ГОСТ 8509", h: 90, b: 90, t: 7, area: 12.3, mass: 9.64, Ix: 93.4, Iy: 93.4, Wx: 14.5, Wy: 14.5, ix: 2.76, iy: 2.76 },
  { name: "Уголок 100x8", standard: "ГОСТ 8509", h: 100, b: 100, t: 8, area: 15.6, mass: 12.2, Ix: 147, Iy: 147, Wx: 20.3, Wy: 20.3, ix: 3.07, iy: 3.07 },
  // Двутавры (ГОСТ 8239-89) — балки
  { name: "Двутавр 10", standard: "ГОСТ 8239", h: 100, b: 55, t: 4.5, area: 12.0, mass: 9.46, Ix: 198, Iy: 17.9, Wx: 39.7, Wy: 6.49, ix: 4.06, iy: 1.22 },
  { name: "Двутавр 12", standard: "ГОСТ 8239", h: 120, b: 64, t: 4.8, area: 14.7, mass: 11.5, Ix: 350, Iy: 27.9, Wx: 58.4, Wy: 8.72, ix: 4.88, iy: 1.38 },
  { name: "Двутавр 14", standard: "ГОСТ 8239", h: 140, b: 73, t: 4.9, area: 17.4, mass: 13.7, Ix: 572, Iy: 41.9, Wx: 81.7, Wy: 11.5, ix: 5.73, iy: 1.55 },
];

export const DEFAULT_PROFILE_BY_ROLE: Record<ElementRole, string> = {
  post: "Труба проф. 80x80x4",
  beam: "Швеллер 10",
  purlin: "Труба проф. 60x40x3",
  brace: "Труба проф. 50x50x3",
  diagonal: "Уголок 50x5",
};

export function findProfile(name: string): SectionProperties | undefined {
  return PROFILE_LIBRARY.find((p) => p.name === name);
}

export function emptyCustomSection(): SectionProperties {
  return {
    name: "Пользовательский профиль",
    h: 50,
    b: 50,
    t: 3,
    area: 0,
    mass: 0,
    Ix: 0,
    Iy: 0,
    Wx: 0,
    Wy: 0,
  };
}

/** Расчет геометрических характеристик прямоугольной трубы по введенным размерам (h, b, t, мм) */
export function computeRectTubeProperties(h: number, b: number, t: number, densityKgM3 = 7850): Pick<SectionProperties, "area" | "mass" | "Ix" | "Iy" | "Wx" | "Wy" | "ix" | "iy"> {
  const hi = h - 2 * t;
  const bi = b - 2 * t;
  const A = h * b - Math.max(hi, 0) * Math.max(bi, 0); // мм²
  const Ix = (b * h ** 3 - Math.max(bi, 0) * Math.max(hi, 0) ** 3) / 12; // мм⁴
  const Iy = (h * b ** 3 - Math.max(hi, 0) * Math.max(bi, 0) ** 3) / 12; // мм⁴
  const Wx = Ix / (h / 2);
  const Wy = Iy / (b / 2);
  const areaCm2 = A / 100;
  const massKgM = (A / 1e6) * densityKgM3; // кг/м
  return {
    area: areaCm2,
    mass: massKgM,
    Ix: Ix / 1e4, // см⁴
    Iy: Iy / 1e4,
    Wx: Wx / 1e3, // см³
    Wy: Wy / 1e3,
    ix: Math.sqrt(Ix / A) / 10,
    iy: Math.sqrt(Iy / A) / 10,
  };
}
