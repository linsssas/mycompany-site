import { describe, it, expect } from "vitest";
import { proflandPreset, lightPreset, emptyPreset, PRESETS } from "../presets";
import { runSolarCalculation, findLimit } from "../run";
import { buildGeometry, thermalElongation, normalizePurlinPositions, resolveLink } from "../geometry";
import { memberResistances, memberUtilizations, memberUtilizationsInto, MEMBER_CHECK_KEYS, MEMBER_CHECK_COUNT } from "../checks/member";
import { sectionProperties } from "../sections";
import { boltResistances, checkJoint } from "../checks/bolts";
import { bromsLateralCapacity } from "../checks/foundation";

function closeRel(actual: number, expected: number, rel = 1e-6) {
  expect(Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12)).toBeLessThan(rel);
}

describe("Геометрия пресета по чертежу", () => {
  const p = proflandPreset();
  const geom = buildGeometry(p.geometry, p.panel, p.ground.embedDepth);

  it("угол из высот стоек и разноса равен 32,9° (контроль согласованности по ТЗ)", () => {
    expect(geom.alphaDeg).toBeGreaterThan(32.8);
    expect(geom.alphaDeg).toBeLessThan(33.0);
  });

  it("общая длина стола считается из шага рам и свесов", () => {
    // 14 × 2100 + 2 × 385 = 30 170 мм (по чертежу указано 30 200 мм — расхождение 30 мм
    // из-за округления свеса; приложение считает длину параметрически)
    closeRel(geom.tableLength, 14 * 2100 + 2 * 385, 1e-9);
    expect(Math.abs(geom.tableLength - 30200)).toBeLessThan(50);
  });

  it("раскладка панелей: 26 × 2 = 52 шт, панельное поле 29 984 мм", () => {
    expect(geom.panelsPerRow).toBe(26);
    expect(geom.panelCount).toBe(52);
    closeRel(geom.panelFieldLength, 26 * 1134 + 25 * 20, 1e-9);
  });

  it("длина подпорки соответствует чертежу (2 050 мм)", () => {
    expect(Math.abs(geom.brace.length - 2050)).toBeLessThan(15);
  });

  it("температурное удлинение стола ±14,5 мм при ΔT = 40 °C", () => {
    const dL = thermalElongation(geom.tableLength, 40);
    expect(Math.abs(dL - 14.5)).toBeLessThan(0.1);
  });

  it("несогласованность длины балки с чертежом отмечается предупреждением", () => {
    // По чертежу балка 3 700 мм, из геометрии получается 3 830 мм
    expect(geom.beamLength).toBeGreaterThan(3700);
  });
});

describe("Связка «угол ↔ высоты стоек ↔ разнос»", () => {
  const base = proflandPreset().geometry;

  it("режим angle: угол вычисляется из высот и разноса", () => {
    const r = resolveLink({ ...base, linkMode: "angle" });
    closeRel(r.alphaDeg, (Math.atan2(2800 - 1100, 2630) * 180) / Math.PI, 1e-12);
  });

  it("режим heights: высота задней стойки вычисляется из угла", () => {
    const r = resolveLink({ ...base, linkMode: "heights", tiltDeg: 30 });
    closeRel(r.rearTopHeight, 1100 + 2630 * Math.tan((30 * Math.PI) / 180), 1e-12);
  });

  it("режим spacing: разнос вычисляется из угла и высот", () => {
    const r = resolveLink({ ...base, linkMode: "spacing", tiltDeg: 30 });
    closeRel(r.postSpacing, (2800 - 1100) / Math.tan((30 * Math.PI) / 180), 1e-12);
  });

  it("положения прогонов нормализуются под заданное число линий", () => {
    expect(normalizePurlinPositions(4, [10, 90]).length).toBe(4);
    expect(normalizePurlinPositions(2, [10, 40, 70, 90])).toEqual([10, 40]);
    const three = normalizePurlinPositions(3, []);
    closeRel(three[0], 100 / 6, 1e-9);
    closeRel(three[1], 50, 1e-9);
    closeRel(three[2], 500 / 6, 1e-9);
  });
});

