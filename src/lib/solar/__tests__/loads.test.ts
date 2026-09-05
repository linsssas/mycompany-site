import { describe, it, expect } from "vitest";
import { calcSnow, iceLoadKPa, muMonopitch, muMonopitchSP20, snowReturnPeriodFactor } from "../snow";
import { calcWind, roughnessFactor, windProbabilityFactor, interpolateCanopyCoefficients } from "../wind";
import { buildCombinations } from "../combinations";
import { ClimateInput, DesignInput } from "../types";
import { ElementaryCase } from "../analysis";
import { proflandPreset } from "../presets";

function closeRel(actual: number, expected: number, rel = 1e-6) {
  expect(Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12)).toBeLessThan(rel);
}

const climate: ClimateInput = {
  norm: "SP_RK_EN",
  regionKey: "astana",
  skManual: 1.5,
  vbManual: 24,
  terrain: "II",
  altitude: 350,
  Ct: 1.0,
  Ce: 1.0,
  returnPeriodYears: 50,
  serviceLifeYears: 25,
  iceEnabled: false,
  iceThicknessMm: 5,
  deltaT: 40,
  blockage: "both",
  useAsce: false,
};

describe("Снеговая нагрузка (EN 1991-1-3)", () => {
  it("μ₁ = 0,8 при α ≤ 30°", () => {
    expect(muMonopitch(0)).toBe(0.8);
    expect(muMonopitch(30)).toBe(0.8);
  });

  it("μ₁ = 0,72 при α = 33° (контрольное значение ТЗ)", () => {
    closeRel(muMonopitch(33), 0.72, 1e-9);
  });

  it("μ₁ = 0 при α ≥ 60°", () => {
    expect(muMonopitch(60)).toBe(0);
    expect(muMonopitch(75)).toBe(0);
  });

  it("μ по СП 20 равен 1,0 при малых углах", () => {
    expect(muMonopitchSP20(20)).toBe(1.0);
    expect(muMonopitchSP20(45)).toBeCloseTo(0.5, 10);
  });

  it("s = μ₁·Ce·Ct·sk", () => {
    const r = calcSnow({
      climate,
      alphaDeg: 33,
      skRegion: 1.5,
      regionAltitude: 350,
      altitudeFactorPer100m: 0.1,
      lowerEdgeHeight: 1500,
    });
    closeRel(r.s, 0.72 * 1.0 * 1.0 * 1.5, 1e-9);
    closeRel(r.sSlope, r.s * Math.cos((33 * Math.PI) / 180), 1e-9);
  });

  it("коэффициент периода повторяемости равен 1 при 50 годах", () => {
    closeRel(snowReturnPeriodFactor(50), 1, 5e-3);
  });

  it("уменьшение периода повторяемости снижает нагрузку", () => {
    expect(snowReturnPeriodFactor(25)).toBeLessThan(snowReturnPeriodFactor(50));
  });

  it("при низкой нижней кромке добавляется схема скопления снега С4", () => {
    const low = calcSnow({
      climate,
      alphaDeg: 33,
      skRegion: 1.5,
      regionAltitude: 350,
      altitudeFactorPer100m: 0.1,
      lowerEdgeHeight: 500,
    });
    expect(low.cases.some((c) => c.key === "S4")).toBe(true);
    expect(low.warnings.some((w) => w.message.includes("скопление") || w.message.includes("подпирание"))).toBe(true);
  });

  it("схема С3а нагружает только верхнюю половину ската", () => {
    const r = calcSnow({
      climate,
      alphaDeg: 33,
      skRegion: 1.5,
      regionAltitude: 350,
      altitudeFactorPer100m: 0.1,
      lowerEdgeHeight: 1500,
    });
    const s3a = r.cases.find((c) => c.key === "S3a")!;
    expect(s3a.distribution(0.75)).toBe(1);
    expect(s3a.distribution(0.25)).toBe(0);
  });
});

