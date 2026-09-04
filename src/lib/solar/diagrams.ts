// Сборка эпюр по сочетанию нагрузок.
// Система линейно упругая, поэтому эпюра сочетания — линейная комбинация эпюр
// от элементарных загружений.

import { CaseResult } from "./analysis";
import { Combination } from "./combinations";
import { FemModel } from "./fem";

export interface CombinedStation {
  x: number;
  N: number;
  V: number;
  M: number;
}

export interface CombinedDiagram {
  element: number;
  role: string;
  length: number;
  stations: CombinedStation[];
  maxM: number;
  maxV: number;
  maxN: number;
}

export function combineDiagrams(
  cases: CaseResult[],
  combo: Combination,
  model: FemModel,
  variant: "typical" | "edge" = "typical"
): CombinedDiagram[] {
  const byKey = new Map(cases.map((c) => [c.case.key, c]));
  const terms = combo.terms
    .map((t) => {
      const cr = byKey.get(t.caseKey);
      if (!cr) return null;
      const scale = variant === "edge" && cr.case.kind === "wind" ? cr.case.edgeScale : 1;
      return { cr, factor: t.factor * scale };
    })
    .filter((x): x is { cr: CaseResult; factor: number } => x !== null);

  if (terms.length === 0) return [];
  const template = terms[0].cr.frame.diagrams;

  return template.map((d, elIdx) => {
    const stations: CombinedStation[] = d.stations.map((st, i) => {
      let N = 0;
      let V = 0;
      let M = 0;
      for (const { cr, factor } of terms) {
        const s = cr.frame.diagrams[elIdx].stations[i];
        N += factor * s.N;
        V += factor * s.V;
        M += factor * s.M;
      }
      return { x: st.x, N, V, M };
    });
    let maxM = 0;
    let maxV = 0;
    let maxN = 0;
    for (const s of stations) {
      maxM = Math.max(maxM, Math.abs(s.M));
      maxV = Math.max(maxV, Math.abs(s.V));
      maxN = Math.max(maxN, Math.abs(s.N));
    }
    return {
      element: elIdx,
      role: model.elements[elIdx].role ?? "",
      length: d.length,
      stations,
      maxM,
      maxV,
      maxN,
    };
  });
}

/** Роли элементов, отображаемые на эпюрах (вспомогательные жёсткие связи скрыты). */
export const DIAGRAM_ROLES = new Set([
  "rearPost",
  "rearPostEmbedded",
  "frontPost",
  "frontPostEmbedded",
  "beam",
  "brace",
]);

export const ROLE_TITLES: Record<string, string> = {
  rearPost: "Стойка задняя",
  rearPostEmbedded: "Стойка задняя (в грунте)",
  frontPost: "Стойка передняя",
  frontPostEmbedded: "Стойка передняя (в грунте)",
  beam: "Балка",
  brace: "Подпорка",
};
