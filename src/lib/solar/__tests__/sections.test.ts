import { describe, it, expect } from "vitest";
import {
  sectionProperties,
  buildMidline,
  stripProps,
  computeSectorialProps,
  rhoInternal,
  rhoOutstand,
  plateSlenderness,
  kSigmaInternal,
} from "../sections";
import { SectionDef } from "../types";

function closeRel(actual: number, expected: number, rel = 1e-4) {
  expect(Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12)).toBeLessThan(rel);
}

const base = { c: 0, rFactor: 1.5, coating: "Sz" as const };

describe("Швеллер (C-профиль)", () => {
  const def: SectionDef = { ...base, key: "c", name: "C 200×60×2", shape: "C", h: 200, b: 60, t: 2 };
  const hm = def.h - def.t; // высота стенки по средней линии
  const bm = def.b - def.t / 2; // ширина полки по средней линии
  const { strips } = buildMidline(def);
  const raw = stripProps(strips);
  const sect = computeSectorialProps(strips, raw);

  it("центр изгиба лежит на e = 3b²/(h+6b) от средней линии стенки", () => {
    const e = (3 * bm * bm) / (hm + 6 * bm);
    // Координата возвращается относительно центра тяжести
    closeRel(sect.shearCenter.u, -e - raw.cu, 1e-3);
  });

  it("центр изгиба лежит на оси симметрии", () => {
    expect(Math.abs(sect.shearCenter.v)).toBeLessThan(1e-6);
  });

  it("секториальный момент инерции совпадает с формулой Iw = h²b³t(3b+2h)/(12(6b+h))", () => {
    const expected = ((hm * hm * Math.pow(bm, 3) * def.t) / 12) * ((3 * bm + 2 * hm) / (6 * bm + hm));
    closeRel(sect.Iw, expected, 1e-3);
  });

  it("площадь равна площади развёртки за вычетом поправки на скругления", () => {
    const props = sectionProperties(def, 350);
    const developed = hm + 2 * bm;
    expect(props.A).toBeLessThan(developed * def.t);
    expect(props.A).toBeGreaterThan(developed * def.t * 0.9);
  });

  it("момент инерции при свободном кручении It = Σ b·t³/3", () => {
    const props = sectionProperties(def, 350);
    closeRel(props.It, ((hm + 2 * bm) * Math.pow(def.t, 3)) / 3);
  });
});

describe("Уголок", () => {
  const def: SectionDef = { ...base, key: "a", name: "L 76×36×1,5", shape: "ANGLE", h: 76, b: 36, t: 1.5 };
  const props = sectionProperties(def, 350);

  it("депланация практически отсутствует (Iw ≈ 0)", () => {
    // Для уголка центр изгиба совпадает с точкой пересечения полок,
    // поэтому первичная секториальная жёсткость пренебрежимо мала.
    const ref = Math.pow(def.h, 2) * Math.pow(def.b, 3) * def.t; // масштаб величины Iw
    expect(props.Iw / ref).toBeLessThan(1e-5);
  });

  it("центр изгиба находится в точке пересечения полок", () => {
    // Точка пересечения — начало координат средней линии, центр тяжести смещён на (cu, cv)
    const { strips } = buildMidline(def);
    const raw = stripProps(strips);
    closeRel(props.shearCenter.u, -raw.cu, 2e-2);
    closeRel(props.shearCenter.v, -raw.cv, 2e-2);
  });
});

describe("Прямоугольная труба", () => {
  const def: SectionDef = { ...base, key: "r", name: "40×60×2", shape: "RHS", h: 60, b: 40, t: 2 };
  const hm = def.h - def.t;
  const bm = def.b - def.t;

  it("момент инерции равен t·h²(h+3b)/6 (до поправки на скругления)", () => {
    const { strips } = buildMidline(def);
    const raw = stripProps(strips);
    closeRel(raw.Iu, (def.t * hm * hm * (hm + 3 * bm)) / 6, 1e-3);
  });

  it("поправка на скругления уменьшает момент инерции", () => {
    const props = sectionProperties(def, 350);
    const { strips } = buildMidline(def);
    const raw = stripProps(strips);
    expect(props.Iu).toBeLessThan(raw.Iu);
    expect(props.Iu).toBeGreaterThan(raw.Iu * 0.85);
  });

  it("замкнутое сечение: It по формуле Бредта много больше открытого", () => {
    const props = sectionProperties(def, 350);
    const open = (2 * (hm + bm) * Math.pow(def.t, 3)) / 3;
    expect(props.It).toBeGreaterThan(open * 100);
    closeRel(props.It, (4 * Math.pow(hm * bm, 2)) / ((2 * (hm + bm)) / def.t), 1e-6);
  });

  it("депланация замкнутого сечения принята нулевой", () => {
    expect(sectionProperties(def, 350).Iw).toBe(0);
  });
});

