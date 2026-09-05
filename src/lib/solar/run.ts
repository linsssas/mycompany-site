// Оркестратор расчёта: собирает геометрию, нагрузки, расчётные схемы, сочетания,
// проверки элементов, узлов и фундамента.

import { analyzeCase, analyzePurlinUnit, buildFrameModel, CaseResult, ElementaryCase, FrameModelIndex } from "./analysis";
import { buildBom, buildFastenerSummary, BomResult, FastenerRow } from "./bom";
import { buildCombinations, Combination } from "./combinations";
import { buildGeometry, DerivedGeometry, thermalElongation } from "./geometry";
import { sectionProperties, SectionProps } from "./sections";
import { calcSnow, SnowResult } from "./snow";
import { calcWind, WindResult } from "./wind";
import { region, ALTITUDE_FACTOR_PER_100M } from "./presets";
import {
  bendingPlusCripplingCheck,
  CheckRow,
  MemberGeometryInput,
  memberResistances,
  MemberResistances,
  memberUtilizations,
  memberUtilizationsInto,
  MEMBER_CHECK_KEYS,
  MEMBER_CHECK_COUNT,
  StationForces,
  slendernessCheck,
  toCheckRow,
  torsionCheck,
  webCripplingCheck,
} from "./checks/member";
import { checkJoint, checkPanelClamps, JointCheckResult } from "./checks/bolts";
import { checkFoundation, FoundationResult } from "./checks/foundation";
import {
  FormulaLine,
  MEMBER_ROLE_LABELS,
  MemberRole,
  MEMBER_ROLES,
  SolarProject,
  statusOf,
  Warning,
} from "./types";
import { fmt, kPaToNmm2, nmmToKNm, nToKN } from "./units";

export interface DeflectionRow {
  member: string;
  check: string;
  value: number; // мм
  limit: number; // мм
  utilization: number;
  combo: string;
  ref: string;
}

export interface LoadSummaryRow {
  name: string;
  value: string;
  unit: string;
  note: string;
}

export interface SolarResults {
  project: SolarProject;
  geom: DerivedGeometry;
  sections: Record<MemberRole, SectionProps>;
  bom: BomResult;
  snow: SnowResult;
  wind: WindResult;
  cases: CaseResult[];
  combos: Combination[];
  /** Расчётная схема рамы (узлы, элементы, опоры) — для отрисовки эпюр */
  frame: FrameModelIndex;
  /** Определяющие проверки (по одной строке на «элемент + вид проверки») */
  checks: CheckRow[];
  deflections: DeflectionRow[];
  joints: JointCheckResult[];
  fasteners: FastenerRow[];
  clampCheck: CheckRow;
  foundationRear: FoundationResult;
  foundationFront: FoundationResult;
  maxUtilization: number;
  governing: CheckRow | null;
  passes: boolean;
  warnings: Warning[];
  formulas: FormulaLine[];
  loadRows: LoadSummaryRow[];
  reactions: { combo: string; rearV: number; rearH: number; frontV: number; frontH: number }[];
  thermal: { deltaLmm: number; note: string };
  charts: SolarCharts;
  /** Диагностика: невязка равновесия по всем загружениям, Н */
  equilibriumResidual: number;
  /** Подсказки: какие исходные данные могли быть приняты иначе (ТЗ, п. 8) */
  diagnostics: string[];
}

export interface SolarCharts {
  utilizationVsAngle: { x: number; y: number }[];
  utilizationVsSnow: { x: number; y: number }[];
  utilizationVsWind: { x: number; y: number }[];
  /** Предельная снеговая нагрузка (кПа), при которой K = 1 */
  limitSnowKPa: number;
  /** Предельная скорость ветра (м/с) */
  limitWindMs: number;
  massVsAngle: { x: number; y: number }[];
  depthChart: { depthMm: number; lateralUtil: number; upliftSafety: number }[];
}

interface RunOptions {
  /** Считать графики-развёртки (отключается при рекурсивных вызовах) */
  sweeps?: boolean;
}

