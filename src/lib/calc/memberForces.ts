import { ElementRole, GeometryInput, ProfileAssignment } from "./types";
import { GeometryModel } from "./geometry";
import { SnowLoadResult } from "./snowLoad";
import { WindLoadResult } from "./windLoad";
import { SelfWeightResult } from "./selfWeight";
import { resolveSection } from "./profileResolve";

const G_ACC = 9.80665 / 1000; // кН на 1 кг

export interface Forces {
  N: number; // кН, продольная (+ сжатие)
  M: number; // кН·м, изгибающий момент
  V: number; // кН, поперечная сила
}

export interface ElementForces {
  id: string;
  role: ElementRole;
  label: string;
  lengthM: number;
  G: Forces;
  S: Forces;
  W: Forces;
}

function zero(): Forces {
  return { N: 0, M: 0, V: 0 };
}

/**
 * Упрощенный статический расчет усилий по методу грузовых площадей (tributary area).
 * Для балок/прогонов принята схема однопролетной балки на двух опорах, для стоек — схема
 * консоли, защемленной в основании. Метод пригоден для предварительного подбора сечений;
 * для окончательного проекта рекомендуется поверочный расчет по МКЭ (метод конечных элементов).
 */
export function calcMemberForces(
  g: GeometryInput,
  geom: GeometryModel,
  assignments: Record<ElementRole, ProfileAssignment>,
  selfWeight: SelfWeightResult,
  snow: SnowLoadResult,
  wind: WindLoadResult
): ElementForces[] {
  const frameSpacingM = geom.frameXPositions.length > 1 ? (geom.frameXPositions[1] - geom.frameXPositions[0]) / 1000 : g.totalLength / 1000;
  const numFrames = geom.frameXPositions.length;
  const frontLm = g.frontPostHeight / 1000;
  const rearLm = g.rearPostHeight / 1000;

  const purlinSection = resolveSection(assignments.purlin);
  const beamSection = resolveSection(assignments.beam);

  // --- Прогон (типовой, наиболее нагруженный) ---
  const purlinSpanM = g.purlinLength > 0 ? g.purlinLength / 1000 : frameSpacingM;
  const gPurlinSelf = purlinSection.mass * G_ACC; // кН/м, собственный вес
  const gPanelPerPurlin = geom.counts.purlin.totalLength > 0
    ? (selfWeight.panelsTotal * G_ACC) / (geom.counts.purlin.totalLength / 1000)
    : 0;
  const gPurlin = gPurlinSelf + gPanelPerPurlin;
  const sPurlin = snow.purlinLineLoad;
  const wPurlin = (wind.worst.suction + wind.worst.pressure) * (g.totalWidth / 1000 / Math.max(1, g.panelRowCount + 1));

  const purlin: ElementForces = {
    id: "purlin-typ",
    role: "purlin",
    label: "Прогон (типовой пролет)",
    lengthM: purlinSpanM,
    G: { N: 0, M: (gPurlin * purlinSpanM ** 2) / 8, V: (gPurlin * purlinSpanM) / 2 },
    S: { N: 0, M: (sPurlin * purlinSpanM ** 2) / 8, V: (sPurlin * purlinSpanM) / 2 },
    W: { N: 0, M: (wPurlin * purlinSpanM ** 2) / 8, V: (wPurlin * purlinSpanM) / 2 },
  };

  // --- Балка (несущая, между стойками) ---
  const beamSpanM = g.beamLength > 0 ? g.beamLength / 1000 : frameSpacingM;
  const gBeamSelf = beamSection.mass * G_ACC;
  const tributaryPerBeam = numFrames > 0 ? (selfWeight.steelTotal - selfWeight.steelByRole.beam - selfWeight.steelByRole.post + selfWeight.panelsTotal) * G_ACC / numFrames : 0;
  const gBeam = gBeamSelf + (beamSpanM > 0 ? tributaryPerBeam / beamSpanM : 0);
  const sBeam = snow.beamLineLoad;
  const wBeam = (wind.worst.suction + wind.worst.pressure) * frameSpacingM;

  const beam: ElementForces = {
    id: "beam-typ",
    role: "beam",
    label: "Балка рамы (типовая)",
    lengthM: beamSpanM,
    G: { N: 0, M: (gBeam * beamSpanM ** 2) / 8, V: (gBeam * beamSpanM) / 2 },
    S: { N: 0, M: (sBeam * beamSpanM ** 2) / 8, V: (sBeam * beamSpanM) / 2 },
    W: { N: 0, M: (wBeam * beamSpanM ** 2) / 8, V: (wBeam * beamSpanM) / 2 },
  };

  // --- Стойки (передняя/задняя), консоль от основания ---
  const totalG_kN = selfWeight.grandTotalKN;
  const gPerPostAxial = totalG_kN / (numFrames * 2);
  const windHPerFrame = wind.worst.horizontalForce / Math.max(1, numFrames);
  const windVPerFrame = wind.worst.verticalForce / Math.max(1, numFrames);

  const postFront: ElementForces = {
    id: "post-front-typ",
    role: "post",
    label: "Стойка передняя (типовая)",
    lengthM: frontLm,
    G: { N: gPerPostAxial, M: 0, V: 0 },
    S: { N: snow.postForce, M: 0, V: 0 },
    W: { N: windVPerFrame / 2, M: (windHPerFrame / 2) * frontLm, V: windHPerFrame / 2 },
  };
  const postRear: ElementForces = {
    id: "post-rear-typ",
    role: "post",
    label: "Стойка задняя (типовая)",
    lengthM: rearLm,
    G: { N: gPerPostAxial, M: 0, V: 0 },
    S: { N: snow.postForce, M: 0, V: 0 },
    W: { N: windVPerFrame / 2, M: (windHPerFrame / 2) * rearLm, V: windHPerFrame / 2 },
  };

  // --- Подкос (осевое усилие от доли поперечной силы) ---
  const braceCount = Math.max(1, geom.counts.brace.count);
  const braceLenM = g.braceLength / 1000;
  const braceForceW = wind.worst.horizontalForce / braceCount;
  const brace: ElementForces = {
    id: "brace-typ",
    role: "brace",
    label: "Подкос (типовой)",
    lengthM: braceLenM,
    G: zero(),
    S: zero(),
    W: { N: braceForceW, M: 0, V: 0 },
  };

  // --- Диагональная связь (осевое усилие от ветра вдоль торца) ---
  const diagCount = Math.max(1, geom.counts.diagonal.count);
  const diagLenM = g.diagonalLength / 1000;
  const windSideForce = wind.directions.find((d) => d.direction === "90")?.horizontalForce ?? 0;
  const diagonal: ElementForces = {
    id: "diagonal-typ",
    role: "diagonal",
    label: "Диагональная связь (типовая)",
    lengthM: diagLenM,
    G: zero(),
    S: zero(),
    W: { N: windSideForce / diagCount, M: 0, V: 0 },
  };

  return [postFront, postRear, beam, purlin, brace, diagonal];
}