describe("Эффективные характеристики (EN 1993-1-3, п. 5.5)", () => {
  it("компактное сечение полностью эффективно (Aeff = A)", () => {
    const def: SectionDef = { ...base, key: "s", name: "50×50×4", shape: "RHS", h: 50, b: 50, t: 4 };
    const p = sectionProperties(def, 235);
    expect(p.effective.fullyEffective).toBe(true);
    closeRel(p.effective.Aeff, p.A, 1e-9);
  });

  it("тонкостенное сечение с гибкой стенкой редуцируется", () => {
    const def: SectionDef = { ...base, key: "t", name: "C 200×60×2", shape: "C", h: 200, b: 60, t: 2 };
    const p = sectionProperties(def, 350);
    expect(p.effective.fullyEffective).toBe(false);
    expect(p.effective.Aeff).toBeLessThan(p.A * 0.8);
    expect(p.effective.Aeff).toBeGreaterThan(0);
  });

  it("редукция стенки соответствует ручному расчёту ρ", () => {
    const def: SectionDef = { ...base, key: "t", name: "C 200×60×2", shape: "C", h: 200, b: 60, t: 2 };
    const fy = 350;
    const p = sectionProperties(def, fy);
    const hm = def.h - def.t;
    const bm = def.b - def.t / 2;
    // Ручной расчёт: стенка при равномерном сжатии, ψ = 1, kσ = 4
    const lam = plateSlenderness(hm, def.t, kSigmaInternal(1), fy);
    const rho = rhoInternal(lam);
    // Полки при ψ = 1
    const lamF = plateSlenderness(bm, def.t, kSigmaInternal(1), fy);
    const rhoF = rhoInternal(lamF);
    const manualAeff = (rho * hm + 2 * rhoF * bm) * def.t;
    // Отличие только за счёт поправки на скругления (менее 10 %)
    closeRel(p.effective.Aeff, manualAeff * (p.A / ((hm + 2 * bm) * def.t)), 5e-3);
  });

  it("увеличение толщины повышает эффективную площадь", () => {
    const thin: SectionDef = { ...base, key: "1", name: "1", shape: "C", h: 150, b: 50, t: 1.5 };
    const thick: SectionDef = { ...thin, key: "2", t: 3 };
    const a = sectionProperties(thin, 350);
    const b = sectionProperties(thick, 350);
    expect(b.effective.Aeff / b.A).toBeGreaterThan(a.effective.Aeff / a.A);
  });

  it("отгиб (губка) повышает эффективность полки", () => {
    const noLip: SectionDef = { ...base, key: "1", name: "1", shape: "C", h: 110, b: 30, c: 0, t: 2 };
    const withLip: SectionDef = { ...noLip, key: "2", c: 10 };
    const a = sectionProperties(noLip, 350);
    const b = sectionProperties(withLip, 350);
    expect(b.effective.Aeff).toBeGreaterThan(a.effective.Aeff);
  });
});

describe("Коэффициенты редукции", () => {
  it("ρ = 1 при малой гибкости", () => {
    expect(rhoInternal(0.5)).toBe(1);
    expect(rhoOutstand(0.7)).toBe(1);
  });

  it("ρ убывает с ростом гибкости", () => {
    expect(rhoInternal(1.5)).toBeLessThan(rhoInternal(1.0));
    expect(rhoInternal(1.0)).toBeLessThanOrEqual(1);
  });

  it("kσ = 4,0 при равномерном сжатии внутреннего элемента", () => {
    expect(kSigmaInternal(1)).toBe(4.0);
  });

  it("kσ = 23,9 при чистом изгибе (ψ = −1)", () => {
    expect(kSigmaInternal(-1)).toBe(23.9);
  });
});

describe("Ручной ввод характеристик", () => {
  it("характеристики берутся из ввода без пересчёта", () => {
    const def: SectionDef = {
      ...base,
      key: "m",
      name: "Ручное",
      shape: "CUSTOM",
      h: 100,
      b: 50,
      t: 2,
      manual: { A: 5.5, Ix: 90, Iy: 25, Wx: 18, Wy: 7, ix: 4, iy: 2.1, It: 0.07, Iw: 500 },
    };
    const p = sectionProperties(def, 350);
    closeRel(p.A, 550, 1e-9); // 5,5 см² = 550 мм²
    closeRel(p.Iu, 900000, 1e-9); // 90 см⁴
    expect(p.manual).toBe(true);
    expect(p.warnings.length).toBeGreaterThan(0);
  });
});