export function runSolarCalculation(project: SolarProject, options: RunOptions = {}): SolarResults {
  const withSweeps = options.sweeps !== false;
  const warnings: Warning[] = [];
  const formulas: FormulaLine[] = [];
  const mat = project.material;

  // ---------------- 1. Сечения ----------------
  const sections = {} as Record<MemberRole, SectionProps>;
  const sectionDims = {} as Record<MemberRole, { h: number; b: number }>;
  for (const role of MEMBER_ROLES) {
    const def = project.sections[role];
    sections[role] = sectionProperties(def, mat.fy, mat.rho);
    sectionDims[role] = { h: def.h, b: def.b };
    for (const w of sections[role].warnings) {
      warnings.push({ severity: "warning", scope: MEMBER_ROLE_LABELS[role], message: w });
    }
  }

  // ---------------- 2. Геометрия ----------------
  const geom = buildGeometry(project.geometry, project.panel, project.ground.embedDepth);
  warnings.push(...geom.warnings);

  // ---------------- 3. Спецификация и собственный вес ----------------
  const bom = buildBom(project, geom, sections);

  // ---------------- 4. Климатические нагрузки ----------------
  const reg = region(project.climate.regionKey);
  const skRegion = project.climate.skManual ?? reg.sk;
  const vbRegion = project.climate.vbManual ?? reg.vb;

  const snow = calcSnow({
    climate: project.climate,
    alphaDeg: geom.alphaDeg,
    skRegion,
    regionAltitude: reg.altitude,
    altitudeFactorPer100m: ALTITUDE_FACTOR_PER_100M,
    lowerEdgeHeight: geom.lowerEdgeHeight,
  });
  warnings.push(...snow.warnings);
  formulas.push(...snow.formulas);

  const wind = calcWind({
    climate: project.climate,
    alphaDeg: geom.alphaDeg,
    vbRegion,
    w0Region: reg.w0,
    zeMm: Math.max(geom.rearTopHeight, geom.upperEdgeHeight),
    arefMm2: geom.panelAreaM2 * 1e6,
    slopeLengthMm: geom.panelFieldSlope,
    // Торцевой силуэт стола: высота панельного поля × конструктивная глубина
    frontalAreaMm2: geom.panelFieldSlope * Math.sin(geom.alphaRad) * project.design.structuralDepthMm,
    frameCount: project.geometry.frameCount,
    edgeZoneFactor: project.design.edgeZoneFactor,
    alongMinFraction: project.design.alongMinFraction,
  });
  warnings.push(...wind.warnings);
  formulas.push(...wind.formulas);

  // ---------------- 5. Элементарные загружения ----------------
  const trib = geom.purlins.map((p) => p.tributary);

  // Собственный вес (панели + прогоны), Н/мм² плоскости ската
  const deadPressure = bom.panelPressure + bom.purlinPressure;
  const cases: ElementaryCase[] = [];

  cases.push({
    key: "G",
    label: "Собственный вес",
    kind: "dead",
    purlinLoads: trib.map((t) => ({ vertical: deadPressure * t, normal: 0 })),
    includeFrameSelfWeight: true,
    eccentricMoment: 0,
    alongForce: 0,
    montageForce: 0,
    edgeScale: 1,
    ref: "Спецификация металла + паспортная масса панелей",
  });

  // Снеговые схемы: нагрузка задана на горизонтальную проекцию, приводим к плоскости ската.
  // Гололёд задан сразу на плоскость панели, поэтому переводится напрямую.
  const sSlopeNmm2 = kPaToNmm2(snow.s) * Math.cos(geom.alphaRad);
  const iceNmm2 = kPaToNmm2(snow.iceKPa);
  for (const sc of snow.cases) {
    const intensity = sc.key === "ICE" ? iceNmm2 : sSlopeNmm2;
    cases.push({
      key: sc.key,
      label: sc.label,
      kind: "snow",
      purlinLoads: geom.purlins.map((p, i) => ({
        vertical: intensity * sc.distribution(p.fraction) * trib[i],
        normal: 0,
      })),
      includeFrameSelfWeight: false,
      eccentricMoment: 0,
      alongForce: 0,
      montageForce: 0,
      edgeScale: 1,
      ref: sc.ref,
    });
  }

  // Ветровые схемы
  for (const wc of wind.cases) {
    if (wc.direction === "along") {
      // Ветер вдоль стола не создаёт нагрузки на прогоны в плоскости рамы,
      // но передаётся связями на стойки — учитывается отдельной проверкой связей.
      cases.push({
        key: wc.key,
        label: wc.label,
        kind: "wind",
        purlinLoads: trib.map(() => ({ vertical: 0, normal: 0 })),
        includeFrameSelfWeight: false,
        eccentricMoment: 0,
        alongForce: (wc.totalKN * 1000) / Math.max(1, project.geometry.frameCount),
        montageForce: 0,
        edgeScale: project.design.edgeZoneFactor,
        ref: wc.ref,
      });
      continue;
    }
    const wNmm2 = kPaToNmm2(wc.wNet);
    // Распределение по скату. При режиме windwardHalf вся сила приложена к наветренной
    // половине ската с удвоенной интенсивностью — это даёт равнодействующую ровно на
    // 0,25·d от наветренной кромки (EN 1991-1-4, п. 7.3(3)). Эксцентриситет учитывается
    // именно распределением нагрузки, а не добавочной парой сил в одном узле.
    const shape = (fraction: number): number => {
      if (wc.distributionMode === "uniform") return 1;
      const inWindwardHalf = wc.windwardEdge === "lower" ? fraction < 0.5 : fraction >= 0.5;
      return inWindwardHalf ? 2 : 0;
    };
    cases.push({
      key: wc.key,
      label: wc.label,
      kind: "wind",
      purlinLoads: geom.purlins.map((p, i) => ({ vertical: 0, normal: wNmm2 * shape(p.fraction) * trib[i] })),
      includeFrameSelfWeight: false,
      eccentricMoment: 0,
      alongForce: 0,
      montageForce: 0,
      edgeScale: project.design.edgeZoneFactor,
      ref: wc.ref,
    });
  }

  cases.push({
    key: "MONT",
    label: "Монтажная нагрузка 1 кН на прогон",
    kind: "montage",
    purlinLoads: trib.map(() => ({ vertical: 0, normal: 0 })),
    includeFrameSelfWeight: false,
    eccentricMoment: 0,
    alongForce: 0,
    montageForce: project.design.montageLoadKN * 1000,
    edgeScale: 1,
    ref: "Сосредоточенная монтажная/эксплуатационная нагрузка (обслуживание)",
  });

  // ---------------- 6. Расчётные схемы ----------------
  const frameIndex = buildFrameModel(geom, sections, sectionDims, mat, project.ground);
  const purlinUnit = analyzePurlinUnit(project.geometry, geom, sections.purlin, mat, project.design);
  const ctx = {
    g: project.geometry,
    geom,
    sections,
    sectionDims,
    material: mat,
    ground: project.ground,
    design: project.design,
    frameIndex,
    selfWeightLine: bom.selfWeightLine,
    purlinUnit,
  };
  const caseResults = cases.map((c) => analyzeCase(ctx, c));
  const equilibriumResidual = Math.max(...caseResults.map((r) => r.frame.equilibriumResidual));

  // ---------------- 7. Сочетания ----------------
  const combos = buildCombinations({ design: project.design, cases });

  // ---------------- 8. Несущая способность элементов ----------------
  const purlinLtbLength = project.geometry.framePitch;
  const beamPurlinSpacing = Math.max(
    ...geom.purlins.map((p, i) => (i === 0 ? p.s : p.s - geom.purlins[i - 1].s)),
    geom.beamLength / Math.max(1, geom.purlins.length)
  );

  const memberInputs: Record<MemberRole, MemberGeometryInput> = {
    rearPost: {
      role: "rearPost",
      name: MEMBER_ROLE_LABELS.rearPost,
      section: sections.rearPost,
      length: geom.rearTopHeight,
      muFactor: project.design.bucklingFactors.rearPost,
      muFactorOut: project.design.bucklingFactorsOut.rearPost,
      ltbLength: geom.rearTopHeight,
      bearingLength: 60,
      cripplingCategory: 1,
      slendernessLimit: 150,
    },
    frontPost: {
      role: "frontPost",
      name: MEMBER_ROLE_LABELS.frontPost,
      section: sections.frontPost,
      length: geom.frontTopHeight,
      muFactor: project.design.bucklingFactors.frontPost,
      muFactorOut: project.design.bucklingFactorsOut.frontPost,
      ltbLength: geom.frontTopHeight,
      bearingLength: 60,
      cripplingCategory: 1,
      slendernessLimit: 150,
    },
    beam: {
      role: "beam",
      name: MEMBER_ROLE_LABELS.beam,
      section: sections.beam,
      length: geom.slopeSpan,
      muFactor: project.design.bucklingFactors.beam,
      muFactorOut: project.design.bucklingFactorsOut.beam,
      ltbLength: beamPurlinSpacing,
      bearingLength: Math.max(sectionDims.rearPost.h, 60),
      cripplingCategory: 2,
      slendernessLimit: 200,
    },
    brace: {
      role: "brace",
      name: MEMBER_ROLE_LABELS.brace,
      section: sections.brace,
      length: geom.brace.length,
      muFactor: project.design.bucklingFactors.brace,
      muFactorOut: project.design.bucklingFactorsOut.brace,
      ltbLength: geom.brace.length,
      bearingLength: 40,
      cripplingCategory: 1,
      slendernessLimit: 200,
    },
    purlin: {
      role: "purlin",
      name: MEMBER_ROLE_LABELS.purlin,
      section: sections.purlin,
      length: project.geometry.framePitch,
      muFactor: project.design.bucklingFactors.purlin,
      muFactorOut: project.design.bucklingFactorsOut.purlin,
      ltbLength: purlinLtbLength,
      bearingLength: Math.max(sectionDims.beam.b, 40),
      cripplingCategory: 2,
      slendernessLimit: 200,
    },
    windBrace: {
      role: "windBrace",
      name: MEMBER_ROLE_LABELS.windBrace,
      section: sections.windBrace,
      length: Math.hypot(project.geometry.framePitch, geom.rearTopHeight),
      muFactor: project.design.bucklingFactors.windBrace,
      muFactorOut: project.design.bucklingFactorsOut.windBrace,
      ltbLength: Math.hypot(project.geometry.framePitch, geom.rearTopHeight),
      bearingLength: 40,
      cripplingCategory: 1,
      slendernessLimit: 400,
    },
  };

  const resistances = {} as Record<MemberRole, MemberResistances>;
  for (const role of MEMBER_ROLES) {
    resistances[role] = memberResistances(memberInputs[role], mat, project.sections[role].rFactor);
    for (const n of resistances[role].notes) {
      if (n.includes("превышает")) warnings.push({ severity: "warning", scope: MEMBER_ROLE_LABELS[role], message: n });
    }
  }

  // ---------------- 9. Проверки по сочетаниям ----------------
  const best = new Map<string, CheckRow>();
  const record = (row: CheckRow) => {
    const key = `${row.role}|${row.check}`;
    const prev = best.get(key);
    if (!prev || row.utilization > prev.utilization) best.set(key, row);
  };

  const roleOfElement = (elRole: string): MemberRole | null => {
    if (elRole.startsWith("rearPost")) return "rearPost";
    if (elRole.startsWith("frontPost")) return "frontPost";
    if (elRole === "beam") return "beam";
    if (elRole === "brace") return "brace";
    return null;
  };

  const caseByKey = new Map(caseResults.map((r) => [r.case.key, r]));
  const variants: { key: string; label: string }[] = [
    { key: "typical", label: "рядовая рама" },
    { key: "edge", label: "крайняя рама (краевая зона)" },
  ];

  // Определяющие проверки элементов рамы хранятся в типизированных массивах:
  // внутренний цикл выполняется десятки тысяч раз и не должен выделять память.
  const makeSlot = () => ({
    util: new Float64Array(MEMBER_CHECK_COUNT).fill(-1),
    N: new Float64Array(MEMBER_CHECK_COUNT),
    M: new Float64Array(MEMBER_CHECK_COUNT),
    V: new Float64Array(MEMBER_CHECK_COUNT),
    combo: new Array<string>(MEMBER_CHECK_COUNT).fill(""),
    variant: new Array<string>(MEMBER_CHECK_COUNT).fill(""),
  });
  const roleSlot = {} as Record<MemberRole, ReturnType<typeof makeSlot>>;
  for (const role of MEMBER_ROLES) roleSlot[role] = makeSlot();
  const utilBuf = new Float64Array(MEMBER_CHECK_COUNT);
  const forceBuf: StationForces = { N: 0, M: 0, V: 0 };

  // Дополнительные проверки прогона: хранятся числа, строки формируются после цикла
  type Extra = { u: number; a: number; b: number; combo: string; variant: string };
  const emptyExtra = (): Extra => ({ u: 0, a: 0, b: 0, combo: "", variant: "" });
  const extras = {
    purlinWeak: emptyExtra(),
    purlinCrippling: emptyExtra(),
    purlinMRw: emptyExtra(),
    purlinTorsion: emptyExtra(),
  };
  const purlinMcyRd = (sections.purlin.Wv * mat.fy * mat.gammaC) / mat.gammaM0;
  const purlinEcc = project.sections.purlin.b / 2;
  const purlinTmax = sections.purlin.Aweb / Math.max(sections.purlin.hw, 1);
  const purlinTauRd = (mat.fy * mat.gammaC) / Math.sqrt(3) / mat.gammaM0;

  const reactions: SolarResults["reactions"] = [];
  const deflections: DeflectionRow[] = [];
  // Реакция V > 0 — грунт удерживает стойку снизу (вдавливание);
  // V < 0 — стойку тянет вверх (выдёргивание).
  const worstVertical = {
    rearCompression: 0,
    rearUplift: 0,
    frontCompression: 0,
    frontUplift: 0,
    upliftCombo: "",
  };
  let worstLateral = { H: 0, M: 0, combo: "" };
  let worstPurlinReaction = { value: 0, combo: "" };
  let worstJointShear = { purlinBeam: 0, beamPost: 0, brace: 0, splice: 0, combo: "" };
  let worstClampUplift = { value: 0, combo: "" };

  for (const combo of combos) {
    for (const variant of variants) {
      const factorOf = (caseKey: string) => {
        const term = combo.terms.find((t) => t.caseKey === caseKey);
        if (!term) return 0;
        const cr = caseByKey.get(caseKey);
        const scale = variant.key === "edge" && cr?.case.kind === "wind" ? cr.case.edgeScale : 1;
        return term.factor * scale;
      };
      const activeKeys = combo.terms.map((t) => t.caseKey).filter((k) => caseByKey.has(k));
      if (activeKeys.length === 0) continue;
      // Для рядовой рамы вариант «edge» не даёт новых результатов, если ветра нет
      if (variant.key === "edge" && !activeKeys.some((k) => caseByKey.get(k)!.case.kind === "wind")) continue;

      const comboLabel = `${combo.label} · ${variant.label}`;

      // --- Элементы рамы ---
      // Первый проход: только числа (быстро). Текстовые пояснения формируются
      // затем лишь для определяющих проверок — см. ниже «второй проход».
      if (combo.type !== "SLS") {
        const nElements = frameIndex.model.elements.length;
        const activeFactors = activeKeys.map((k) => ({ res: caseByKey.get(k)!, f: factorOf(k) })).filter((x) => x.f !== 0);
        for (let e = 0; e < nElements; e++) {
          const elRole = frameIndex.model.elements[e].role ?? "";
          const role = roleOfElement(elRole);
          if (!role) continue;
          const nStations = caseResults[0].frame.diagrams[e].stations.length;
          for (let st0 = 0; st0 < nStations; st0++) {
            let N = 0;
            let M = 0;
            let V = 0;
            for (const { res, f } of activeFactors) {
              const st = res.frame.diagrams[e].stations[st0];
              N += f * st.N;
              M += f * st.M;
              V += f * st.V;
            }
            forceBuf.N = N;
            forceBuf.M = M;
            forceBuf.V = V;
            memberUtilizationsInto(resistances[role], forceBuf, utilBuf);
            const slot = roleSlot[role];
            for (let c = 0; c < MEMBER_CHECK_COUNT; c++) {
              const u = utilBuf[c];
              if (u > slot.util[c]) {
                slot.util[c] = u;
                slot.N[c] = N;
                slot.M[c] = M;
                slot.V[c] = V;
                slot.combo[c] = combo.label;
                slot.variant[c] = variant.label;
              }
            }
          }
        }
      }

      // --- Прогон ---
      const qLines = geom.purlins.map((_, i) =>
        activeKeys.reduce((acc, key) => acc + factorOf(key) * (caseByKey.get(key)!.purlinQ[i] ?? 0), 0)
      );
      const qTLines = geom.purlins.map((_, i) =>
        activeKeys.reduce((acc, key) => acc + factorOf(key) * (caseByKey.get(key)!.purlinQT[i] ?? 0), 0)
      );
      const montageF = activeKeys.reduce(
        (acc, key) => acc + factorOf(key) * caseByKey.get(key)!.case.montageForce,
        0
      );
      const qWorst = qLines.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
      const qTWorst = qTLines.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);

      const purlinM = purlinUnit.distStrong.maxM * qWorst + purlinUnit.pointStrong.maxM * montageF;
      const purlinV = purlinUnit.distStrong.maxV * qWorst + purlinUnit.pointStrong.maxV * montageF;
      const purlinR = purlinUnit.distStrong.reactionInner * qWorst + purlinUnit.pointStrong.reactionInner * montageF;
      const purlinMweak = purlinUnit.distWeak.maxM * qTWorst;

      if (combo.type !== "SLS") {
        // Прогон: быстрый проход (как для элементов рамы), строки — в конце
        forceBuf.N = 0;
        forceBuf.M = purlinM;
        forceBuf.V = purlinV;
        memberUtilizationsInto(resistances.purlin, forceBuf, utilBuf);
        const slot = roleSlot.purlin;
        for (let c = 0; c < MEMBER_CHECK_COUNT; c++) {
          if (utilBuf[c] > slot.util[c]) {
            slot.util[c] = utilBuf[c];
            slot.N[c] = 0;
            slot.M[c] = purlinM;
            slot.V[c] = purlinV;
            slot.combo[c] = combo.label;
            slot.variant[c] = variant.label;
          }
        }

        // Изгиб относительно слабой оси (составляющая нагрузки вдоль ската)
        const uWeak = Math.abs(purlinMweak) / purlinMcyRd;
        if (uWeak > extras.purlinWeak.u) {
          extras.purlinWeak = { u: uWeak, a: Math.abs(purlinMweak), b: 0, combo: combo.label, variant: variant.label };
        }
        // Местная опорная реакция прогона на балку и её сочетание с моментом
        const uCrip = resistances.purlin.RwRd > 0 ? Math.abs(purlinR) / resistances.purlin.RwRd : 0;
        if (uCrip > extras.purlinCrippling.u) {
          extras.purlinCrippling = { u: uCrip, a: purlinR, b: 0, combo: combo.label, variant: variant.label };
        }
        const uMRw = (Math.abs(purlinM) / resistances.purlin.McRd + uCrip) / 1.25;
        if (uMRw > extras.purlinMRw.u) {
          extras.purlinMRw = { u: uMRw, a: purlinM, b: purlinR, combo: combo.label, variant: variant.label };
        }
        if (Math.abs(purlinR) > Math.abs(worstPurlinReaction.value)) {
          worstPurlinReaction = { value: purlinR, combo: comboLabel };
        }

        // Кручение прогона от внецентренного крепления. Прогон закреплён от поворота
        // на каждой раме, поэтому крутящий момент на опоре равен m·L/2, где
        // m = q·e — погонный крутящий момент, e — эксцентриситет (половина ширины профиля).
        // Раскрепляющее действие панелей в запас не учитывается.
        const torque = (Math.abs(qWorst) * purlinEcc * project.geometry.framePitch) / 2;
        const uTors = purlinTauRd > 0 ? (torque * purlinTmax) / Math.max(sections.purlin.It, 1e-9) / purlinTauRd : 0;
        if (uTors > extras.purlinTorsion.u) {
          extras.purlinTorsion = { u: uTors, a: torque, b: 0, combo: combo.label, variant: variant.label };
        }
      }

      // --- Связи (ветер вдоль стола) ---
      const alongForce = activeKeys.reduce(
        (acc, key) => acc + factorOf(key) * caseByKey.get(key)!.case.alongForce,
        0
      );
      if (Math.abs(alongForce) > 0 && combo.type !== "SLS") {
        // Продольная сила передаётся на связи; работают растянутые диагонали одного направления
        const braceAngle = Math.atan2(geom.rearTopHeight, project.geometry.framePitch);
        const nEffective = 2;
        const forcePerBrace = ((Math.abs(alongForce) * project.geometry.frameCount) / nEffective) / Math.cos(braceAngle);
        forceBuf.N = forcePerBrace;
        forceBuf.M = 0;
        forceBuf.V = 0;
        memberUtilizationsInto(resistances.windBrace, forceBuf, utilBuf);
        const slot = roleSlot.windBrace;
        for (let c = 0; c < MEMBER_CHECK_COUNT; c++) {
          if (utilBuf[c] > slot.util[c]) {
            slot.util[c] = utilBuf[c];
            slot.N[c] = forcePerBrace;
            slot.M[c] = 0;
            slot.V[c] = 0;
            slot.combo[c] = combo.label;
            slot.variant[c] = variant.label;
          }
        }
      }

      // --- Реакции и усилия для узлов и фундамента ---
      const rearReaction = activeKeys.reduce(
        (acc, key) => {
          const f = factorOf(key);
          const r = caseByKey.get(key)!.frame.reactions;
          return { V: acc.V + f * r.rear.V, H: acc.H + f * r.rear.H, M: acc.M + f * r.rear.M };
        },
        { V: 0, H: 0, M: 0 }
      );
      const frontReaction = activeKeys.reduce(
        (acc, key) => {
          const f = factorOf(key);
          const r = caseByKey.get(key)!.frame.reactions;
          return { V: acc.V + f * r.front.V, H: acc.H + f * r.front.H, M: acc.M + f * r.front.M };
        },
        { V: 0, H: 0, M: 0 }
      );

      if (combo.type !== "SLS") {
        reactions.push({
          combo: comboLabel,
          rearV: nToKN(rearReaction.V),
          rearH: nToKN(rearReaction.H),
          frontV: nToKN(frontReaction.V),
          frontH: nToKN(frontReaction.H),
        });
        worstVertical.rearCompression = Math.max(worstVertical.rearCompression, rearReaction.V);
        worstVertical.frontCompression = Math.max(worstVertical.frontCompression, frontReaction.V);
        if (-rearReaction.V > worstVertical.rearUplift) {
          worstVertical.rearUplift = -rearReaction.V;
          worstVertical.upliftCombo = comboLabel;
        }
        worstVertical.frontUplift = Math.max(worstVertical.frontUplift, -frontReaction.V);
        if (Math.abs(rearReaction.H) > Math.abs(worstLateral.H)) {
          worstLateral = { H: rearReaction.H, M: rearReaction.M, combo: comboLabel };
        }
        // Усилия в узлах
        const beamPostShear = Math.abs(rearReaction.V) + Math.abs(rearReaction.H);
        if (beamPostShear > worstJointShear.beamPost) {
          worstJointShear = {
            ...worstJointShear,
            beamPost: beamPostShear,
            purlinBeam: Math.abs(purlinR),
            splice: Math.abs(purlinUnit.distStrong.spliceMoment * qWorst),
            combo: comboLabel,
          };
        }
        // Отрыв панели: подъёмное давление × площадь панели
        const upliftPressure = activeKeys.reduce((acc, key) => {
          const f = factorOf(key);
          const cr = caseByKey.get(key)!;
          if (cr.case.kind !== "wind") return acc;
          const q = cr.purlinQ[0] ?? 0;
          return acc + f * q;
        }, 0);
        if (upliftPressure < 0) {
          const perPanel =
            (Math.abs(upliftPressure) / Math.max(trib[0], 1)) * project.panel.length * project.panel.width;
          if (perPanel > worstClampUplift.value) worstClampUplift = { value: perPanel, combo: comboLabel };
        }
      }

      // --- Прогибы (SLS) ---
      if (combo.type === "SLS" && variant.key === "typical") {
        const purlinDefl = Math.abs(purlinUnit.distStrong.maxDeflection * qWorst);
        deflections.push({
          member: "Прогон",
          check: `Прогиб в пролёте (предел L/${project.design.deflectionLimits.purlin})`,
          value: purlinDefl,
          limit: project.geometry.framePitch / project.design.deflectionLimits.purlin,
          utilization: purlinDefl / (project.geometry.framePitch / project.design.deflectionLimits.purlin),
          combo: combo.label,
          ref: "EN 1993-1-3, разд. 7 (предельные состояния по пригодности к эксплуатации)",
        });

        // Прогиб балки: максимальный прогиб элементов балки
        let beamDefl = 0;
        for (let e = 0; e < frameIndex.model.elements.length; e++) {
          if (frameIndex.model.elements[e].role !== "beam") continue;
          let d = 0;
          for (const key of activeKeys) d += factorOf(key) * caseByKey.get(key)!.frame.diagrams[e].maxDeflection;
          beamDefl = Math.max(beamDefl, Math.abs(d));
        }
        const beamLimit = geom.slopeSpan / project.design.deflectionLimits.beam;
        deflections.push({
          member: "Балка (стропило)",
          check: `Прогиб в пролёте (предел L/${project.design.deflectionLimits.beam})`,
          value: beamDefl,
          limit: beamLimit,
          utilization: beamDefl / beamLimit,
          combo: combo.label,
          ref: "EN 1993-1-3, разд. 7",
        });

        // Смещение верха стойки
        let drift = 0;
        for (const key of activeKeys) drift += factorOf(key) * caseByKey.get(key)!.frame.rearPostDrift;
        const driftLimit = geom.rearTopHeight / project.design.deflectionLimits.postDrift;
        deflections.push({
          member: "Стойка задняя",
          check: `Горизонтальное смещение верха (предел H/${project.design.deflectionLimits.postDrift})`,
          value: Math.abs(drift),
          limit: driftLimit,
          utilization: Math.abs(drift) / driftLimit,
          combo: combo.label,
          ref: "EN 1993-1-1, разд. 7 / СП 20.13330 прил. Д",
        });

        // Относительный прогиб под панелью — допуск производителя модуля
        deflections.push({
          member: "Панель",
          check: `Относительный прогиб под панелью (допуск производителя ±${project.design.deflectionLimits.panelAbsMm} мм)`,
          value: purlinDefl,
          limit: project.design.deflectionLimits.panelAbsMm,
          utilization: purlinDefl / project.design.deflectionLimits.panelAbsMm,
          combo: combo.label,
          ref: "Требования изготовителя фотоэлектрического модуля (риск микротрещин в ячейках)",
        });
      }
    }
  }

  // Дополнительные проверки прогона — строки по сохранённым определяющим значениям
  if (extras.purlinWeak.u > 0) {
    record({
      id: "purlin-weak",
      member: memberInputs.purlin.name,
      role: "purlin",
      check: "Изгиб относительно слабой оси (составляющая вдоль ската)",
      Ed: nmmToKNm(extras.purlinWeak.a),
      Rd: nmmToKNm(purlinMcyRd),
      unit: "кН·м",
      utilization: extras.purlinWeak.u,
      status: statusOf(extras.purlinWeak.u),
      combo: extras.purlinWeak.combo,
      variant: extras.purlinWeak.variant,
      ref: "EN 1993-1-3, п. 6.1.4 (изгиб относительно оси y)",
      formula: "M_cy,Rd = Wy·fy/γM0",
      substitution: `${fmt(nmmToKNm(extras.purlinWeak.a))} / ${fmt(nmmToKNm(purlinMcyRd))}`,
    });
  }
  record(
    toCheckRow(
      webCripplingCheck(resistances.purlin, extras.purlinCrippling.a),
      memberInputs.purlin.name,
      "purlin",
      extras.purlinCrippling.combo,
      extras.purlinCrippling.variant
    )
  );
  record(
    toCheckRow(
      bendingPlusCripplingCheck(resistances.purlin, extras.purlinMRw.a, extras.purlinMRw.b),
      memberInputs.purlin.name,
      "purlin",
      extras.purlinMRw.combo,
      extras.purlinMRw.variant
    )
  );
  record(
    toCheckRow(
      torsionCheck(sections.purlin, extras.purlinTorsion.a, mat),
      memberInputs.purlin.name,
      "purlin",
      extras.purlinTorsion.combo,
      extras.purlinTorsion.variant
    )
  );

  // Второй проход: подробные строки только для определяющих проверок элементов рамы
  for (const role of MEMBER_ROLES) {
    const slot = roleSlot[role];
    for (let c = 0; c < MEMBER_CHECK_COUNT; c++) {
      if (slot.util[c] < 0) continue;
      const items = memberUtilizations(
        resistances[role],
        { N: slot.N[c], M: slot.M[c], V: slot.V[c] },
        mat
      );
      const item = items.find((i) => i.key === MEMBER_CHECK_KEYS[c]);
      if (item) record(toCheckRow(item, memberInputs[role].name, role, slot.combo[c], slot.variant[c]));
    }
  }

  // Гибкость элементов — не зависит от сочетания
  for (const role of MEMBER_ROLES) {
    record(
      toCheckRow(
        slendernessCheck(resistances[role], memberInputs[role].slendernessLimit),
        memberInputs[role].name,
        role,
        "—",
        "—"
      )
    );
  }

  // ---------------- 10. Узлы ----------------
  const jointForces: Record<string, { shear: number; tension: number }> = {
    panel_purlin: { shear: 0, tension: worstClampUplift.value },
    purlin_beam: { shear: Math.abs(worstPurlinReaction.value), tension: Math.abs(worstPurlinReaction.value) },
    beam_post: { shear: worstJointShear.beamPost, tension: worstVertical.rearUplift },
    brace_beam: { shear: 0, tension: 0 },
    brace_plate: { shear: 0, tension: 0 },
    purlin_splice: { shear: Math.abs(worstPurlinReaction.value), tension: 0 },
    wind_brace: { shear: 0, tension: 0 },
  };

  // Усилие в подпорке — из эпюр
  let braceForce = 0;
  for (let e = 0; e < frameIndex.model.elements.length; e++) {
    if (frameIndex.model.elements[e].role !== "brace") continue;
    for (const combo of combos) {
      if (combo.type === "SLS") continue;
      let n = 0;
      for (const term of combo.terms) {
        const cr = caseByKey.get(term.caseKey);
        if (!cr) continue;
        n += term.factor * cr.frame.diagrams[e].stations[0].N;
      }
      braceForce = Math.max(braceForce, Math.abs(n));
    }
  }
  jointForces.brace_beam = { shear: braceForce, tension: 0 };
  jointForces.brace_plate = { shear: braceForce, tension: 0 };

  // Усилие в связях
  const windAlongCase = caseResults.find((r) => r.case.key.startsWith("W3"));
  if (windAlongCase) {
    const braceAngle = Math.atan2(geom.rearTopHeight, project.geometry.framePitch);
    jointForces.wind_brace = {
      shear:
        (Math.abs(windAlongCase.case.alongForce) * project.design.gammaQ * project.geometry.frameCount) /
        2 /
        Math.cos(braceAngle),
      tension: 0,
    };
  }

  const joints = project.bolts.joints.map((j) =>
    checkJoint({
      joint: j,
      shear: jointForces[j.key]?.shear ?? 0,
      tension: jointForces[j.key]?.tension ?? 0,
      material: mat,
      combo: worstJointShear.combo || "—",
    })
  );
  for (const j of joints) {
    warnings.push(...j.warnings);
    for (const row of j.rows) record(row);
  }

  const clampsPerPanel =
    geom.panelCount > 0
      ? (project.bolts.clampEndCount + project.bolts.clampMidCount * 2) / Math.max(geom.panelCount, 1)
      : 4;
  const clampCheck = checkPanelClamps(
    worstClampUplift.value,
    Math.max(clampsPerPanel, 2),
    project.bolts.clampCapacityKN,
    worstClampUplift.combo || "—"
  );
  record(clampCheck);

  // Ведомость метизов
  const requiredFasteners = project.bolts.joints.map((j) => {
    const jr = joints.find((x) => x.key === j.key)!;
    const multiplier = fastenerMultiplier(j.key, project, geom);
    return { d: j.d, count: jr.requiredCount * multiplier };
  });
  const fasteners = buildFastenerSummary(requiredFasteners, project.bolts.drawingCounts);

  // ---------------- 11. Фундамент ----------------
  // Вес конструкции уже учтён в реакции МКЭ (сочетание 0,9·G + 1,5·W), поэтому
  // в несущую способность на выдёргивание он повторно НЕ включается.
  const deadWeightPerPost = 0;
  const foundationRear = checkFoundation({
    ground: project.ground,
    width: Math.max(sectionDims.rearPost.h, sectionDims.rearPost.b),
    Ncompression: worstVertical.rearCompression,
    Nuplift: worstVertical.rearUplift,
    H: worstLateral.H,
    M: worstLateral.M,
    deadWeight: deadWeightPerPost,
    material: mat,
    combo: worstVertical.upliftCombo || worstLateral.combo,
  });
  const foundationFront = checkFoundation({
    ground: project.ground,
    width: Math.max(sectionDims.frontPost.h, sectionDims.frontPost.b),
    Ncompression: worstVertical.frontCompression,
    Nuplift: worstVertical.frontUplift,
    H: worstLateral.H * 0.7,
    M: worstLateral.M * 0.7,
    deadWeight: deadWeightPerPost,
    material: mat,
    combo: worstVertical.upliftCombo || worstLateral.combo,
  });
  warnings.push(...foundationRear.warnings);
  for (const row of [...foundationRear.rows, ...foundationFront.rows]) record(row);

  // ---------------- 12. Температурные воздействия ----------------
  const deltaL = thermalElongation(geom.tableLength, project.climate.deltaT);
  const thermal = {
    deltaLmm: deltaL,
    note: `ΔL = α·ΔT·L = 12·10⁻⁶ · ${fmt(project.climate.deltaT)} °C · ${fmt(geom.tableLength)} мм = ±${fmt(
      deltaL
    )} мм`,
  };
  if (Math.abs(deltaL) > 10) {
    warnings.push({
      severity: "warning",
      scope: "Температура",
      message: `Температурное удлинение стола ±${fmt(
        deltaL
      )} мм. Монтажный стык прогонов и овальные отверстия должны допускать такое перемещение, иначе возникают дополнительные усилия в связях и стойках. Рассмотрите температурный шов.`,
    });
  }

  // ---------------- 13. Итоги ----------------
  const checks = [...best.values()].sort((a, b) => b.utilization - a.utilization);
  const governing = checks.length > 0 ? checks[0] : null;
  const maxDeflectionUtil = deflections.reduce((a, d) => Math.max(a, d.utilization), 0);
  const maxUtilization = Math.max(governing?.utilization ?? 0, 0);
  const passes = maxUtilization <= 1.0 && maxDeflectionUtil <= 1.0 && !warnings.some((w) => w.severity === "error");

  const loadRows = buildLoadRows(project, geom, snow, wind, bom);

  const charts = withSweeps
    ? buildCharts(project, maxUtilization, foundationRear)
    : {
        utilizationVsAngle: [],
        utilizationVsSnow: [],
        utilizationVsWind: [],
        limitSnowKPa: 0,
        limitWindMs: 0,
        massVsAngle: [],
        depthChart: foundationRear.depthChart,
      };

  // Подсказки опираются на графики-развёртки (предельный снег/ветер), поэтому
  // формируются только в полном расчёте.
  const diagnostics = withSweeps ? buildDiagnostics(project, geom, wind, snow, checks, charts) : [];

  return {
    project,
    geom,
    sections,
    bom,
    snow,
    wind,
    cases: caseResults,
    combos,
    frame: frameIndex,
    checks,
    deflections,
    joints,
    fasteners,
    clampCheck,
    foundationRear,
    foundationFront,
    maxUtilization,
    governing,
    passes,
    warnings,
    formulas,
    loadRows,
    reactions: reactions.sort((a, b) => Math.abs(b.rearV) - Math.abs(a.rearV)).slice(0, 40),
    thermal,
    charts,
    equilibriumResidual,
    diagnostics,
  };
}

