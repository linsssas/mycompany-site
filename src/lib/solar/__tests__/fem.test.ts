import { describe, it, expect } from "vitest";
import { solveFrame, FemModel, diagramExtremes } from "../fem";

// Все проверки — на ручных примерах сопромата (требование ТЗ, п. 8).
// Единицы: Н, мм, МПа.


/** Относительное сравнение: абсолютный допуск toBeCloseTo непригоден для величин ~10⁷ Н·мм. */
function closeRel(actual: number, expected: number, rel = 1e-5) {
  expect(Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12)).toBeLessThan(rel);
}

const E = 210000;
const A = 1000; // мм²
const I = 1e6; // мм⁴

describe("Однопролётная балка на двух опорах", () => {
  const L = 3000;
  const q = 10; // Н/мм (вниз задаётся отрицательным gy)

  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: L, y: 0 },
    ],
    elements: [{ i: 0, j: 1, A, I, E }],
    supports: [
      { node: 0, ux: true, uy: true },
      { node: 1, uy: true },
    ],
  };
  const res = solveFrame(model, { nodal: [], distributed: [{ element: 0, gy: -q }] }, 41);

  it("максимальный момент равен qL²/8", () => {
    const { maxM } = diagramExtremes(res.diagrams[0]);
    closeRel(maxM, (q * L * L) / 8);
  });

  it("опорные реакции равны qL/2 каждая", () => {
    const total = res.reactions.reduce((a, r) => a + r.fy, 0);
    closeRel(total, q * L);
    for (const r of res.reactions) closeRel(r.fy, (q * L) / 2);
  });

  it("сумма реакций равна сумме нагрузок (равновесие)", () => {
    expect(Math.abs(res.equilibrium.residualFy)).toBeLessThan(1e-3 * q * L);
  });

  it("прогиб в середине равен 5qL⁴/(384EI)", () => {
    const expected = (5 * q * Math.pow(L, 4)) / (384 * E * I);
    closeRel(res.diagrams[0].maxDeflection, expected);
  });

  it("момент на опорах равен нулю", () => {
    const st = res.diagrams[0].stations;
    expect(Math.abs(st[0].M)).toBeLessThan(1e-6 * q * L * L);
    expect(Math.abs(st[st.length - 1].M)).toBeLessThan(1e-6 * q * L * L);
  });
});

describe("Консоль", () => {
  const L = 2000;
  const q = 5;
  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: L, y: 0 },
    ],
    elements: [{ i: 0, j: 1, A, I, E }],
    supports: [{ node: 0, ux: true, uy: true, rz: true }],
  };
  const res = solveFrame(model, { nodal: [], distributed: [{ element: 0, gy: -q }] }, 41);

  it("момент в заделке равен qL²/2", () => {
    const { maxM } = diagramExtremes(res.diagrams[0]);
    closeRel(maxM, (q * L * L) / 2);
  });

  it("прогиб на конце равен qL⁴/(8EI)", () => {
    const tip = Math.abs(res.displacements[1].uy);
    closeRel(tip, (q * Math.pow(L, 4)) / (8 * E * I));
  });

  it("поперечная сила в заделке равна qL", () => {
    closeRel(Math.abs(res.diagrams[0].stations[0].V), q * L);
  });
});

describe("Защемлённая с двух сторон балка", () => {
  const L = 4000;
  const q = 8;
  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: L, y: 0 },
    ],
    elements: [{ i: 0, j: 1, A, I, E }],
    supports: [
      { node: 0, ux: true, uy: true, rz: true },
      { node: 1, ux: true, uy: true, rz: true },
    ],
  };
  const res = solveFrame(model, { nodal: [], distributed: [{ element: 0, gy: -q }] }, 41);
  const st = res.diagrams[0].stations;

  it("опорный момент равен qL²/12 (знак — отрицательный, растянуто верхнее волокно)", () => {
    closeRel(st[0].M, -(q * L * L) / 12);
  });

  it("момент в середине равен qL²/24", () => {
    const mid = st[Math.floor(st.length / 2)];
    closeRel(mid.M, (q * L * L) / 24);
  });
});

