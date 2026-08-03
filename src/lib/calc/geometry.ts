import { GeometryInput, ElementRole } from "./types";

export interface Node {
  id: string;
  x: number; // мм, вдоль длины
  y: number; // мм, вдоль ширины
  z: number; // мм, по высоте
}

export interface Member {
  id: string;
  role: ElementRole;
  a: Node;
  b: Node;
  length: number; // мм, фактическая геометрическая длина (для 3D модели), вычисляется из координат узлов
  bomLength: number; // мм, номинальная длина для спецификации (из пользовательского ввода)
  frameIndex: number;
}

export interface Footing {
  id: string;
  x: number;
  y: number;
  z: number;
  postId: string;
}

export interface RoleSummary {
  count: number;
  unitLength: number; // мм, средняя номинальная длина элемента
  totalLength: number; // мм, суммарная номинальная длина (сумма bomLength по всем элементам роли)
}

export interface BomLine {
  role: ElementRole;
  length: number; // мм, номинальная длина позиции
  count: number;
  totalLength: number; // мм
}

export interface GeometryModel {
  nodes: Node[];
  members: Member[];
  footings: Footing[];
  frameXPositions: number[];
  frontZ: number;
  rearZ: number;
  slopeAngleDeg: number;
  counts: Record<ElementRole, RoleSummary>;
  bomLines: BomLine[];
  warnings: string[];
}

const TOL_MM = 5; // допуск расхождения размеров, мм
const TOL_REL = 0.03; // допуск расхождения размеров, доля (3%)

function makeNode(id: string, x: number, y: number, z: number): Node {
  return { id, x, y, z };
}

function dist(a: Node, b: Node): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/** Проверяет согласованность номинального (введенного пользователем) и фактического геометрического размера */
function checkConsistency(warnings: string[], label: string, nominal: number, actual: number) {
  const tol = Math.max(TOL_MM, actual * TOL_REL);
  if (Math.abs(nominal - actual) > tol) {
    warnings.push(`${label}: введено ${nominal.toFixed(0)} мм, по геометрии конструкции требуется ≈${actual.toFixed(0)} мм — проверьте согласованность размеров.`);
  }
}

/**
 * Строит параметрическую каркасную модель опор СЭС по введенным габаритам.
 * Схема: ряд поперечных рам (стойка передняя + стойка задняя, соединенные несущей балкой
 * по плоскости панелей), рамы связаны прогонами вдоль длины (с учетом свесов) и диагональными
 * связями жесткости. Все геометрические размеры, введенные пользователем, взаимно проверяются
 * на согласованность (шаг стоек / длина пролета / общая длина, высоты стоек / общая высота,
 * номинальная длина элемента / фактическое расстояние между узлами и т.п.).
 */
