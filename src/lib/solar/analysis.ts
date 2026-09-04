// Построение расчётных схем и расчёт от элементарных загружений.
//
// Расчёт ведётся в три уровня с передачей реакций сверху вниз (ТЗ, п. 3.1):
//   1. Панель → прогон: неразрезная балка на опорах с шагом рам.
//   2. Прогон → балка: реакции прогонов прикладываются к балке как сосредоточенные силы.
//   3. Плоская рама (стойки + балка + подпорка) — метод конечных элементов.
//
// Все элементарные загружения считаются в ХАРАКТЕРИСТИЧЕСКИХ значениях; расчётные
// сочетания формируются линейным суммированием (система линейно упругая).

import { FemElement, FemLoadCase, FemModel, FemNode, MemberDiagram, solveFrame } from "./fem";
import { DerivedGeometry } from "./geometry";
import { SectionProps } from "./sections";
import { MaterialInput, GroundInput, MemberRole, DesignInput, GeometryInput } from "./types";

export type LoadKind = "dead" | "snow" | "wind" | "montage";

/** Нагрузка на одну линию прогонов, Н/мм. */
export interface PurlinLineLoad {
  /** Вертикальная составляющая (вес, снег), Н/мм — вниз положительна */
  vertical: number;
  /** Нормальная к плоскости ската составляющая (ветер), Н/мм — прижим положителен */
  normal: number;
}

export interface ElementaryCase {
  key: string;
  label: string;
  kind: LoadKind;
  /** Нагрузка по линиям прогонов */
  purlinLoads: PurlinLineLoad[];
  /** Учитывать собственный вес элементов рамы */
  includeFrameSelfWeight: boolean;
  /** Момент от эксцентриситета ветровой равнодействующей на раму, Н·мм */
  eccentricMoment: number;
  /** Продольная (вдоль стола) сила на раму, Н — для проверки связей */
  alongForce: number;
  /** Монтажная сосредоточенная сила на прогон, Н */
  montageForce: number;
  /** Множитель для крайней рамы (краевые зоны ветра) */
  edgeScale: number;
  ref: string;
}

export interface PurlinAnalysis {
  /** Максимальный момент относительно сильной оси, Н·мм */
  maxM: number;
  /** Максимальная поперечная сила, Н */
  maxV: number;
  /** Максимальный прогиб, мм */
  maxDeflection: number;
  /** Реакция промежуточной (наиболее нагруженной) опоры, Н */
  reactionInner: number;
  /** Реакция крайней опоры, Н */
  reactionEnd: number;
  /** Максимальный пролёт прогона, мм */
  span: number;
  /** Усилие в бандаже стыка (момент, передаваемый через накладку), Н·мм */
  spliceMoment: number;
}

export interface FrameAnalysis {
  diagrams: MemberDiagram[];
  /** Перемещение верха задней стойки, мм */
  rearPostDrift: number;
  frontPostDrift: number;
  /** Реакции в основании стоек: V (вверх +), H, M */
  reactions: { rear: { V: number; H: number; M: number }; front: { V: number; H: number; M: number } };
  equilibriumResidual: number;
}

export interface CaseResult {
  case: ElementaryCase;
  /** Погонная нагрузка на каждую линию прогонов, нормальная к скату, Н/мм (со знаком) */
  purlinQ: number[];
  /** То же, касательная к скату составляющая, Н/мм */
  purlinQT: number[];
  frame: FrameAnalysis;
}

/**
 * Результаты расчёта прогона от ЕДИНИЧНЫХ нагрузок.
 * Система линейно упругая, поэтому усилия в любом сочетании получаются умножением
 * единичных результатов на суммарную погонную нагрузку — это точно и не требует
 * повторного решения МКЭ для каждого сочетания.
 */
export interface PurlinUnitAnalysis {
  /** От равномерной нагрузки q = 1 Н/мм, сильная ось */
  distStrong: PurlinAnalysis;
  /** От равномерной нагрузки q = 1 Н/мм, слабая ось */
  distWeak: PurlinAnalysis;
  /** От сосредоточенной силы P = 1 Н в наиболее невыгодном месте */
  pointStrong: PurlinAnalysis;
}