describe("Ветровая нагрузка (EN 1991-1-4)", () => {
  it("cr(z) = kr·ln(z/z0) для категории II", () => {
    const { cr, kr, z0 } = roughnessFactor(10, "II");
    closeRel(kr, 0.19, 1e-9); // z0 = z0,II → kr = 0,19
    closeRel(cr, 0.19 * Math.log(10 / z0), 1e-12);
  });

  it("ниже zmin принимается z = zmin", () => {
    const a = roughnessFactor(0.5, "II");
    const b = roughnessFactor(2.0, "II");
    closeRel(a.cr, b.cr, 1e-12);
  });

  it("cprob = 1 при периоде повторяемости 50 лет", () => {
    closeRel(windProbabilityFactor(50), 1, 1e-3);
  });

  it("qp = [1+7·Iv]·0,5·ρ·vm² — сверка с ручным расчётом", () => {
    const r = calcWind({
      climate,
      alphaDeg: 20,
      vbRegion: 24,
      w0Region: 0.38,
      zeMm: 3000,
      arefMm2: 100e6,
      slopeLengthMm: 4000,
      frontalAreaMm2: 2e6,
      frameCount: 15,
      edgeZoneFactor: 1.4,
      alongMinFraction: 0.05,
    });
    const { cr, z0, zUsed } = roughnessFactor(3, "II");
    const vm = cr * 24;
    const Iv = 1 / Math.log(zUsed / z0);
    const qpExpected = ((1 + 7 * Iv) * 0.5 * 1.25 * vm * vm) / 1000;
    closeRel(r.qp, qpExpected, 1e-9);
    closeRel(r.vm, vm, 1e-9);
  });

  it("схемы включают прижим, отсос при φ = 0 и φ = 1, а также ветер вдоль стола", () => {
    const r = calcWind({
      climate,
      alphaDeg: 20,
      vbRegion: 24,
      w0Region: 0.38,
      zeMm: 3000,
      arefMm2: 100e6,
      slopeLengthMm: 4000,
      frontalAreaMm2: 2e6,
      frameCount: 15,
      edgeZoneFactor: 1.4,
      alongMinFraction: 0.05,
    });
    expect(r.cases.some((c) => c.direction === "front" && c.wNet > 0)).toBe(true);
    expect(r.cases.some((c) => c.blockage === "0" && c.wNet < 0)).toBe(true);
    expect(r.cases.some((c) => c.blockage === "1" && c.wNet < 0)).toBe(true);
    expect(r.cases.some((c) => c.direction === "along")).toBe(true);
  });

  it("схема с эксцентриситетом нагружает наветренную половину ската", () => {
    const r = calcWind({
      climate,
      alphaDeg: 20,
      vbRegion: 24,
      w0Region: 0.38,
      zeMm: 3000,
      arefMm2: 100e6,
      slopeLengthMm: 4000,
      frontalAreaMm2: 2e6,
      frameCount: 15,
      edgeZoneFactor: 1.4,
      alongMinFraction: 0.05,
    });
    const ecc = r.cases.filter((c) => c.distributionMode === "windwardHalf");
    expect(ecc.length).toBeGreaterThan(0);
    // Равномерная нагрузка на половине длины даёт равнодействующую ровно в d/4
    for (const c of ecc) closeRel(c.eccentricity, 4000 / 4, 1e-9);
  });

  it("экстраполяция за 30° помечается предупреждением", () => {
    const r = calcWind({
      climate,
      alphaDeg: 35,
      vbRegion: 24,
      w0Region: 0.38,
      zeMm: 3000,
      arefMm2: 100e6,
      slopeLengthMm: 4000,
      frontalAreaMm2: 2e6,
      frameCount: 15,
      edgeZoneFactor: 1.4,
      alongMinFraction: 0.05,
    });
    expect(r.warnings.some((w) => w.message.includes("экстраполяц"))).toBe(true);
  });

  it("интерполяция коэффициентов монотонна по углу", () => {
    const a = interpolateCanopyCoefficients(10).row;
    const b = interpolateCanopyCoefficients(20).row;
    expect(b.cf_pos).toBeGreaterThan(a.cf_pos);
    expect(b.cf_neg_phi0).toBeLessThan(a.cf_neg_phi0);
  });

  it("ветка ASCE 7-22 подменяет коэффициенты и предупреждает", () => {
    const r = calcWind({
      climate: { ...climate, useAsce: true },
      alphaDeg: 33,
      vbRegion: 24,
      w0Region: 0.38,
      zeMm: 3000,
      arefMm2: 100e6,
      slopeLengthMm: 4000,
      frontalAreaMm2: 2e6,
      frameCount: 15,
      edgeZoneFactor: 1.4,
      alongMinFraction: 0.05,
    });
    expect(r.warnings.some((w) => w.message.includes("ASCE"))).toBe(true);
  });
});