/**
 * Подсказки при непрохождении проверок: перечисляет исходные данные, которые могли
 * быть приняты иначе в исходном проекте, и указывает наиболее чувствительные параметры.
 */
function buildDiagnostics(
  project: SolarProject,
  geom: DerivedGeometry,
  wind: WindResult,
  snow: SnowResult,
  checks: CheckRow[],
  charts: SolarCharts
): string[] {
  const out: string[] = [];
  const worst = checks[0];
  if (!worst || worst.utilization <= 1) return out;

  const upliftGoverns = checks.some(
    (c) => c.utilization > 1 && (c.combo.includes("Подъём") || c.combo.includes("отрыв"))
  );

  if (upliftGoverns || worst.combo.includes("Ветер")) {
    if (geom.alphaDeg > 30) {
      out.push(
        `Определяет ветровой отсос, а коэффициенты таблицы 7.6 EN 1991-1-4 нормируются только до 30° — при α = ${fmt(
          geom.alphaDeg
        )}° они получены экстраполяцией и завышены. Для наземных СЭС проверьте значения по методике ASCE 7-22, гл. 29.4.4 (GCrn), либо задайте cf вручную в wind_coefficients.json.`
      );
    }
    out.push(
      `Методика «свободно стоящего навеса» (п. 7.3) даёт для стола суммарный отсос ${fmt(
        Math.max(...wind.cases.map((c) => Math.abs(c.totalKN)))
      )} кН при собственном весе ${fmt(
        (project.panel.mass * geom.panelCount) / 100
      )} кН — она консервативна для рядов панелей, стоящих в поле группами: соседние ряды взаимно экранируют друг друга. Уточните коэффициент заполнения φ и краевые зоны.`
    );
    out.push(
      `Проверьте базовую скорость ветра: при vb = ${fmt(wind.vb)} м/с конструкция не проходит; предельная скорость по расчёту — ${
        isFinite(charts.limitWindMs) ? fmt(charts.limitWindMs) + " м/с" : "не определена (не проходит и без ветра)"
      }. В исходном проекте могла быть принята меньшая скорость либо другая категория местности (сейчас ${project.climate.terrain}).`
    );
    out.push(
      `Коэффициент краевых зон ${fmt(
        project.design.edgeZoneFactor
      )} применён вместе со схемой эксцентриситета равнодействующей — это двойной запас. Для рядовых рам смотрите строки с пометкой «рядовая рама».`
    );
  }

  if (checks.some((c) => c.utilization > 1 && c.role === "foundation")) {
    out.push(
      `Фундамент: потребное заглубление по расчёту ${fmt(
        charts.depthChart.length > 0 ? project.ground.embedDepth : 0
      )} мм недостаточно. Увеличьте заглубление, перейдите на бетонирование в скважине (диаметр ${fmt(
        project.ground.concreteDia
      )} мм) либо уточните характеристики грунта по данным изысканий — принятые значения справочные.`
    );
  }

  if (snow.s > 0 && checks.some((c) => c.utilization > 1 && c.combo.includes("нег"))) {
    out.push(
      isFinite(charts.limitSnowKPa)
        ? `Предельная снеговая нагрузка конструкции — ${fmt(charts.limitSnowKPa)} кПа на грунт; принято sk = ${fmt(
            snow.sk
          )} кПа.`
        : `Определяющим является не снег: конструкция не проходит и при нулевой снеговой нагрузке.`
    );
  }

  out.push(
    "Проверьте марку стали и толщины: пресет принимает S350GD и толщины 1,5–2,0 мм по чертежу. Увеличение толщины стенки на 0,5 мм даёт заметный прирост эффективных характеристик тонкостенного профиля."
  );
  return out;
}