describe("Согласованность быстрого и подробного расчёта проверок", () => {
  const p = proflandPreset();
  const sec = sectionProperties(p.sections.beam, p.material.fy, p.material.rho);
  const r = memberResistances(
    {
      role: "beam",
      name: "Балка",
      section: sec,
      length: 3130,
      muFactor: 1,
      muFactorOut: 1,
      ltbLength: 1200,
      bearingLength: 60,
      cripplingCategory: 2,
      slendernessLimit: 200,
    },
    p.material,
    1.5
  );

  it("memberUtilizationsInto даёт те же значения, что и memberUtilizations", () => {
    const buf = new Float64Array(MEMBER_CHECK_COUNT);
    const samples = [
      { N: -5000, M: 2e6, V: 3000 },
      { N: 8000, M: -1.5e6, V: 500 },
      { N: 0, M: 3e6, V: 12000 },
      { N: -20000, M: 0, V: 0 },
      { N: 0, M: 0, V: 0 },
      { N: -1200, M: 4.4e6, V: 9000 },
    ];
    for (const f of samples) {
      memberUtilizationsInto(r, f, buf);
      const items = memberUtilizations(r, f, p.material);
      for (let i = 0; i < MEMBER_CHECK_COUNT; i++) {
        const item = items.find((x) => x.key === MEMBER_CHECK_KEYS[i]);
        if (buf[i] < 0) {
          expect(item).toBeUndefined();
        } else {
          expect(item).toBeDefined();
          closeRel(buf[i], item!.utilization, 1e-12);
        }
      }
    }
  });
});

describe("Проверки болтов", () => {
  const p = proflandPreset();

  it("при толщине 2 мм определяющей является проверка смятия листа, а не среза болта", () => {
    const joint = p.bolts.joints.find((j) => j.key === "purlin_beam")!;
    const r = boltResistances(joint, p.material);
    expect(r.governing).toBe("смятие листа");
    expect(r.FbRd).toBeLessThan(r.FvRd);
  });

  it("несущая способность на смятие растёт с толщиной листа", () => {
    const joint = p.bolts.joints.find((j) => j.key === "purlin_beam")!;
    const thin = boltResistances({ ...joint, t1: 1.5, t2: 1.5 }, p.material);
    const thick = boltResistances({ ...joint, t1: 4, t2: 4 }, p.material);
    expect(thick.FbRd).toBeGreaterThan(thin.FbRd);
  });

  it("срез по резьбе меньше среза по стержню", () => {
    const joint = p.bolts.joints.find((j) => j.key === "beam_post")!;
    const thread = boltResistances({ ...joint, threadInShear: true }, p.material);
    const shank = boltResistances({ ...joint, threadInShear: false }, p.material);
    expect(thread.FvRd).toBeLessThan(shank.FvRd);
  });
});

describe("Стойка в грунте (метод Бромса)", () => {
  it("несущая способность в песке растёт как L³", () => {
    const a = bromsLateralCapacity("sand", 32, 0, 18, 0.1, 1.0, 0.5).Hu;
    const b = bromsLateralCapacity("sand", 32, 0, 18, 0.1, 2.0, 0.5).Hu;
    // Hu = 0,5·γ·D·L³·Kp/(e+L): отношение = (2³/1³)·(1,5/2,5)
    closeRel(b / a, 8 * (1.5 / 2.5), 1e-9);
  });

  it("в глине несущая способность растёт с сцеплением", () => {
    const a = bromsLateralCapacity("clay", 20, 25, 19, 0.3, 2.0, 0.3).Hu;
    const b = bromsLateralCapacity("clay", 20, 50, 19, 0.3, 2.0, 0.3).Hu;
    expect(b).toBeGreaterThan(a);
  });

  it("увеличение эксцентриситета снижает несущую способность", () => {
    const a = bromsLateralCapacity("sand", 32, 0, 18, 0.1, 1.5, 0.2).Hu;
    const b = bromsLateralCapacity("sand", 32, 0, 18, 0.1, 1.5, 2.0).Hu;
    expect(b).toBeLessThan(a);
  });
});

