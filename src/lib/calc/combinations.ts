import { Forces, ElementForces } from "./memberForces";

export type ComboKey = "G" | "G_S" | "G_W" | "G_S_W" | "ULS" | "SLS";

export const COMBO_LABELS: Record<ComboKey, string> = {
  G: "G (только постоянная)",
  G_S: "G + S (постоянная + снег)",
  G_W: "G + W (постоянная + ветер)",
  G_S_W: "G + S + W (постоянная + снег + ветер)",
  ULS: "ULS — предельное состояние по несущей способности (огибающая)",
  SLS: "SLS — предельное состояние по пригодности к эксплуатации",
};

const GAMMA_G = 1.1; // коэффициент надежности по постоянной нагрузке
const GAMMA_F_BACKOUT = 1.4; // для получения характеристических значений S,W из расчетных
const PSI = 0.9; // коэффициент сочетания при двух и более переменных нагрузках

function scale(f: Forces, k: number): Forces {
  return { N: f.N * k, M: f.M * k, V: f.V * k };
}
function add(a: Forces, b: Forces): Forces {
  return { N: a.N + b.N, M: a.M + b.M, V: a.V + b.V };
}
function absMax(a: Forces, b: Forces): Forces {
  return {
    N: Math.abs(a.N) > Math.abs(b.N) ? a.N : b.N,
    M: Math.abs(a.M) > Math.abs(b.M) ? a.M : b.M,
    V: Math.abs(a.V) > Math.abs(b.V) ? a.V : b.V,
  };
}

export interface ElementCombos {
  id: string;
  label: string;
  combos: Record<ComboKey, Forces>;
  governing: ComboKey;
}

export function calcCombinations(elements: ElementForces[]): ElementCombos[] {
  return elements.map((el) => {
    const G = scale(el.G, GAMMA_G);
    const G_S = add(G, el.S);
    const G_W = add(G, el.W);
    const G_S_W = add(G, scale(add(el.S, el.W), PSI));
    const ULS = [G, G_S, G_W, G_S_W].reduce((a, b) => absMax(a, b));
    const SLS = add(el.G, add(scale(el.S, 1 / GAMMA_F_BACKOUT), scale(el.W, (1 / GAMMA_F_BACKOUT) * PSI)));

    const combos: Record<ComboKey, Forces> = { G, G_S, G_W, G_S_W, ULS, SLS };
    let governing: ComboKey = "G";
    let max = 0;
    (Object.keys(combos) as ComboKey[]).forEach((k) => {
      if (k === "SLS") return;
      const magnitude = Math.abs(combos[k].N) + Math.abs(combos[k].M) * 2;
      if (magnitude > max) {
        max = magnitude;
        governing = k;
      }
    });

    return { id: el.id, label: el.label, combos, governing };
  });
}