export interface FrameModelIndex {
  model: FemModel;
  /** Индексы элементов по ролям */
  roleElements: Record<string, number[]>;
  nodeIndex: {
    rearBase: number;
    rearGround: number;
    rearTop: number;
    frontBase: number;
    frontGround: number;
    frontTop: number;
    beamLowerTip: number;
    beamUpperTip: number;
    purlins: number[];
    braceBeam: number;
    bracePost: number;
  };
}

const EMBED_SEGMENTS = 6;

/** Жёсткость боковой пружины грунта на участке заглубления, Н/мм. */
export function soilLateralSpring(ground: GroundInput, depthFromSurface: number, width: number, segment: number): number {
  // Перевод кН/м³ → Н/мм³
  const nh = ground.nh * 1e-6;
  const ks = ground.ks * 1e-6;
  // Пески: модуль реакции растёт с глубиной (ks = nh·z/D); глины: постоянен
  const ksz = nh > 0 ? (nh * depthFromSurface) / Math.max(width, 1) : ks;
  return Math.max(0, ksz * width * segment);
}

/** Ширина стойки, воспринимающая отпор грунта (диаметр бетонирования либо габарит профиля). */
export function embedmentWidth(ground: GroundInput, section: SectionProps, def: { h: number; b: number }): number {
  if (ground.foundationType === "concreted" || ground.foundationType === "footing") return ground.concreteDia;
  return Math.max(def.h, def.b);
}