describe("Шарнир (освобождение момента)", () => {
  const L = 4000;
  const q = 8;
  // Заделка слева, справа — вертикальная опора с шарниром на конце элемента:
  // получаем однопролётную балку с одной заделкой (M на заделке = qL²/8).
  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: L, y: 0 },
    ],
    elements: [{ i: 0, j: 1, A, I, E, hingeJ: true }],
    supports: [
      { node: 0, ux: true, uy: true, rz: true },
      { node: 1, uy: true, rz: true },
    ],
  };
  const res = solveFrame(model, { nodal: [], distributed: [{ element: 0, gy: -q }] }, 41);
  const st = res.diagrams[0].stations;

  it("момент в заделке равен qL²/8", () => {
    closeRel(Math.abs(st[0].M), (q * L * L) / 8);
  });

  it("момент на шарнирном конце равен нулю", () => {
    expect(Math.abs(st[st.length - 1].M)).toBeLessThan(1e-6 * q * L * L);
  });

  it("реакция на шарнирной опоре равна 3qL/8", () => {
    const r = res.reactions.find((x) => x.node === 1)!;
    closeRel(r.fy, (3 * q * L) / 8);
  });
});

describe("Растянутый стержень", () => {
  const L = 1500;
  const P = 20000; // Н
  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: L, y: 0 },
    ],
    elements: [{ i: 0, j: 1, A, I, E }],
    supports: [{ node: 0, ux: true, uy: true, rz: true }],
  };
  const res = solveFrame(model, { nodal: [{ node: 1, fx: P }], distributed: [] });

  it("продольная сила равна P и положительна (растяжение)", () => {
    for (const st of res.diagrams[0].stations) closeRel(st.N, P);
  });

  it("удлинение равно PL/(EA)", () => {
    closeRel(res.displacements[1].ux, (P * L) / (E * A));
  });
});

describe("Сжатый наклонный стержень (проверка преобразования координат)", () => {
  const P = 10000;
  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: 3000, y: 4000 },
    ],
    elements: [{ i: 0, j: 1, A, I, E, hingeI: true, hingeJ: true }],
    supports: [
      { node: 0, ux: true, uy: true, rz: true },
      { node: 1, rz: true },
    ],
  };
  // Сила вдоль стержня (вниз по оси): направление (−0.6, −0.8)
  const res = solveFrame(model, { nodal: [{ node: 1, fx: -0.6 * P, fy: -0.8 * P }], distributed: [] });

  it("продольная сила равна −P (сжатие)", () => {
    closeRel(res.diagrams[0].stations[0].N, -P, 1e-4);
  });

  it("изгибающий момент отсутствует", () => {
    const { maxM } = diagramExtremes(res.diagrams[0]);
    expect(maxM).toBeLessThan(1e-3 * P * 1000);
  });
});

describe("Двухпролётная неразрезная балка", () => {
  const L = 2100;
  const q = 6;
  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: L, y: 0 },
      { x: 2 * L, y: 0 },
    ],
    elements: [
      { i: 0, j: 1, A, I, E },
      { i: 1, j: 2, A, I, E },
    ],
    supports: [
      { node: 0, ux: true, uy: true },
      { node: 1, uy: true },
      { node: 2, uy: true },
    ],
  };
  const res = solveFrame(model, {
    nodal: [],
    distributed: [
      { element: 0, gy: -q },
      { element: 1, gy: -q },
    ],
  }, 41);

  it("момент над средней опорой равен qL²/8", () => {
    const last = res.diagrams[0].stations[res.diagrams[0].stations.length - 1];
    closeRel(Math.abs(last.M), (q * L * L) / 8);
  });

  it("реакция средней опоры равна 1,25qL", () => {
    const r = res.reactions.find((x) => x.node === 1)!;
    closeRel(r.fy, 1.25 * q * L);
  });

  it("сумма реакций равна полной нагрузке", () => {
    const total = res.reactions.reduce((a, r) => a + r.fy, 0);
    closeRel(total, 2 * q * L);
  });
});

describe("Плоская рама: равновесие узлов", () => {
  // П-образная рама с горизонтальной силой
  const H = 2800;
  const B = 2630;
  const model: FemModel = {
    nodes: [
      { x: 0, y: 0 },
      { x: 0, y: H },
      { x: B, y: H },
      { x: B, y: 0 },
    ],
    elements: [
      { i: 0, j: 1, A, I, E },
      { i: 1, j: 2, A, I, E },
      { i: 3, j: 2, A, I, E },
    ],
    supports: [
      { node: 0, ux: true, uy: true, rz: true },
      { node: 3, ux: true, uy: true, rz: true },
    ],
  };
  const res = solveFrame(model, { nodal: [{ node: 1, fx: 5000 }], distributed: [{ element: 1, gy: -4 }] });

  it("сумма горизонтальных реакций уравновешивает нагрузку", () => {
    expect(Math.abs(res.equilibrium.residualFx)).toBeLessThan(1);
  });

  it("сумма вертикальных реакций уравновешивает нагрузку", () => {
    expect(Math.abs(res.equilibrium.residualFy)).toBeLessThan(1);
  });
});
