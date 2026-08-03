import { ElementRole, ProfileAssignment, SectionProperties, MaterialProperties } from "./types";
import { ElementForces } from "./memberForces";
import { ElementCombos, ComboKey } from "./combinations";
import { resolveSection } from "./profileResolve";
import { getMaterial } from "./materials";

export type UtilizationColor = "green" | "yellow" | "red";

export function utilizationColor(ratio: number): UtilizationColor {
  if (ratio < 0.7) return "green";
  if (ratio <= 0.9) return "yellow";
  return "red";
}

// Коэффициент расчетной длины по типу элемента (упрощенно)
const EFFECTIVE_LENGTH_FACTOR: Record<ElementRole, number> = {
  post: 2.0, // консоль, защемленная в основании
  beam: 1.0,
  purlin: 1.0,
  brace: 1.0,
  diagonal: 1.0,
};

const DEFLECTION_LIMIT_DIVISOR: Partial<Record<ElementRole, number>> = {
  beam: 250,
  purlin: 200,
};

const IMPERFECTION_ALPHA = 0.34; // кривая устойчивости "b" по EN1993-1-1 (упрощенно, для всех типов сечений)

export interface CheckedElement {
  id: string;
  role: ElementRole;
  label: string;
  section: SectionProperties;
  material: MaterialProperties;
  governingCombo: ComboKey;
  N: number; // кН
  M: number; // кН·м
  sigmaN: number; // МПа
  sigmaM: number; // МПа
  strengthUtilization: number;
  slenderness: number;
  bucklingUtilization: number;
  localRatio: number;
  localLimit: number;
  localOk: boolean;
  deflectionMm?: number;
  deflectionLimitMm?: number;
  deflectionUtilization?: number;
  overallUtilization: number;
  color: UtilizationColor;
  safetyFactor: number;
}

function bucklingReduction(lambdaBar: number): number {
  if (lambdaBar <= 0.2) return 1.0;
  const phi = 0.5 * (1 + IMPERFECTION_ALPHA * (lambdaBar - 0.2) + lambdaBar ** 2);
  const chi = 1 / (phi + Math.sqrt(Math.max(phi ** 2 - lambdaBar ** 2, 1e-6)));
  return Math.min(1, chi);
}

export function checkElement(
  forces: ElementForces,
  combo: ElementCombos,
  assignment: ProfileAssignment,
  slsMomentOverride?: number
): CheckedElement {
  const section = resolveSection(assignment);
  const material = getMaterial(assignment.materialKey, assignment.customMaterial);
  const Rd = material.fy / material.gammaM; // МПа

  const uls = combo.combos.ULS;
  const N = Math.abs(uls.N); // кН
  const M = Math.abs(uls.M); // кН·м

  const A_mm2 = section.area * 100;
  const W_mm3 = section.Wx * 1000;

  const sigmaN = (N * 1000) / A_mm2; // МПа
  const sigmaM = (M * 1e6) / W_mm3; // МПа
  const strengthUtilization = (sigmaN + sigmaM) / Rd;

  const iCm = Math.min(section.ix ?? Math.sqrt(section.Ix / section.area), section.iy ?? Math.sqrt(section.Iy / section.area));
  const Lef_cm = forces.lengthM * 100 * EFFECTIVE_LENGTH_FACTOR[forces.role];
  const slenderness = iCm > 0 ? Lef_cm / iCm : 0;
  const sigmaCr = slenderness > 0 ? (Math.PI ** 2 * material.E) / slenderness ** 2 : Infinity;
  const lambdaBar = sigmaCr > 0 ? Math.sqrt(material.fy / sigmaCr) : 0;
  const chi = bucklingReduction(lambdaBar);
  const N_b_Rd = (chi * A_mm2 * material.fy) / material.gammaM / 1000; // кН
  const bucklingUtilization = uls.N > 0 && N_b_Rd > 0 ? N / N_b_Rd : 0;

  const flatWidth = Math.max(section.h, section.b) - 2 * section.t;
  const localRatio = section.t > 0 ? flatWidth / section.t : 0;
  const localLimit = 42 * Math.sqrt(235 / material.fy);
  const localOk = localRatio <= localLimit;

  let deflectionMm: number | undefined;
  let deflectionLimitMm: number | undefined;
  let deflectionUtilization: number | undefined;
  const divisor = DEFLECTION_LIMIT_DIVISOR[forces.role];
  if (divisor) {
    const M_sls = Math.abs(slsMomentOverride ?? combo.combos.SLS.M) * 1e6; // Н·мм
    const L_mm = forces.lengthM * 1000;
    const I_mm4 = section.Ix * 1e4;
    // M[Н·мм], L[мм], E[МПа=Н/мм2], I[мм4] -> прогиб в мм
    deflectionMm = (5 * M_sls * L_mm ** 2) / (48 * material.E * I_mm4);
    deflectionLimitMm = L_mm / divisor;
    deflectionUtilization = deflectionLimitMm > 0 ? deflectionMm / deflectionLimitMm : 0;
  }

  const overallUtilization = Math.max(strengthUtilization, bucklingUtilization, deflectionUtilization ?? 0);

  return {
    id: forces.id,
    role: forces.role,
    label: forces.label,
    section,
    material,
    governingCombo: combo.governing,
    N: uls.N,
    M: uls.M,
    sigmaN,
    sigmaM,
    strengthUtilization,
    slenderness,
    bucklingUtilization,
    localRatio,
    localLimit,
    localOk,
    deflectionMm,
    deflectionLimitMm,
    deflectionUtilization,
    overallUtilization,
    color: utilizationColor(overallUtilization),
    safetyFactor: overallUtilization > 0 ? 1 / overallUtilization : Infinity,
  };
}

export function checkAllElements(
  elements: ElementForces[],
  combos: ElementCombos[],
  assignments: Record<ElementRole, ProfileAssignment>
): CheckedElement[] {
  return elements.map((el) => {
    const combo = combos.find((c) => c.id === el.id)!;
    return checkElement(el, combo, assignments[el.role]);
  });
}