describe("Сочетания нагрузок (EN 1990)", () => {
  const design: DesignInput = proflandPreset().design;
  const cases: ElementaryCase[] = [
    { key: "G", label: "Вес", kind: "dead", purlinLoads: [], includeFrameSelfWeight: true, eccentricMoment: 0, alongForce: 0, montageForce: 0, edgeScale: 1, ref: "" },
    { key: "S1", label: "Снег", kind: "snow", purlinLoads: [], includeFrameSelfWeight: false, eccentricMoment: 0, alongForce: 0, montageForce: 0, edgeScale: 1, ref: "" },
    { key: "W1", label: "Ветер прижим", kind: "wind", purlinLoads: [], includeFrameSelfWeight: false, eccentricMoment: 0, alongForce: 0, montageForce: 0, edgeScale: 1.4, ref: "" },
    { key: "W2_phi0", label: "Ветер отрыв", kind: "wind", purlinLoads: [], includeFrameSelfWeight: false, eccentricMoment: 0, alongForce: 0, montageForce: 0, edgeScale: 1.4, ref: "" },
  ];
  const combos = buildCombinations({ design, cases });

  it("формируется сочетание на подъём 0,9·G + 1,5·W(отрыв)", () => {
    const uplift = combos.find((c) => c.type === "ULS_uplift");
    expect(uplift).toBeDefined();
    const g = uplift!.terms.find((t) => t.caseKey === "G")!;
    const w = uplift!.terms.find((t) => t.caseKey === "W2_phi0")!;
    closeRel(g.factor, 0.9, 1e-12);
    closeRel(w.factor, 1.5, 1e-12);
    // В сочетании на подъём снега нет
    expect(uplift!.terms.some((t) => t.caseKey === "S1")).toBe(false);
  });

  it("6.10b использует ξ·γG для постоянной нагрузки", () => {
    const b = combos.find((c) => c.key === "6.10b/S1")!;
    closeRel(b.terms.find((t) => t.caseKey === "G")!.factor, design.xi * design.gammaG, 1e-12);
    closeRel(b.terms.find((t) => t.caseKey === "S1")!.factor, design.gammaQ, 1e-12);
  });

  it("6.10a использует полный γG и ψ₀ для переменного воздействия", () => {
    const a = combos.find((c) => c.key === "6.10a/S1")!;
    closeRel(a.terms.find((t) => t.caseKey === "G")!.factor, design.gammaG, 1e-12);
    closeRel(a.terms.find((t) => t.caseKey === "S1")!.factor, design.gammaQ * design.psi0Snow, 1e-12);
  });

  it("формируются сочетания с ведущим снегом и с ведущим ветром", () => {
    const snowLeading = combos.find((c) => c.key === "6.10b/S1+W1")!;
    const windLeading = combos.find((c) => c.key === "6.10b/W1+S1")!;
    closeRel(snowLeading.terms.find((t) => t.caseKey === "S1")!.factor, design.gammaQ, 1e-12);
    closeRel(snowLeading.terms.find((t) => t.caseKey === "W1")!.factor, design.gammaQ * design.psi0Wind, 1e-12);
    closeRel(windLeading.terms.find((t) => t.caseKey === "W1")!.factor, design.gammaQ, 1e-12);
    closeRel(windLeading.terms.find((t) => t.caseKey === "S1")!.factor, design.gammaQ * design.psi0Snow, 1e-12);
  });

  it("в SLS все коэффициенты по нагрузке равны 1 (характеристическое сочетание)", () => {
    const sls = combos.filter((c) => c.type === "SLS");
    expect(sls.length).toBeGreaterThan(0);
    for (const c of sls) {
      const g = c.terms.find((t) => t.caseKey === "G")!;
      closeRel(g.factor, 1, 1e-12);
    }
  });

  it("все сочетания ссылаются только на существующие загружения", () => {
    const keys = new Set(cases.map((c) => c.key));
    for (const c of combos) for (const t of c.terms) expect(keys.has(t.caseKey)).toBe(true);
  });
});

describe("Гололёдная нагрузка", () => {
  it("вес слоя льда считается по плотности 900 кг/м³", () => {
    // 10 мм льда: 900 · 0,010 · 9,81 = 88,3 Н/м² = 0,0883 кПа
    closeRel(iceLoadKPa(10), (900 * 0.01 * 9.80665) / 1000, 1e-9);
  });

  it("схема гололёда добавляется только при включённой опции", () => {
    const base = { alphaDeg: 20, skRegion: 1.5, regionAltitude: 350, altitudeFactorPer100m: 0.1, lowerEdgeHeight: 1500 };
    const off = calcSnow({ ...base, climate });
    const on = calcSnow({ ...base, climate: { ...climate, iceEnabled: true, iceThicknessMm: 10 } });
    expect(off.cases.some((c) => c.key === "ICE")).toBe(false);
    expect(off.iceKPa).toBe(0);
    expect(on.cases.some((c) => c.key === "ICE")).toBe(true);
    expect(on.iceKPa).toBeGreaterThan(0);
  });
});