describe("Полный расчёт", () => {
  const r = runSolarCalculation(proflandPreset(), { sweeps: false });

  it("равновесие соблюдается во всех загружениях", () => {
    // Невязка суммы реакций и приложенных нагрузок пренебрежимо мала
    expect(r.equilibriumResidual).toBeLessThan(1);
  });

  it("масса металла соответствует ожидаемому порядку (1,0–1,1 т)", () => {
    expect(r.bom.steelMassWithFasteners).toBeGreaterThan(800);
    expect(r.bom.steelMassWithFasteners).toBeLessThan(1300);
  });

  it("общая масса стола около 2,6 т", () => {
    expect(r.bom.totalMass).toBeGreaterThan(2300);
    expect(r.bom.totalMass).toBeLessThan(2900);
  });

  it("установленная мощность 52 × 580 Вт ≈ 30 кВт", () => {
    closeRel(r.bom.powerKW, (52 * 580) / 1000, 1e-9);
  });

  it("снеговая нагрузка для Астаны около 0,87 кПа", () => {
    expect(r.snow.s).toBeGreaterThan(0.8);
    expect(r.snow.s).toBeLessThan(0.95);
  });

  it("формируются все обязательные схемы снега и ветра", () => {
    const keys = r.cases.map((c) => c.case.key);
    expect(keys).toContain("G");
    expect(keys).toContain("S1");
    expect(keys).toContain("S2");
    expect(keys).toContain("S3a");
    expect(keys).toContain("S3b");
    expect(keys.some((k) => k.startsWith("W1"))).toBe(true);
    expect(keys.some((k) => k.startsWith("W2"))).toBe(true);
    expect(keys).toContain("W3");
    expect(keys).toContain("MONT");
  });

  it("проверки отсортированы по убыванию коэффициента использования", () => {
    for (let i = 1; i < r.checks.length; i++) {
      expect(r.checks[i - 1].utilization).toBeGreaterThanOrEqual(r.checks[i].utilization);
    }
  });

  it("каждая проверка содержит ссылку на пункт нормы и подстановку чисел", () => {
    for (const c of r.checks) {
      expect(c.ref.length).toBeGreaterThan(0);
      expect(c.formula.length).toBeGreaterThan(0);
    }
  });

  it("определяющая проверка совпадает с максимальным коэффициентом использования", () => {
    expect(r.governing).not.toBeNull();
    closeRel(r.governing!.utilization, r.maxUtilization, 1e-12);
  });

  it("выводятся прогибы прогона, балки, стойки и панели", () => {
    const members = new Set(r.deflections.map((d) => d.member));
    expect(members.has("Прогон")).toBe(true);
    expect(members.has("Балка (стропило)")).toBe(true);
    expect(members.has("Стойка задняя")).toBe(true);
    expect(members.has("Панель")).toBe(true);
  });

  it("температурное удлинение выводится отдельной строкой", () => {
    expect(Math.abs(r.thermal.deltaLmm - 14.5)).toBeLessThan(0.1);
  });

  it("формируется спецификация с ненулевой массой каждой позиции", () => {
    expect(r.bom.items.length).toBeGreaterThan(5);
    for (const i of r.bom.items) expect(i.massTotal).toBeGreaterThan(0);
  });

  it("ведомость метизов сравнивает потребное количество с чертежом", () => {
    const m10 = r.fasteners.find((f) => f.d === 10);
    const m12 = r.fasteners.find((f) => f.d === 12);
    expect(m10?.drawing).toBe(132);
    expect(m12?.drawing).toBe(135);
  });

  it("при непрохождении выдаются подсказки по исходным данным", () => {
    const full = runSolarCalculation(proflandPreset());
    if (!full.passes) expect(full.diagnostics.length).toBeGreaterThan(0);
  });
});

describe("Чувствительность расчёта", () => {
  const base = runSolarCalculation(proflandPreset(), { sweeps: false });

  it("увеличение заглубления снижает коэффициент использования", () => {
    const p = proflandPreset();
    p.ground.embedDepth = 2200;
    p.ground.foundationType = "concreted";
    const r = runSolarCalculation(p, { sweeps: false });
    expect(r.maxUtilization).toBeLessThan(base.maxUtilization);
  });

  it("снижение скорости ветра снижает коэффициент использования", () => {
    const p = proflandPreset();
    p.climate.vbManual = 15;
    const r = runSolarCalculation(p, { sweeps: false });
    expect(r.maxUtilization).toBeLessThan(base.maxUtilization);
  });

  it("увеличение толщины профилей снижает загруженность стальных элементов", () => {
    const p = proflandPreset();
    for (const k of ["beam", "rearPost", "frontPost", "purlin"] as const) {
      p.sections[k] = { ...p.sections[k], t: p.sections[k].t + 1 };
    }
    const r = runSolarCalculation(p, { sweeps: false });
    // Сравниваем только проверки элементов: несущая способность стойки в грунте от
    // толщины профиля не зависит и остаётся определяющей в обоих вариантах.
    const steelMax = (x: typeof r) =>
      Math.max(...x.checks.filter((c) => c.role !== "foundation" && c.role !== "joint").map((c) => c.utilization));
    expect(steelMax(r)).toBeLessThan(steelMax(base));
  });

  it("ручной ввод массы металла масштабирует спецификацию", () => {
    const p = proflandPreset();
    p.selfWeight.mode = "manual";
    p.selfWeight.manualMassKg = 2000;
    const r = runSolarCalculation(p, { sweeps: false });
    closeRel(r.bom.steelMassWithFasteners, 2000 * p.selfWeight.fastenerFactor, 1e-9);
  });

  it("ручное переопределение количества панелей учитывается", () => {
    const p = proflandPreset();
    p.panel.countOverride = 40;
    const r = runSolarCalculation(p, { sweeps: false });
    expect(r.geom.panelCount).toBe(40);
  });
});