/** Сколько узлов данного типа на столе (для ведомости метизов). */
function fastenerMultiplier(key: string, project: SolarProject, geom: DerivedGeometry): number {
  const n = project.geometry.frameCount;
  switch (key) {
    case "purlin_beam":
      return n * geom.purlins.length;
    case "beam_post":
      return n * 2;
    case "brace_beam":
    case "brace_plate":
      return project.geometry.braceEnabled ? n : 0;
    case "purlin_splice": {
      const sectionsPerLine =
        project.geometry.purlinSectionLength > 0
          ? Math.ceil(geom.tableLength / project.geometry.purlinSectionLength)
          : 1;
      return geom.purlins.length * Math.max(0, sectionsPerLine - 1);
    }
    case "wind_brace":
      return 8;
    case "panel_purlin":
      return geom.panelCount * 2;
    default:
      return n;
  }
}

function buildLoadRows(
  project: SolarProject,
  geom: DerivedGeometry,
  snow: SnowResult,
  wind: WindResult,
  bom: BomResult
): LoadSummaryRow[] {
  const rows: LoadSummaryRow[] = [];
  const tribAvg = geom.purlins.length > 0 ? geom.purlins[0].tributary : 0;
  rows.push({
    name: "Снег на горизонтальную проекцию",
    value: fmt(snow.s),
    unit: "кПа",
    note: `s = μ₁·Ce·Ct·sk, μ₁ = ${fmt(snow.mu1)}, sk = ${fmt(snow.sk)} кПа`,
  });
  rows.push({
    name: "Снег на плоскость ската",
    value: fmt(snow.sSlope),
    unit: "кПа",
    note: `s·cos α, α = ${fmt(geom.alphaDeg)}°`,
  });
  rows.push({
    name: "Снег — погонная на прогон",
    value: fmt((snow.sSlope * tribAvg) / 1000),
    unit: "кН/м",
    note: `грузовая полоса ${fmt(tribAvg)} мм`,
  });
  rows.push({
    name: "Снег — суммарно на стол",
    value: fmt(snow.s * geom.projectedAreaM2),
    unit: "кН",
    note: `${fmt((snow.s * geom.projectedAreaM2 * 1000) / 9.80665 / 1000)} т на горизонтальную проекцию ${fmt(
      geom.projectedAreaM2
    )} м²`,
  });
  rows.push({
    name: "Пиковое скоростное давление qp(ze)",
    value: fmt(wind.qp),
    unit: "кПа",
    note: `ze = ${fmt(wind.ze)} м, vb = ${fmt(wind.vb)} м/с, vm = ${fmt(wind.vm)} м/с`,
  });
  for (const c of wind.cases) {
    rows.push({
      name: `Ветер: ${c.label}`,
      value: fmt(c.wNet),
      unit: "кПа",
      note: `cf = ${fmt(c.cf)}; сила на стол ${fmt(c.totalKN)} кН${
        c.eccentricMomentKNm ? `; момент от эксцентриситета ${fmt(c.eccentricMomentKNm)} кН·м на раму` : ""
      }`,
    });
  }
  rows.push({
    name: "Собственный вес металла",
    value: fmt(bom.steelMassWithFasteners),
    unit: "кг",
    note: `${fmt(bom.steelMassWithFasteners / 1000)} т, коэффициент на крепёж ${project.selfWeight.fastenerFactor}`,
  });
  rows.push({
    name: "Вес панелей",
    value: fmt(bom.panelMass),
    unit: "кг",
    note: `${geom.panelCount} шт × ${fmt(project.panel.mass)} кг`,
  });
  rows.push({
    name: "Общая масса стола",
    value: fmt(bom.totalMass),
    unit: "кг",
    note: `${fmt(bom.totalMass / 1000)} т`,
  });
  return rows;
}