export function buildFrameModel(
  geom: DerivedGeometry,
  sections: Record<MemberRole, SectionProps>,
  sectionDims: Record<MemberRole, { h: number; b: number }>,
  material: MaterialInput,
  ground: GroundInput
): FrameModelIndex {
  const nodes: FemNode[] = [];
  const elements: FemElement[] = [];
  const supports: FemModel["supports"] = [];
  const roleElements: Record<string, number[]> = {};

  const addNode = (x: number, y: number, label: string) => {
    nodes.push({ x, y, label });
    return nodes.length - 1;
  };
  const addElement = (el: FemElement, role: string) => {
    elements.push({ ...el, role });
    const idx = elements.length - 1;
    (roleElements[role] ??= []).push(idx);
    return idx;
  };

  const E = material.E;
  const elastic = ground.supportModel === "elastic" && geom.embedDepth > 0;

  // ---- Стойки ----
  const buildPost = (x: number, topY: number, role: "rearPost" | "frontPost") => {
    const sec = sections[role];
    const dims = sectionDims[role];
    const width = embedmentWidth(ground, sec, dims);
    let baseNode: number;
    let groundNode: number;

    if (elastic) {
      const seg = geom.embedDepth / EMBED_SEGMENTS;
      baseNode = addNode(x, -geom.embedDepth, `${role}-base`);
      let prev = baseNode;
      for (let i = 1; i <= EMBED_SEGMENTS; i++) {
        const y = -geom.embedDepth + i * seg;
        const n = addNode(x, y, `${role}-emb${i}`);
        addElement({ i: prev, j: n, A: sec.A, I: sec.Iu, E }, `${role}Embedded`);
        prev = n;
      }
      groundNode = prev;
      // Боковые пружины на узлах заглублённой части
      for (let i = 0; i <= EMBED_SEGMENTS; i++) {
        const nodeIdx = baseNode + i;
        const depth = geom.embedDepth - i * seg; // глубина от поверхности
        const trib = i === 0 || i === EMBED_SEGMENTS ? seg / 2 : seg;
        const k = soilLateralSpring(ground, Math.max(depth, seg / 2), width, trib);
        if (k > 0) supports.push({ node: nodeIdx, ux: k });
      }
      // Вертикальная опора в основании
      supports.push({ node: baseNode, uy: true });
    } else {
      baseNode = addNode(x, 0, `${role}-base`);
      groundNode = baseNode;
      supports.push({ node: baseNode, ux: true, uy: true, rz: true });
    }

    const topNode = addNode(x, topY, `${role}-top`);
    return { baseNode, groundNode, topNode, sec };
  };

  const rear = buildPost(0, geom.rearTopHeight, "rearPost");
  const front = buildPost(geom.postSpacing, geom.frontTopHeight, "frontPost");

  // ---- Балка: узлы по скату ----
  const beamPoints: { s: number; label: string }[] = [];
  const pushPoint = (s: number, label: string) => beamPoints.push({ s, label });
  pushPoint(0, "beam-lower-tip");
  pushPoint(geom.beamOverhang, "beam-front-post");
  for (const p of geom.purlins) pushPoint(Math.max(0, Math.min(geom.beamLength, p.s)), `purlin-${p.index}`);
  const braceS = geom.beamOverhang + Math.hypot(geom.brace.to.x - geom.frontTop.x, geom.brace.to.y - geom.frontTop.y);
  if (geom.brace.enabled) pushPoint(braceS, "beam-brace");
  pushPoint(geom.beamOverhang + geom.slopeSpan, "beam-rear-post");
  pushPoint(geom.beamLength, "beam-upper-tip");

  beamPoints.sort((a, b) => a.s - b.s);
  // Слияние близких точек
  const merged: { s: number; labels: string[] }[] = [];
  for (const p of beamPoints) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.s - p.s) < 1) last.labels.push(p.label);
    else merged.push({ s: p.s, labels: [p.label] });
  }

  const beamSec = sections.beam;
  const beamNodeIdx: number[] = merged.map((p) => {
    const x = geom.beamLowerTip.x + geom.slopeDir.x * p.s;
    const y = geom.beamLowerTip.y + geom.slopeDir.y * p.s;
    return addNode(x, y, p.labels.join("/"));
  });
  for (let i = 0; i < beamNodeIdx.length - 1; i++) {
    addElement({ i: beamNodeIdx[i], j: beamNodeIdx[i + 1], A: beamSec.A, I: beamSec.Iu, E }, "beam");
  }

  // ---- Соединение балки со стойками (жёсткие короткие связи) ----
  const findBeamNode = (label: string) => {
    const idx = merged.findIndex((p) => p.labels.includes(label));
    return idx >= 0 ? beamNodeIdx[idx] : -1;
  };
  const beamAtFront = findBeamNode("beam-front-post");
  const beamAtRear = findBeamNode("beam-rear-post");

  const rigidLink = (a: number, b: number, role: string) => {
    const len = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
    if (len < 1) {
      // Узлы совпадают — соединяем очень жёстким коротким элементом
      const n = addNode(nodes[b].x + 1, nodes[b].y, `${role}-aux`);
      addElement({ i: a, j: n, A: beamSec.A * 100, I: beamSec.Iu * 100, E }, role);
      addElement({ i: n, j: b, A: beamSec.A * 100, I: beamSec.Iu * 100, E }, role);
      return;
    }
    addElement({ i: a, j: b, A: beamSec.A * 100, I: beamSec.Iu * 100, E }, role);
  };
  rigidLink(rear.topNode, beamAtRear, "jointRear");
  rigidLink(front.topNode, beamAtFront, "jointFront");

  // ---- Стойки: элементы над землёй ----
  addElement({ i: rear.groundNode, j: rear.topNode, A: sections.rearPost.A, I: sections.rearPost.Iu, E }, "rearPost");
  addElement({ i: front.groundNode, j: front.topNode, A: sections.frontPost.A, I: sections.frontPost.Iu, E }, "frontPost");

  // ---- Подпорка балки (шарнирная по концам) ----
  let bracePostNode = -1;
  let braceBeamNode = -1;
  if (geom.brace.enabled) {
    bracePostNode = addNode(geom.brace.from.x, geom.brace.from.y, "brace-post");
    braceBeamNode = findBeamNode("beam-brace");
    // Врезаем узел крепления подпорки в заднюю стойку: делим стойку на два элемента
    const postElIdx = roleElements["rearPost"][roleElements["rearPost"].length - 1];
    const postEl = elements[postElIdx];
    elements[postElIdx] = { ...postEl, j: bracePostNode };
    addElement({ i: bracePostNode, j: rear.topNode, A: sections.rearPost.A, I: sections.rearPost.Iu, E }, "rearPost");
    addElement(
      {
        i: bracePostNode,
        j: braceBeamNode,
        A: sections.brace.A,
        I: sections.brace.Iu,
        E,
        hingeI: true,
        hingeJ: true,
      },
      "brace"
    );
  }

  return {
    model: { nodes, elements, supports },
    roleElements,
    nodeIndex: {
      rearBase: rear.baseNode,
      rearGround: rear.groundNode,
      rearTop: rear.topNode,
      frontBase: front.baseNode,
      frontGround: front.groundNode,
      frontTop: front.topNode,
      beamLowerTip: beamNodeIdx[0],
      beamUpperTip: beamNodeIdx[beamNodeIdx.length - 1],
      purlins: geom.purlins.map((p) => findBeamNode(`purlin-${p.index}`)),
      braceBeam: braceBeamNode,
      bracePost: bracePostNode,
    },
  };
}