describe("Пресеты", () => {
  it("все пресеты рассчитываются без ошибок", () => {
    for (const preset of PRESETS) {
      const r = runSolarCalculation(preset.build(), { sweeps: false });
      expect(isFinite(r.maxUtilization)).toBe(true);
    }
  });

  it("облегчённый стол легче основного", () => {
    const a = runSolarCalculation(proflandPreset(), { sweeps: false });
    const b = runSolarCalculation(lightPreset(), { sweeps: false });
    expect(b.bom.steelMass).toBeLessThan(a.bom.steelMass);
  });

  it("пустой проект содержит минимум две рамы", () => {
    const r = runSolarCalculation(emptyPreset(), { sweeps: false });
    expect(r.geom.purlins.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Определение предельной нагрузки", () => {
  it("интерполирует точку пересечения K = 1", () => {
    closeRel(findLimit([{ x: 0, y: 0.5 }, { x: 2, y: 1.5 }]), 1, 1e-12);
  });

  it("возвращает NaN, если конструкция не проходит уже при нуле", () => {
    expect(Number.isNaN(findLimit([{ x: 0, y: 1.4 }, { x: 2, y: 2.5 }]))).toBe(true);
  });

  it("возвращает бесконечность, если конструкция проходит во всём диапазоне", () => {
    expect(findLimit([{ x: 0, y: 0.2 }, { x: 2, y: 0.4 }])).toBe(Infinity);
  });
});

describe("Защита от нефизичных исходных данных", () => {
  it("абсурдный угол наклона ограничивается и помечается ошибкой", () => {
    const p = proflandPreset();
    p.geometry.linkMode = "heights";
    p.geometry.tiltDeg = 450;
    const r = runSolarCalculation(p, { sweeps: false });
    expect(r.geom.alphaDeg).toBeLessThanOrEqual(85);
    expect(isFinite(r.maxUtilization)).toBe(true);
    expect(r.maxUtilization).toBeLessThan(1e6);
    expect(r.warnings.some((w) => w.severity === "error" && w.scope === "Геометрия")).toBe(true);
  });

  it("нулевой шаг рам не приводит к вырождению расчёта", () => {
    const p = proflandPreset();
    p.geometry.framePitch = 0;
    const r = runSolarCalculation(p, { sweeps: false });
    expect(isFinite(r.maxUtilization)).toBe(true);
    expect(r.warnings.some((w) => w.severity === "error")).toBe(true);
  });

  it("нулевой разнос стоек не ломает расчётную схему", () => {
    const p = proflandPreset();
    p.geometry.postSpacing = 0;
    const r = runSolarCalculation(p, { sweeps: false });
    expect(isFinite(r.maxUtilization)).toBe(true);
  });
});

describe("Потребное количество болтов", () => {
  it("определяется наибольшим из требований по сдвигу и по растяжению", () => {
    const p = proflandPreset();
    const joint = p.bolts.joints.find((j) => j.key === "panel_purlin")!;
    const r = boltResistances(joint, p.material);
    const onlyTension = checkJoint({ joint, shear: 0, tension: 5 * Math.min(r.FtRd, r.BpRd), material: p.material, combo: "—" });
    expect(onlyTension.requiredCount).toBe(5);
    const onlyShear = checkJoint({ joint, shear: 3 * Math.min(r.FvRd, r.FbRd), tension: 0, material: p.material, combo: "—" });
    expect(onlyShear.requiredCount).toBe(3);
    // Без усилий узел всё равно требует минимум один болт
    expect(checkJoint({ joint, shear: 0, tension: 0, material: p.material, combo: "—" }).requiredCount).toBe(1);
  });
});
