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
  length: number; // мм, фактическая геометрическая длина (для 3D модели)
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
  unitLength: number; // мм
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
  warnings: string[];
}

function makeNode(id: string, x: number, y: number, z: number): Node {
  return { id, x, y, z };
}

function dist(a: Node, b: Node): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Строит параметрическую каркасную модель опор СЭС по введенным габаритам.
 * Схема: ряд поперечных рам (стойка передняя + стойка задняя, соединенные несущей балкой
 * по плоскости панелей), рамы связаны прогонами вдоль длины и диагональными связями жесткости.
 */
export function buildGeometry(g: GeometryInput): GeometryModel {
  const warnings: string[] = [];

  const numFramesFromPosts = Math.max(2, Math.round(g.postCount / 2) || 0);
  const numFramesFromSpans = g.spanCount > 0 ? g.spanCount + 1 : 0;
  const numFrames = Math.max(2, numFramesFromPosts || numFramesFromSpans || 2);

  const xPositions: number[] = [];
  const pitchSpan = g.postPitch > 0 ? g.postPitch * (numFrames - 1) : 0;
  if (g.postPitch > 0 && pitchSpan <= g.totalLength + 1) {
    for (let i = 0; i < numFrames; i++) xPositions.push(i * g.postPitch);
  } else {
    if (g.postPitch > 0) warnings.push("Шаг стоек × количество пролетов превышает общую длину — расстояния распределены равномерно по длине.");
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
    members.push({ id: `beam-${i}`, role: "beam", a: fTop, b: rTop, length: dist(fTop, rTop), bomLength: g.beamLength, frameIndex: i });

    footings.push({ id: `fnd-f-${i}`, x, y: 0, z: 0, postId: `post-f-${i}` });
    footings.push({ id: `fnd-r-${i}`, x, y: g.totalWidth, z: 0, postId: `post-r-${i}` });

    // Подкосы (жесткость рамы): от базы стойки к средней точке балки
    const midBeam = makeNode(`mb${i}`, x, g.totalWidth * 0.3, frontZ + (rearZ - frontZ) * 0.3);
    members.push({ id: `brace-f-${i}`, role: "brace", a: fBase, b: midBeam, length: dist(fBase, midBeam), bomLength: g.braceLength, frameIndex: i });
  });

  // Прогоны вдоль длины конструкции по рядам панелей (по плоскости ската)
  const purlinRows = Math.max(1, g.panelRowCount + 1);
  for (let r = 0; r < purlinRows; r++) {
    const t = purlinRows > 1 ? r / (purlinRows - 1) : 0;
    for (let i = 0; i < xPositions.length - 1; i++) {
      const y = g.totalWidth * t;
      const z = frontZ + (rearZ - frontZ) * t;
      const a = makeNode(`pl${r}-${i}a`, xPositions[i], y, z);
      const b = makeNode(`pl${r}-${i}b`, xPositions[i + 1], y, z);
      members.push({ id: `purlin-${r}-${i}`, role: "purlin", a, b, length: dist(a, b), bomLength: g.purlinLength, frameIndex: i });
    }
  }

  // Диагональные связи жесткости (крестовые) в каждой второй ячейке по переднему и заднему ряду стоек
  for (let i = 0; i < xPositions.length - 1; i++) {
    if (i % 2 !== 0) continue;
    const fa = frontBase[i];
    const fb = frontTop[i + 1];
    const fc = frontBase[i + 1];
    const fd = frontTop[i];
    members.push({ id: `diag-f1-${i}`, role: "diagonal", a: fa, b: fb, length: dist(fa, fb), bomLength: g.diagonalLength, frameIndex: i });
    members.push({ id: `diag-f2-${i}`, role: "diagonal", a: fc, b: fd, length: dist(fc, fd), bomLength: g.diagonalLength, frameIndex: i });
  }

  const summarize = (role: ElementRole, unitLength: number): RoleSummary => {
    const list = members.filter((m) => m.role === role);
    return { count: list.length, unitLength, totalLength: list.length * unitLength };
  };

  const counts: Record<ElementRole, RoleSummary> = {
    post: summarize("post", 0),
    beam: summarize("beam", g.beamLength),
    purlin: summarize("purlin", g.purlinLength),
    brace: summarize("brace", g.braceLength),
    diagonal: summarize("diagonal", g.diagonalLength),
  };
  // Стойки имеют разную длину (передние/задние) — считаем отдельно
  const postMembers = members.filter((m) => m.role === "post");
  const totalPostLength = postMembers.reduce((s, m) => s + m.bomLength, 0);
  counts.post = { count: postMembers.length, unitLength: totalPostLength / Math.max(1, postMembers.length), totalLength: totalPostLength };

  return { nodes, members, footings, frameXPositions: xPositions, frontZ, rearZ, slopeAngleDeg, counts, warnings };
}