/** Модель неразрезного прогона: опоры — рамы, шаг — framePitch, свесы по краям. */
export function buildPurlinModel(
  g: GeometryInput,
  geom: DerivedGeometry,
  purlinSection: SectionProps,
  material: MaterialInput,
  design: DesignInput,
  weakAxis: boolean
): { model: FemModel; supportNodes: number[] } {
  const nodes: FemNode[] = [];
  const elements: FemElement[] = [];
  const supports: FemModel["supports"] = [];

  // Координаты вдоль стола: 0 — левый край свеса
  const positions: { x: number; support: boolean; splice: boolean }[] = [];
  const total = geom.tableLength;
  positions.push({ x: 0, support: false, splice: false });
  for (let i = 0; i < g.frameCount; i++) {
    positions.push({ x: g.edgeOverhang + i * g.framePitch, support: true, splice: false });
  }
  positions.push({ x: total, support: false, splice: false });

  // Монтажные стыки прогонов
  if (g.purlinSectionLength > 0) {
    for (let s = g.purlinSectionLength; s < total - 1; s += g.purlinSectionLength) {
      positions.push({ x: s, support: false, splice: true });
    }
  }
  positions.sort((a, b) => a.x - b.x);

  const merged: typeof positions = [];
  for (const p of positions) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.x - p.x) < 1) {
      last.support = last.support || p.support;
      last.splice = last.splice || p.splice;
    } else merged.push({ ...p });
  }

  const I = weakAxis ? purlinSection.Iv : purlinSection.Iu;
  const supportNodes: number[] = [];
  merged.forEach((p, idx) => {
    nodes.push({ x: p.x, y: 0, label: p.support ? `support-${idx}` : p.splice ? `splice-${idx}` : `n-${idx}` });
    if (p.support) {
      supports.push({ node: idx, uy: true, ux: idx === 0 ? true : undefined });
      supportNodes.push(idx);
    }
  });
  for (let i = 0; i < merged.length - 1; i++) {
    const spliceAtEnd = merged[i + 1].splice && design.spliceAsHinge;
    elements.push({ i, j: i + 1, A: purlinSection.A, I, E: material.E, hingeJ: spliceAtEnd, role: "purlin" });
  }

  return { model: { nodes, elements, supports }, supportNodes };
}

