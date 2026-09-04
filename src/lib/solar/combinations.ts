// Сочетания нагрузок по СП РК EN 1990 (для российской ветки — по СП 20.13330).
//
//   6.10a:  Σ γG·Gk + γQ,1·ψ0,1·Qk,1 + Σ γQ,i·ψ0,i·Qk,i
//   6.10b:  Σ ξ·γG·Gk + γQ,1·Qk,1 + Σ γQ,i·ψ0,i·Qk,i
//   На подъём (отрыв): γG,fav·Gk + γQ·Wk,отрыв   — определяющее для заглубления и анкеровки
//   SLS (характеристическое): Gk + Qk,1 + Σ ψ0,i·Qk,i
//
// Система линейно упругая, поэтому усилия от сочетания получаются линейным
// суммированием усилий от элементарных загружений.

import { DesignInput } from "./types";
import { ElementaryCase } from "./analysis";

export type ComboType = "ULS" | "ULS_uplift" | "SLS" | "ULS_montage";

export interface ComboTerm {
  caseKey: string;
  factor: number;
}

export interface Combination {
  key: string;
  label: string;
  type: ComboType;
  ref: string;
  /** Ведущее переменное воздействие */
  leading: string;
  terms: ComboTerm[];
}

export interface ComboBuildInput {
  design: DesignInput;
  cases: ElementaryCase[];
}

export function buildCombinations({ design, cases }: ComboBuildInput): Combination[] {
  const { gammaG, gammaGfav, gammaQ, xi, psi0Snow, psi0Wind } = design;
  const dead = cases.filter((c) => c.kind === "dead").map((c) => c.key);
  const snow = cases.filter((c) => c.kind === "snow");
  const wind = cases.filter((c) => c.kind === "wind");
  const montage = cases.filter((c) => c.kind === "montage");
  const combos: Combination[] = [];

  const deadTerms = (factor: number): ComboTerm[] => dead.map((k) => ({ caseKey: k, factor }));

  // ---- ULS: снег и ветер (прижимающие схемы) ----
  const windDown = wind.filter((w) => !w.key.startsWith("W2") && !w.key.startsWith("W3"));
  const windUp = wind.filter((w) => w.key.startsWith("W2"));
  const windAlong = wind.filter((w) => w.key.startsWith("W3"));

  for (const s of snow) {
    // Только снег
    combos.push({
      key: `6.10b/${s.key}`,
      label: `6.10b · G + ${s.label} (ведущий — снег)`,
      type: "ULS",
      ref: "EN 1990, выр. 6.10b",
      leading: s.key,
      terms: [...deadTerms(xi * gammaG), { caseKey: s.key, factor: gammaQ }],
    });
    combos.push({
      key: `6.10a/${s.key}`,
      label: `6.10a · G + ψ₀·${s.label}`,
      type: "ULS",
      ref: "EN 1990, выр. 6.10a",
      leading: "G",
      terms: [...deadTerms(gammaG), { caseKey: s.key, factor: gammaQ * psi0Snow }],
    });

    for (const w of [...windDown, ...windUp, ...windAlong]) {
      // Ведущий — снег
      combos.push({
        key: `6.10b/${s.key}+${w.key}`,
        label: `6.10b · G + ${s.label} + ψ₀·${w.label}`,
        type: "ULS",
        ref: "EN 1990, выр. 6.10b (ведущее воздействие — снег)",
        leading: s.key,
        terms: [
          ...deadTerms(xi * gammaG),
          { caseKey: s.key, factor: gammaQ },
          { caseKey: w.key, factor: gammaQ * psi0Wind },
        ],
      });
      // Ведущий — ветер
      combos.push({
        key: `6.10b/${w.key}+${s.key}`,
        label: `6.10b · G + ${w.label} + ψ₀·${s.label}`,
        type: "ULS",
        ref: "EN 1990, выр. 6.10b (ведущее воздействие — ветер)",
        leading: w.key,
        terms: [
          ...deadTerms(xi * gammaG),
          { caseKey: w.key, factor: gammaQ },
          { caseKey: s.key, factor: gammaQ * psi0Snow },
        ],
      });
    }
  }

  // Только ветер (без снега)
  for (const w of wind) {
    combos.push({
      key: `6.10b/${w.key}`,
      label: `6.10b · G + ${w.label} (ведущий — ветер)`,
      type: "ULS",
      ref: "EN 1990, выр. 6.10b",
      leading: w.key,
      terms: [...deadTerms(xi * gammaG), { caseKey: w.key, factor: gammaQ }],
    });
  }

  // ---- Обязательное сочетание на подъём (отрыв) ----
  for (const w of windUp) {
    combos.push({
      key: `UPLIFT/${w.key}`,
      label: `Подъём · ${gammaGfav}·G + ${gammaQ}·${w.label}`,
      type: "ULS_uplift",
      ref: "EN 1990, выр. 6.10 при благоприятном действии постоянной нагрузки (γG,inf)",
      leading: w.key,
      terms: [...deadTerms(gammaGfav), { caseKey: w.key, factor: gammaQ }],
    });
  }

  // ---- Монтажная нагрузка ----
  for (const m of montage) {
    combos.push({
      key: `MONT/${m.key}`,
      label: `Монтаж · ${gammaG}·G + ${gammaQ}·${m.label}`,
      type: "ULS_montage",
      ref: "EN 1990 (монтажные и эксплуатационные воздействия, разд. 6.4.3.2)",
      leading: m.key,
      terms: [...deadTerms(gammaG), { caseKey: m.key, factor: gammaQ }],
    });
  }

  // ---- SLS (характеристическое сочетание, для прогибов) ----
  for (const s of snow) {
    combos.push({
      key: `SLS/${s.key}`,
      label: `SLS · G + ${s.label}`,
      type: "SLS",
      ref: "EN 1990, выр. 6.14b (характеристическое сочетание)",
      leading: s.key,
      terms: [...deadTerms(1), { caseKey: s.key, factor: 1 }],
    });
  }
  for (const w of wind) {
    combos.push({
      key: `SLS/${w.key}`,
      label: `SLS · G + ${w.label}`,
      type: "SLS",
      ref: "EN 1990, выр. 6.14b (характеристическое сочетание)",
      leading: w.key,
      terms: [...deadTerms(1), { caseKey: w.key, factor: 1 }],
    });
  }
  if (snow.length > 0 && wind.length > 0) {
    combos.push({
      key: `SLS/${snow[0].key}+${wind[0].key}`,
      label: `SLS · G + ${snow[0].label} + ψ₀·${wind[0].label}`,
      type: "SLS",
      ref: "EN 1990, выр. 6.14b",
      leading: snow[0].key,
      terms: [
        ...deadTerms(1),
        { caseKey: snow[0].key, factor: 1 },
        { caseKey: wind[0].key, factor: psi0Wind },
      ],
    });
  }

  return combos;
}
