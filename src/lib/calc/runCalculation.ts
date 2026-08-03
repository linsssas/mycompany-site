import { GeometryInput, PanelInput, ProfileAssignment, LocationInput, ProjectSettings, ElementRole, ClimateData, PanelDerived } from "./types";
import { buildGeometry, GeometryModel } from "./geometry";
import { derivePanelValues, buildPanelQuads, PanelQuad } from "./panels";
import { CITY_DATABASE, climateFromCityRef, nearestCity } from "./region";
import { calcSnowLoad, SnowLoadResult } from "./snowLoad";
import { calcWindLoad, WindLoadResult } from "./windLoad";
import { calcSelfWeight, SelfWeightResult } from "./selfWeight";
import { calcMemberForces, ElementForces } from "./memberForces";
import { calcCombinations, ElementCombos } from "./combinations";
import { checkAllElements, CheckedElement } from "./memberChecks";
import { calcAnchorCheck, AnchorCheckResult, BOLT_GRADES } from "./anchors";
import { designFoundation, FoundationResult } from "./foundation";
import { FoundationSoilInput, AnchorSettingsInput } from "./defaults";
import { resolveSection } from "./profileResolve";

export interface CalculationInputs {
  geometry: GeometryInput;
  panel: PanelInput;
  profiles: Record<ElementRole, ProfileAssignment>;
  location: LocationInput;
  climateOverride?: ClimateData;
  settings: ProjectSettings;
  foundationSoil: FoundationSoilInput;
  anchorSettings: AnchorSettingsInput;
}

export interface CalculationResults {
  climate: ClimateData;
  geom: GeometryModel;
  panelsDerived: PanelDerived;
  panelQuads: PanelQuad[];
  snow: SnowLoadResult;
  wind: WindLoadResult;
  selfWeight: SelfWeightResult;
  elementForces: ElementForces[];
  combos: ElementCombos[];
  checkedElements: CheckedElement[];
  anchorFront: AnchorCheckResult;
  anchorRear: AnchorCheckResult;
  foundationFront: FoundationResult;
  foundationRear: FoundationResult;
  maxUtilization: number;
  overallColor: "green" | "yellow" | "red";
}

export function resolveClimate(location: LocationInput, override?: ClimateData): ClimateData {
  if (override) return override;
  if (location.useGps && location.lat !== undefined && location.lon !== undefined) {
    return climateFromCityRef(nearestCity(location.lat, location.lon));
  }
  const ref = CITY_DATABASE.find((c) => c.country === location.country && c.region === location.region && c.city === location.city);
  if (ref) return climateFromCityRef(ref);
  return climateFromCityRef(CITY_DATABASE[0]);
}

export function runCalculation(inputs: CalculationInputs): CalculationResults {
  const climate = resolveClimate(inputs.location, inputs.climateOverride);
  const geom = buildGeometry(inputs.geometry);
  const panelsDerived = derivePanelValues(inputs.geometry, inputs.panel);
  const panelQuads = buildPanelQuads(inputs.geometry, inputs.panel);

  const snow = calcSnowLoad(inputs.geometry, geom, climate, inputs.settings.norm);
  const wind = calcWindLoad(inputs.geometry, panelsDerived, climate, inputs.settings.norm);
  const selfWeight = calcSelfWeight(geom, inputs.profiles, panelsDerived);
  const elementForces = calcMemberForces(inputs.geometry, geom, inputs.profiles, selfWeight, snow, wind);
  const combos = calcCombinations(elementForces);
  const checkedElements = checkAllElements(elementForces, combos, inputs.profiles);

  const postFront = combos.find((c) => c.id === "post-front-typ")!;
  const postRear = combos.find((c) => c.id === "post-rear-typ")!;
  const postSection = resolveSection(inputs.profiles.post);
  const basePlateWidthM = (Math.max(postSection.h, postSection.b) * 3) / 1000;
  const boltGrade = BOLT_GRADES.find((b) => b.key === inputs.anchorSettings.boltGradeKey) ?? BOLT_GRADES[2];

  const anchorFront = calcAnchorCheck(
    postFront.combos.ULS.N,
    postFront.combos.ULS.M,
    postFront.combos.ULS.V,
    basePlateWidthM,
    boltGrade,
    inputs.anchorSettings.boltCount
  );
  const anchorRear = calcAnchorCheck(
    postRear.combos.ULS.N,
    postRear.combos.ULS.M,
    postRear.combos.ULS.V,
    basePlateWidthM,
    boltGrade,
    inputs.anchorSettings.boltCount
  );

  const foundationFront = designFoundation({
    N: postFront.combos.ULS.N,
    M: postFront.combos.ULS.M,
    V: postFront.combos.ULS.V,
    soilBearingCapacity: inputs.foundationSoil.soilBearingCapacity,
    frictionCoefficient: inputs.foundationSoil.frictionCoefficient,
    frostDepthM: inputs.foundationSoil.frostDepthM,
    foundationType: inputs.settings.foundationType,
  });
  const foundationRear = designFoundation({
    N: postRear.combos.ULS.N,
    M: postRear.combos.ULS.M,
    V: postRear.combos.ULS.V,
    soilBearingCapacity: inputs.foundationSoil.soilBearingCapacity,
    frictionCoefficient: inputs.foundationSoil.frictionCoefficient,
    frostDepthM: inputs.foundationSoil.frostDepthM,
    foundationType: inputs.settings.foundationType,
  });

  const maxUtilization = Math.max(...checkedElements.map((c) => c.overallUtilization), anchorFront.combinedUtilization, anchorRear.combinedUtilization);
  const overallColor = maxUtilization < 0.7 ? "green" : maxUtilization <= 0.9 ? "yellow" : "red";

  return {
    climate,
    geom,
    panelsDerived,
    panelQuads,
    snow,
    wind,
    selfWeight,
    elementForces,
    combos,
    checkedElements,
    anchorFront,
    anchorRear,
    foundationFront,
    foundationRear,
    maxUtilization,
    overallColor,
  };
}