export function analyzePurlin(
  model: FemModel,
  supportNodes: number[],
  q: number,
  spanLength: number,
  montageForce: number,
  splicePositions: number[]
): PurlinAnalysis {
  const distributed = model.elements.map((_, idx) => ({ element: idx, gy: -q }));
  const nodal: FemLoadCase["nodal"] = [];
  if (montageForce !== 0) {
    // Монтажная нагрузка в наиболее невыгодном месте — середина крайнего пролёта
    const target = Math.floor(model.nodes.length / 2);
    nodal.push({ node: target, fy: -montageForce });
  }
  const res = solveFrame(model, { nodal, distributed }, 11);

  let maxM = 0;
  let maxV = 0;
  let maxDefl = 0;
  for (const d of res.diagrams) {
    for (const st of d.stations) {
      maxM = Math.max(maxM, Math.abs(st.M));
      maxV = Math.max(maxV, Math.abs(st.V));
    }
    maxDefl = Math.max(maxDefl, d.maxDeflection);
  }
  // Прогиб с учётом перемещений узлов (для консольных участков)
  for (const disp of res.displacements) maxDefl = Math.max(maxDefl, Math.abs(disp.uy));

  const reactions = supportNodes.map((n) => res.reactions.find((r) => r.node === n)?.fy ?? 0);
  const inner = reactions.length > 2 ? Math.max(...reactions.slice(1, -1)) : Math.max(...reactions, 0);
  const end = reactions.length > 0 ? Math.max(reactions[0], reactions[reactions.length - 1]) : 0;

  // Момент в сечении стыка (передаётся бандажом)
  let spliceMoment = 0;
  for (const d of res.diagrams) {
    const el = model.elements[d.element];
    const xEnd = model.nodes[el.j].x;
    if (splicePositions.some((s) => Math.abs(s - xEnd) < 1)) {
      spliceMoment = Math.max(spliceMoment, Math.abs(d.stations[d.stations.length - 1].M));
    }
  }

  return {
    maxM,
    maxV,
    maxDeflection: maxDefl,
    reactionInner: inner,
    reactionEnd: end,
    span: spanLength,
    spliceMoment,
  };
}

export interface AnalysisContext {
  g: GeometryInput;
  geom: DerivedGeometry;
  sections: Record<MemberRole, SectionProps>;
  sectionDims: Record<MemberRole, { h: number; b: number }>;
  material: MaterialInput;
  ground: GroundInput;
  design: DesignInput;
  frameIndex: FrameModelIndex;
  /** Погонный вес элементов рамы, Н/мм, по ролям */
  selfWeightLine: Record<string, number>;
  purlinUnit: PurlinUnitAnalysis;
}

/** Положения монтажных стыков прогонов вдоль стола, мм. */
export function splicePositions(g: GeometryInput, tableLength: number): number[] {
  const out: number[] = [];
  if (g.purlinSectionLength > 0) {
    for (let s = g.purlinSectionLength; s < tableLength - 1; s += g.purlinSectionLength) out.push(s);
  }
  return out;
}

/** Расчёт прогона от единичных нагрузок (выполняется один раз на проект). */
export function analyzePurlinUnit(
  g: GeometryInput,
  geom: DerivedGeometry,
  purlinSection: SectionProps,
  material: MaterialInput,
  design: DesignInput
): PurlinUnitAnalysis {
  const splices = splicePositions(g, geom.tableLength);
  const strong = buildPurlinModel(g, geom, purlinSection, material, design, false);
  const weak = buildPurlinModel(g, geom, purlinSection, material, design, true);
  return {
    distStrong: analyzePurlin(strong.model, strong.supportNodes, 1, g.framePitch, 0, splices),
    distWeak: analyzePurlin(weak.model, weak.supportNodes, 1, g.framePitch, 0, splices),
    pointStrong: analyzePurlin(strong.model, strong.supportNodes, 0, g.framePitch, 1, splices),
  };
}

/** Масштабирование единичных результатов прогона на фактическую нагрузку. */
export function scalePurlin(unit: PurlinAnalysis, factor: number): PurlinAnalysis {
  return {
    maxM: unit.maxM * factor,
    maxV: unit.maxV * factor,
    maxDeflection: unit.maxDeflection * factor,
    reactionInner: unit.reactionInner * factor,
    reactionEnd: unit.reactionEnd * factor,
    span: unit.span,
    spliceMoment: unit.spliceMoment * factor,
  };
}

