// Метод конечных элементов для плоской стержневой системы (рама).
// 3 степени свободы в узле: ux, uy, θz. Элемент — балка-стержень Эйлера-Бернулли.
//
// Единицы: Н, мм, МПа (Н/мм²).
//
// Соглашение о знаках внутренних усилий (проверено юнит-тестами):
//   N(x) = −(S₀ + wx·x)              — растяжение положительно
//   V(x) = S₁ + wy·x
//   M(x) = −S₂ + S₁·x + wy·x²/2      — положительный момент = растяжение нижнего волокна
// где S — вектор узловых усилий элемента в местных осях, S = k·u − Q.

export interface FemNode {
  x: number; // мм
  y: number; // мм
  /** Метка для отладки и вывода */
  label?: string;
}

export interface FemElement {
  i: number;
  j: number;
  A: number; // мм²
  I: number; // мм⁴
  E: number; // МПа
  /** Шарнир (освобождение момента) на конце i / j */
  hingeI?: boolean;
  hingeJ?: boolean;
  label?: string;
  /** Роль элемента для последующих проверок */
  role?: string;
}

/** Опора: true — жёсткое закрепление, число — жёсткость упругой связи (Н/мм или Н·мм/рад). */
export interface FemSupport {
  node: number;
  ux?: boolean | number;
  uy?: boolean | number;
  rz?: boolean | number;
}

export interface FemNodalLoad {
  node: number;
  fx?: number; // Н
  fy?: number; // Н
  m?: number; // Н·мм
}

export interface FemDistLoad {
  element: number;
  gx?: number; // Н/мм в глобальном направлении X
  gy?: number; // Н/мм в глобальном направлении Y
}

export interface FemModel {
  nodes: FemNode[];
  elements: FemElement[];
  supports: FemSupport[];
}

export interface FemLoadCase {
  nodal: FemNodalLoad[];
  distributed: FemDistLoad[];
}

export interface MemberDiagram {
  element: number;
  label: string;
  role: string;
  length: number; // мм
  /** Станции вдоль элемента: положение от начала (мм) и усилия */
  stations: { x: number; N: number; V: number; M: number }[];
  /** Прогиб относительно хорды (мм) — максимальное значение */
  maxDeflection: number;
}

export interface FemResult {
  /** Перемещения узлов: [ux, uy, rz] в мм и рад */
  displacements: { ux: number; uy: number; rz: number }[];
  /** Реакции опор, Н и Н·мм */
  reactions: { node: number; fx: number; fy: number; m: number }[];
  diagrams: MemberDiagram[];
  /** Проверка равновесия: суммы приложенных нагрузок и реакций, Н */
  equilibrium: { sumFx: number; sumFy: number; residualFx: number; residualFy: number };
}

const DOF = 3;

interface ElementGeom {
  L: number;
  c: number;
  s: number;
}

function elementGeom(model: FemModel, el: FemElement): ElementGeom {
  const a = model.nodes[el.i];
  const b = model.nodes[el.j];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  return { L, c: L === 0 ? 1 : dx / L, s: L === 0 ? 0 : dy / L };
}

/** Локальная матрица жёсткости 6×6 балочного элемента. */
export function localStiffness(E: number, A: number, I: number, L: number): number[][] {
  const EA = (E * A) / L;
  const a = (12 * E * I) / (L * L * L);
  const b = (6 * E * I) / (L * L);
  const c = (4 * E * I) / L;
  const d = (2 * E * I) / L;
  return [
    [EA, 0, 0, -EA, 0, 0],
    [0, a, b, 0, -a, b],
    [0, b, c, 0, -b, d],
    [-EA, 0, 0, EA, 0, 0],
    [0, -a, -b, 0, a, -b],
    [0, b, d, 0, -b, c],
  ];
}

/** Матрица преобразования глобальных перемещений в местные. */
function transform(c: number, s: number): number[][] {
  const T = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const block = [
    [c, s, 0],
    [-s, c, 0],
    [0, 0, 1],
  ];
  for (let k = 0; k < 2; k++) {
    for (let r = 0; r < 3; r++) {
      for (let cc = 0; cc < 3; cc++) T[k * 3 + r][k * 3 + cc] = block[r][cc];
    }
  }
  return T;
}