export function buildGeometry(g: GeometryInput): GeometryModel {
  const warnings: string[] = [];

  const numFramesFromPosts = g.postCount > 0 ? Math.max(2, Math.round(g.postCount / 2)) : 0;
  const numFramesFromSpans = g.spanCount > 0 ? g.spanCount + 1 : 0;
  if (numFramesFromPosts && numFramesFromSpans && numFramesFromPosts !== numFramesFromSpans) {
    warnings.push(
      `Количество стоек (${g.postCount} шт → ${numFramesFromPosts} рам) не согласуется с количеством пролетов (${g.spanCount} → ${numFramesFromSpans} рам) — используется количество стоек.`
    );
  }
  const numFrames = Math.max(2, numFramesFromPosts || numFramesFromSpans || 2);

  // Шаг рам: приоритет — "шаг между стойками", с проверкой по "длине пролета"
  let spacing: number;
  if (g.postPitch > 0) {
    spacing = g.postPitch;
    if (g.spanLength > 0) checkConsistency(warnings, "Длина пролета не совпадает с шагом между стойками", g.spanLength, g.postPitch);
  } else if (g.spanLength > 0) {
    spacing = g.spanLength;
  } else {
    spacing = numFrames > 1 ? g.totalLength / (numFrames - 1) : 0;
  }

  const xPositions: number[] = [];
  const totalSpan = spacing * (numFrames - 1);
  if (spacing > 0 && totalSpan <= g.totalLength + TOL_MM) {
    for (let i = 0; i < numFrames; i++) xPositions.push(i * spacing);
    if (Math.abs(totalSpan - g.totalLength) > Math.max(TOL_MM, g.totalLength * TOL_REL)) {
      warnings.push(
        `Суммарная длина по шагу стоек (${totalSpan.toFixed(0)} мм) отличается от общей длины конструкции (${g.totalLength} мм) — проверьте согласованность шага стоек, количества пролетов/стоек и общей длины.`
      );
    }
  } else {
    warnings.push(`Шаг стоек × количество пролетов (${totalSpan.toFixed(0)} мм) превышает общую длину (${g.totalLength} мм) — расстояния распределены равномерно по длине.`);
    const step = numFrames > 1 ? g.totalLength / (numFrames - 1) : 0;
    for (let i = 0; i < numFrames; i++) xPositions.push(i * step);
  }

  const frontZ = g.frontPostHeight;
  const rearZ = g.rearPostHeight;
  const slopeAngleDeg = (Math.atan2(rearZ - frontZ, g.totalWidth) * 180) / Math.PI;
  if (Math.abs(slopeAngleDeg - g.tiltAngle) > 3) {
    warnings.push(
      `Угол наклона по высотам стоек (${slopeAngleDeg.toFixed(1)}°) отличается от заданного угла панелей (${g.tiltAngle}°) — проверьте согласованность высот стоек и угла наклона.`
    );
  }
  checkConsistency(warnings, "Общая высота конструкции", g.totalHeight, Math.max(frontZ, rearZ));

  const nodes: Node[] = [];
  const members: Member[] = [];
  const footings: Footing[] = [];

  const frontTop: Node[] = [];
  const rearTop: Node[] = [];
  const frontBase: Node[] = [];
  const rearBase: Node[] = [];

  xPositions.forEach((x, i) => {
    const fBase = makeNode(`fb${i}`, x, 0, 0);
    const fTop = makeNode(`ft${i}`, x, 0, frontZ);
    const rBase = makeNode(`rb${i}`, x, g.totalWidth, 0);
    const rTop = makeNode(`rt${i}`, x, g.totalWidth, rearZ);
    nodes.push(fBase, fTop, rBase, rTop);
    frontBase.push(fBase);
    frontTop.push(fTop);
    rearBase.push(rBase);
    rearTop.push(rTop);

    members.push({ id: `post-f-${i}`, role: "post", a: fBase, b: fTop, length: dist(fBase, fTop), bomLength: g.frontPostHeight, frameIndex: i });
    members.push({ id: `post-r-${i}`, role: "post", a: rBase, b: rTop, length: dist(rBase, rTop), bomLength: g.rearPostHeight, frameIndex: i });

    const beamLen = dist(fTop, rTop);
    members.push({ id: `beam-${i}`, role: "beam", a: fTop, b: rTop, length: beamLen, bomLength: g.beamLength, frameIndex: i });
    if (i === 0) checkConsistency(warnings, "Длина несущей балки", g.beamLength, beamLen);

    footings.push({ id: `fnd-f-${i}`, x, y: 0, z: 0, postId: `post-f-${i}` });
    footings.push({ id: `fnd-r-${i}`, x, y: g.totalWidth, z: 0, postId: `post-r-${i}` });

    // Подкосы (жесткость рамы): от базы стойки к средней точке балки
    const midBeam = makeNode(`mb${i}`, x, g.totalWidth * 0.3, frontZ + (rearZ - frontZ) * 0.3);
    const braceLen = dist(fBase, midBeam);
    members.push({ id: `brace-f-${i}`, role: "brace", a: fBase, b: midBeam, length: braceLen, bomLength: g.braceLength, frameIndex: i });
    if (i === 0) checkConsistency(warnings, "Длина подкоса", g.braceLength, braceLen);
  });

  // Прогоны вдоль длины конструкции по рядам панелей (по плоскости ската), включая свесы по краям
  const purlinRows = Math.max(1, g.panelRowCount + 1);
  let purlinSpanChecked = false;
  for (let r = 0; r < purlinRows; r++) {
    const t = purlinRows > 1 ? r / (purlinRows - 1) : 0;
    const y = g.totalWidth * t;
    const z = frontZ + (rearZ - frontZ) * t;

    for (let i = 0; i < xPositions.length - 1; i++) {
      const a = makeNode(`pl${r}-${i}a`, xPositions[i], y, z);
      const b = makeNode(`pl${r}-${i}b`, xPositions[i + 1], y, z);
      const segLen = dist(a, b);
      members.push({ id: `purlin-${r}-${i}`, role: "purlin", a, b, length: segLen, bomLength: g.purlinLength, frameIndex: i });
      if (!purlinSpanChecked) {
        checkConsistency(warnings, "Длина прогона", g.purlinLength, segLen);
        purlinSpanChecked = true;
      }
    }

    // Свесы прогонов за крайние стойки
    if (g.overhang > 0 && xPositions.length > 0) {
      const firstX = xPositions[0];
      const lastX = xPositions[xPositions.length - 1];
      const os1 = makeNode(`pl${r}-ovs-a`, firstX - g.overhang, y, z);
      const os2 = makeNode(`pl${r}-ovs-b`, firstX, y, z);
      members.push({ id: `purlin-ov-start-${r}`, role: "purlin", a: os1, b: os2, length: g.overhang, bomLength: g.overhang, frameIndex: -1 });

      const oe1 = makeNode(`pl${r}-ove-a`, lastX, y, z);
      const oe2 = makeNode(`pl${r}-ove-b`, lastX + g.overhang, y, z);
      members.push({ id: `purlin-ov-end-${r}`, role: "purlin", a: oe1, b: oe2, length: g.overhang, bomLength: g.overhang, frameIndex: xPositions.length - 1 });
    }
  }

  // Диагональные связи жесткости (крестовые) в каждой второй ячейке по переднему и заднему ряду стоек
  let diagChecked = false;
  for (let i = 0; i < xPositions.length - 1; i++) {
    if (i % 2 !== 0) continue;
    const fa = frontBase[i];
    const fb = frontTop[i + 1];
    const fc = frontBase[i + 1];
    const fd = frontTop[i];
    const diagLen = dist(fa, fb);
    members.push({ id: `diag-f1-${i}`, role: "diagonal", a: fa, b: fb, length: diagLen, bomLength: g.diagonalLength, frameIndex: i });
    members.push({ id: `diag-f2-${i}`, role: "diagonal", a: fc, b: fd, length: dist(fc, fd), bomLength: g.diagonalLength, frameIndex: i });
    if (!diagChecked) {
      checkConsistency(warnings, "Длина диагональной связи", g.diagonalLength, diagLen);
      diagChecked = true;
    }
  }

  // Суммарные показатели по ролям считаются по фактической номинальной (bomLength) длине каждого
  // элемента — это корректно учитывает элементы с разной длиной внутри одной роли (например,
  // разную длину передних/задних стоек или прогонов со свесом, отличающихся от типового пролета).
  const summarize = (role: ElementRole): RoleSummary => {
    const list = members.filter((m) => m.role === role);
    const totalLength = list.reduce((s, m) => s + m.bomLength, 0);
    return { count: list.length, unitLength: list.length > 0 ? totalLength / list.length : 0, totalLength };
  };

  const roles: ElementRole[] = ["post", "beam", "purlin", "brace", "diagonal"];
  const counts = Object.fromEntries(roles.map((r) => [r, summarize(r)])) as Record<ElementRole, RoleSummary>;

  // Позиции спецификации: элементы одной роли группируются по фактической номинальной длине,
  // чтобы, например, свесы прогонов не "размывали" среднюю длину типового пролета в ведомости.
  const bomGroups = new Map<string, BomLine>();
  for (const m of members) {
    const lengthRounded = Math.round(m.bomLength);
    const key = `${m.role}-${lengthRounded}`;
    const existing = bomGroups.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalLength += m.bomLength;
    } else {
      bomGroups.set(key, { role: m.role, length: lengthRounded, count: 1, totalLength: m.bomLength });
    }
  }
  const bomLines = Array.from(bomGroups.values()).sort((a, b) => roles.indexOf(a.role) - roles.indexOf(b.role) || b.length - a.length);

  return { nodes, members, footings, frameXPositions: xPositions, frontZ, rearZ, slopeAngleDeg, counts, bomLines, warnings };
}