/** Развёртки для графиков: пересчёт с изменением одного параметра. */
function buildCharts(project: SolarProject, baseUtil: number, foundation: FoundationResult): SolarCharts {
  const utilizationVsAngle: { x: number; y: number }[] = [];
  const massVsAngle: { x: number; y: number }[] = [];
  for (let a = 5; a <= 60; a += 5) {
    const p: SolarProject = {
      ...project,
      geometry: { ...project.geometry, tiltDeg: a, linkMode: "heights" },
    };
    try {
      const r = runSolarCalculation(p, { sweeps: false });
      utilizationVsAngle.push({ x: a, y: r.maxUtilization });
      massVsAngle.push({ x: a, y: r.bom.massPerKW });
    } catch {
      // Недопустимая геометрия — точку пропускаем
    }
  }

  const utilizationVsSnow: { x: number; y: number }[] = [];
  for (let sk = 0; sk <= 4.01; sk += 0.5) {
    const p: SolarProject = { ...project, climate: { ...project.climate, skManual: sk } };
    try {
      const r = runSolarCalculation(p, { sweeps: false });
      utilizationVsSnow.push({ x: sk, y: r.maxUtilization });
    } catch {
      /* пропуск */
    }
  }
  const limitSnowKPa = findLimit(utilizationVsSnow);

  const utilizationVsWind: { x: number; y: number }[] = [];
  for (let v = 0; v <= 50.01; v += 5) {
    const p: SolarProject = { ...project, climate: { ...project.climate, vbManual: v } };
    try {
      const r = runSolarCalculation(p, { sweeps: false });
      utilizationVsWind.push({ x: v, y: r.maxUtilization });
    } catch {
      /* пропуск */
    }
  }
  const limitWindMs = findLimit(utilizationVsWind);

  void baseUtil;
  return {
    utilizationVsAngle,
    utilizationVsSnow,
    utilizationVsWind,
    limitSnowKPa,
    limitWindMs,
    massVsAngle,
    depthChart: foundation.depthChart,
  };
}

/**
 * Линейная интерполяция точки, где коэффициент использования достигает 1,0.
 * Возвращает NaN, если конструкция не проходит уже при нулевом значении параметра
 * (определяет другое воздействие) либо проходит во всём диапазоне развёртки.
 */
export function findLimit(points: { x: number; y: number }[]): number {
  if (points.length === 0) return NaN;
  if (points[0].y > 1) return NaN;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.y <= 1 && b.y > 1) {
      const k = (1 - a.y) / (b.y - a.y);
      return a.x + k * (b.x - a.x);
    }
  }
  return Infinity;
}