/** Вектор эквивалентных узловых нагрузок в местных осях от равномерной нагрузки. */
function localEquivalentLoads(wx: number, wy: number, L: number): number[] {
  return [
    (wx * L) / 2,
    (wy * L) / 2,
    (wy * L * L) / 12,
    (wx * L) / 2,
    (wy * L) / 2,
    (-wy * L * L) / 12,
  ];
}

/**
 * Статическая конденсация освобождённых степеней свободы (шарниры).
 * Возвращает модифицированную матрицу и вектор нагрузок, а также данные для
 * восстановления освобождённых перемещений.
 */
function condense(
  k: number[][],
  q: number[],
  released: number[]
): { k: number[][]; q: number[]; recover?: (u: number[]) => number[] } {
  if (released.length === 0) return { k, q };
  const all = [0, 1, 2, 3, 4, 5];
  const kept = all.filter((d) => !released.includes(d));
  const kcc = released.map((r) => released.map((c) => k[r][c]));
  const kcr = released.map((r) => kept.map((c) => k[r][c]));
  const krc = kept.map((r) => released.map((c) => k[r][c]));
  const kccInv = invertSmall(kcc);
  if (!kccInv) return { k, q };
  const qc = released.map((r) => q[r]);
  const qr = kept.map((r) => q[r]);

  const krcInv = matMul(krc, kccInv); // kept × released
  const kMod = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const qMod = new Array(6).fill(0);
  const reduced = matSub(
    kept.map((r) => kept.map((c) => k[r][c])),
    matMul(krcInv, kcr)
  );
  const qReduced = qr.map((v, idx) => v - dot(krcInv[idx], qc));
  kept.forEach((r, ri) => {
    kept.forEach((c, ci) => {
      kMod[r][c] = reduced[ri][ci];
    });
    qMod[r] = qReduced[ri];
  });

  const recover = (u: number[]): number[] => {
    // u_c = kcc⁻¹ (q_c − k_cr·u_r)
    const ur = kept.map((d) => u[d]);
    const rhs = qc.map((v, idx) => v - dot(kcr[idx], ur));
    const uc = matVec(kccInv, rhs);
    const full = u.slice();
    released.forEach((d, idx) => {
      full[d] = uc[idx];
    });
    return full;
  };
  return { k: kMod, q: qMod, recover };
}

function invertSmall(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-12) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col];
    for (let c = 0; c < 2 * n; c++) a[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let c = 0; c < 2 * n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row) => row.slice(n));
}

const dot = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0);
const matMul = (a: number[][], b: number[][]) =>
  a.map((row) => b[0].map((_, j) => row.reduce((acc, v, k) => acc + v * b[k][j], 0)));
const matSub = (a: number[][], b: number[][]) => a.map((row, i) => row.map((v, j) => v - b[i][j]));
const matVec = (a: number[][], v: number[]) => a.map((row) => dot(row, v));
const matTVec = (a: number[][], v: number[]) =>
  a[0].map((_, j) => a.reduce((acc, row, i) => acc + row[j] * v[i], 0));