/** Расчёт одного элементарного загружения (плоская рама). */
export function analyzeCase(ctx: AnalysisContext, ec: ElementaryCase): CaseResult {
  const { geom, frameIndex, purlinUnit } = ctx;
  const alpha = geom.alphaRad;

  // Погонные нагрузки по линиям прогонов
  const purlinQ = geom.purlins.map((_, i) => {
    const load = ec.purlinLoads[i] ?? { vertical: 0, normal: 0 };
    return load.vertical * Math.cos(alpha) + load.normal;
  });
  const purlinQT = geom.purlins.map((_, i) => {
    const load = ec.purlinLoads[i] ?? { vertical: 0, normal: 0 };
    return load.vertical * Math.sin(alpha);
  });

  // ---------- Уровень 3: плоская рама ----------
  const nodal: FemLoadCase["nodal"] = [];
  const distributed: FemLoadCase["distributed"] = [];

  // Внутренняя нормаль к плоскости ската: (−sin α, −cos α).
  const nx = -geom.slopeDir.y;
  const ny = geom.slopeDir.x;

  geom.purlins.forEach((p, i) => {
    const node = frameIndex.nodeIndex.purlins[i];
    if (node < 0) return;
    const load = ec.purlinLoads[i] ?? { vertical: 0, normal: 0 };
    // Реакция промежуточной опоры прогона на балку (единичный расчёт × фактическая нагрузка)
    const reactionVertical = purlinUnit.distStrong.reactionInner * load.vertical * Math.cos(alpha);
    const reactionNormal = purlinUnit.distStrong.reactionInner * load.normal;
    const montageReaction = ec.montageForce !== 0 ? purlinUnit.pointStrong.reactionInner * ec.montageForce : 0;
    // Вертикальная составляющая (вес, снег, монтаж) действует вниз; ветровая — по нормали
    nodal.push({
      node,
      fx: reactionNormal * nx,
      fy: reactionNormal * ny - (reactionVertical + montageReaction),
    });
  });

  // Момент от эксцентриситета ветровой равнодействующей — на узел балки у нижней линии прогонов
  if (ec.eccentricMoment !== 0) {
    const node = frameIndex.nodeIndex.purlins.find((n) => n >= 0) ?? frameIndex.nodeIndex.beamLowerTip;
    nodal.push({ node, m: ec.eccentricMoment });
  }

  // Собственный вес элементов рамы
  if (ec.includeFrameSelfWeight) {
    frameIndex.model.elements.forEach((el, idx) => {
      const w = ctx.selfWeightLine[el.role ?? ""] ?? 0;
      if (w > 0) distributed.push({ element: idx, gy: -w });
    });
  }

  const res = solveFrame(frameIndex.model, { nodal, distributed }, 21);

  const rearTopDisp = res.displacements[frameIndex.nodeIndex.rearTop];
  const frontTopDisp = res.displacements[frameIndex.nodeIndex.frontTop];
  const rearGroundDisp = res.displacements[frameIndex.nodeIndex.rearGround];
  const frontGroundDisp = res.displacements[frameIndex.nodeIndex.frontGround];

  const sumReactions = (nodeIdxs: number[]) => {
    let V = 0;
    let H = 0;
    let M = 0;
    for (const n of nodeIdxs) {
      const r = res.reactions.find((x) => x.node === n);
      if (r) {
        V += r.fy;
        H += r.fx;
        M += r.m;
      }
    }
    return { V, H, M };
  };
  // В упругой модели реакция распределена по пружинам заглублённой части
  const rearNodes = [...new Set(frameIndex.model.supports.map((s) => s.node))].filter((n) =>
    (frameIndex.model.nodes[n].label ?? "").startsWith("rearPost")
  );
  const frontNodes = [...new Set(frameIndex.model.supports.map((s) => s.node))].filter((n) =>
    (frameIndex.model.nodes[n].label ?? "").startsWith("frontPost")
  );

  return {
    case: ec,
    purlinQ,
    purlinQT,
    frame: {
      diagrams: res.diagrams,
      rearPostDrift: Math.abs(rearTopDisp.ux - rearGroundDisp.ux),
      frontPostDrift: Math.abs(frontTopDisp.ux - frontGroundDisp.ux),
      reactions: { rear: sumReactions(rearNodes), front: sumReactions(frontNodes) },
      equilibriumResidual: Math.abs(res.equilibrium.residualFy),
    },
  };
}
