import { ElementRole, ProfileAssignment, PanelDerived } from "./types";
import { GeometryModel } from "./geometry";
import { resolveSection } from "./profileResolve";

export interface SelfWeightResult {
  steelByRole: Record<ElementRole, number>; // кг
  steelTotal: number; // кг
  panelsTotal: number; // кг
  fastenersTotal: number; // кг
  grandTotal: number; // кг
  grandTotalKN: number; // кН
}

const FASTENER_FACTOR = 0.04; // доля массы крепежа от массы металлоконструкций (справочно)

export function calcSelfWeight(
  geom: GeometryModel,
  assignments: Record<ElementRole, ProfileAssignment>,
  panels: PanelDerived
): SelfWeightResult {
  const roles: ElementRole[] = ["post", "beam", "purlin", "brace", "diagonal"];
  const steelByRole = {} as Record<ElementRole, number>;

  for (const role of roles) {
    const section = resolveSection(assignments[role]);
    const totalLengthM = geom.counts[role].totalLength / 1000;
    steelByRole[role] = section.mass * totalLengthM; // кг
  }

  const steelTotal = roles.reduce((s, r) => s + steelByRole[r], 0);
  const fastenersTotal = steelTotal * FASTENER_FACTOR;
  const panelsTotal = panels.totalWeightKg;
  const grandTotal = steelTotal + fastenersTotal + panelsTotal;

  return {
    steelByRole,
    steelTotal,
    panelsTotal,
    fastenersTotal,
    grandTotal,
    grandTotalKN: (grandTotal * 9.80665) / 1000,
  };
}