/** Решение системы линейных уравнений методом Гаусса с выбором главного элемента. */
export function solveLinear(K: number[][], F: number[]): number[] {
  const n = F.length;
  const a = K.map((row, i) => [...row, F[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-14) {
      // Вырожденная система (геометрическая изменяемость) — фиксируем степень свободы
      a[col][col] = 1;
      a[col][n] = 0;
      continue;
    }
    [a[col], a[piv]] = [a[piv], a[col]];
    for (let r = col + 1; r < n; r++) {
      const f = a[r][col] / a[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  const u = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = a[r][n];
    for (let c = r + 1; c < n; c++) sum -= a[r][c] * u[c];
    u[r] = Math.abs(a[r][r]) < 1e-14 ? 0 : sum / a[r][r];
  }
  return u;
}

const BIG_SPRING = 1e12;
/** Штрафная жёсткость назначается как maxDiag·PENALTY_RATIO (компромисс точность/обусловленность). */
const PENALTY_RATIO = 1e9;

/** Решение плоской рамы. stations — количество точек выборки эпюр на элемент. */
export function solveFrame(model: FemModel, loads: FemLoadCase, stations = 21): FemResult {
  const n = model.nodes.length;
  const ndof = n * DOF;
  const K = Array.from({ length: ndof }, () => new Array(ndof).fill(0));
  const F = new Array(ndof).fill(0);

  // Локальные нагрузки и сборка
  const perElement = model.elements.map((el, idx) => {
    const g = elementGeom(model, el);
    const k = localStiffness(el.E, el.A, el.I, g.L);
    const T = transform(g.c, g.s);
    const d = loads.distributed.filter((x) => x.element === idx);
    const gx = d.reduce((acc, x) => acc + (x.gx ?? 0), 0);
    const gy = d.reduce((acc, x) => acc + (x.gy ?? 0), 0);
    const wx = gx * g.c + gy * g.s;
    const wy = -gx * g.s + gy * g.c;
    const q = localEquivalentLoads(wx, wy, g.L);
    const released: number[] = [];
    if (el.hingeI) released.push(2);
    if (el.hingeJ) released.push(5);
    const cond = condense(k, q, released);
    return { el, g, k, kFull: k, T, q, wx, wy, cond };
  });

  perElement.forEach(({ el, T, cond }) => {
    const kGlobal = matMul(matMul(transposed(T), cond.k), T);
    const fGlobal = matTVec(T, cond.q);
    const map = [el.i * 3, el.i * 3 + 1, el.i * 3 + 2, el.j * 3, el.j * 3 + 1, el.j * 3 + 2];
    for (let r = 0; r < 6; r++) {
      F[map[r]] += fGlobal[r];
      for (let c = 0; c < 6; c++) K[map[r]][map[c]] += kGlobal[r][c];
    }
  });

  for (const load of loads.nodal) {
    F[load.node * 3] += load.fx ?? 0;
    F[load.node * 3 + 1] += load.fy ?? 0;
    F[load.node * 3 + 2] += load.m ?? 0;
  }

  // Опоры: жёсткие моделируются штрафной пружиной. Жёсткость назначается ОТНОСИТЕЛЬНО
  // максимального диагонального члена матрицы: абсолютная величина (напр. 1e12) для
  // поворотных степеней свободы оказывается недостаточной и вносит заметную погрешность.
  let maxDiag = 0;
  for (let d = 0; d < ndof; d++) maxDiag = Math.max(maxDiag, Math.abs(K[d][d]));
  const penalty = maxDiag > 0 ? maxDiag * PENALTY_RATIO : BIG_SPRING;

  const springs: { dof: number; k: number }[] = [];
  for (const sup of model.supports) {
    const add = (dofIdx: number, value: boolean | number | undefined) => {
      if (value === undefined || value === false) return;
      const k = value === true ? penalty : (value as number);
      if (k <= 0) return;
      K[dofIdx][dofIdx] += k;
      springs.push({ dof: dofIdx, k });
    };
    add(sup.node * 3, sup.ux);
    add(sup.node * 3 + 1, sup.uy);
    add(sup.node * 3 + 2, sup.rz);
  }

  const u = solveLinear(K, F);

  const displacements = model.nodes.map((_, i) => ({
    ux: u[i * 3],
    uy: u[i * 3 + 1],
    rz: u[i * 3 + 2],
  }));

  // Реакции = сумма усилий в пружинах опор
  const reactionMap = new Map<number, { fx: number; fy: number; m: number }>();
  for (const sp of springs) {
    const node = Math.floor(sp.dof / 3);
    const comp = sp.dof % 3;
    const r = reactionMap.get(node) ?? { fx: 0, fy: 0, m: 0 };
    const value = -sp.k * u[sp.dof];
    if (comp === 0) r.fx += value;
    else if (comp === 1) r.fy += value;
    else r.m += value;
    reactionMap.set(node, r);
  }
  const reactions = [...reactionMap.entries()].map(([node, r]) => ({ node, ...r }));

  // Эпюры
  const diagrams: MemberDiagram[] = perElement.map(({ el, g, kFull, T, q, wx, wy, cond }, idx) => {
    const map = [el.i * 3, el.i * 3 + 1, el.i * 3 + 2, el.j * 3, el.j * 3 + 1, el.j * 3 + 2];
    const ue = map.map((d) => u[d]);
    let uLocal = matVec(T, ue);
    if (cond.recover) uLocal = cond.recover(uLocal);
    const S = matVec(kFull, uLocal).map((v, i2) => v - q[i2]);

    const pts: { x: number; N: number; V: number; M: number }[] = [];
    for (let s = 0; s < stations; s++) {
      const x = (g.L * s) / (stations - 1);
      pts.push({
        x,
        N: -(S[0] + wx * x),
        V: S[1] + wy * x,
        M: -S[2] + S[1] * x + (wy * x * x) / 2,
      });
    }

    // Прогиб относительно хорды.
    // Кубические функции формы не описывают прогиб от распределённой нагрузки внутри
    // элемента (для балки под равномерной нагрузкой ошибка составляет ровно 20 %),
    // поэтому к интерполяции добавляется частное решение защемлённой балки:
    //   vp(x) = wy·x²·(L−x)² / (24·E·I)
    const v1 = uLocal[1];
    const th1 = uLocal[2];
    const v2 = uLocal[4];
    const th2 = uLocal[5];
    let maxDefl = 0;
    const L = g.L;
    const EI = el.E * el.I;
    for (let s = 0; s <= 40; s++) {
      const xi = s / 40;
      const x = xi * L;
      const N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
      const N2 = x * (1 - 2 * xi + xi * xi);
      const N3 = 3 * xi * xi - 2 * xi * xi * xi;
      const N4 = x * (xi * xi - xi);
      const vp = EI > 0 ? (wy * x * x * (L - x) * (L - x)) / (24 * EI) : 0;
      const vLocal = N1 * v1 + N2 * th1 + N3 * v2 + N4 * th2 + vp;
      const chord = v1 + (v2 - v1) * xi;
      maxDefl = Math.max(maxDefl, Math.abs(vLocal - chord));
    }

    return {
      element: idx,
      label: el.label ?? `E${idx}`,
      role: el.role ?? "",
      length: g.L,
      stations: pts,
      maxDeflection: maxDefl,
    };
  });

  // Контроль равновесия
  let sumFx = 0;
  let sumFy = 0;
  for (const l of loads.nodal) {
    sumFx += l.fx ?? 0;
    sumFy += l.fy ?? 0;
  }
  perElement.forEach(({ g }, idx) => {
    const d = loads.distributed.filter((x) => x.element === idx);
    for (const x of d) {
      sumFx += (x.gx ?? 0) * g.L;
      sumFy += (x.gy ?? 0) * g.L;
    }
  });
  const reactFx = reactions.reduce((a, r) => a + r.fx, 0);
  const reactFy = reactions.reduce((a, r) => a + r.fy, 0);

  return {
    displacements,
    reactions,
    diagrams,
    equilibrium: {
      sumFx,
      sumFy,
      residualFx: sumFx + reactFx,
      residualFy: sumFy + reactFy,
    },
  };
}

function transposed(m: number[][]): number[][] {
  return m[0].map((_, j) => m.map((row) => row[j]));
}

/** Максимальные усилия по эпюре. */
export function diagramExtremes(d: MemberDiagram) {
  let maxM = 0;
  let maxV = 0;
  let maxNc = 0; // сжатие (модуль)
  let maxNt = 0; // растяжение
  for (const p of d.stations) {
    maxM = Math.max(maxM, Math.abs(p.M));
    maxV = Math.max(maxV, Math.abs(p.V));
    if (p.N < 0) maxNc = Math.max(maxNc, -p.N);
    else maxNt = Math.max(maxNt, p.N);
  }
  return { maxM, maxV, maxNc, maxNt };
}
