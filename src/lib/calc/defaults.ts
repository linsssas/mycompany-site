import { GeometryInput, PanelInput, ProfileAssignment, LocationInput, ProjectSettings, ElementRole } from "./types";
import { DEFAULT_PROFILE_BY_ROLE } from "./profiles";

export function defaultGeometry(): GeometryInput {
  return {
    totalLength: 6000,
    totalWidth: 3000,
    totalHeight: 2000,
    frontPostHeight: 1200,
    rearPostHeight: 2000,
    tiltAngle: 14.9,
    spanCount: 3,
    spanLength: 2000,
    postPitch: 2000,
    postCount: 8,
    beamLength: 3105,
    purlinLength: 2000,
    braceLength: 1700,
    diagonalLength: 2330,
    overhang: 300,
    panelRowCount: 2,
    panelsPerRow: 12,
  };
}

export function defaultPanel(): PanelInput {
  return {
    length: 2278,
    width: 1134,
    thickness: 35,
    weight: 27.5,
    area: 0,
    count: 0,
    gap: 20,
    orientation: "landscape",
  };
}

export function defaultProfiles(): Record<ElementRole, ProfileAssignment> {
  const roles: ElementRole[] = ["post", "beam", "purlin", "brace", "diagonal"];
  const result = {} as Record<ElementRole, ProfileAssignment>;
  for (const role of roles) {
    result[role] = {
      role,
      sectionKey: DEFAULT_PROFILE_BY_ROLE[role],
      materialKey: "C255",
    };
  }
  return result;
}

export function defaultLocation(): LocationInput {
  return {
    country: "Казахстан",
    region: "г. Алматы",
    city: "Алматы",
    useGps: false,
  };
}

export function defaultSettings(): ProjectSettings {
  return {
    norm: "SP_RK",
    safetyFactor: 1.0,
    serviceLife: 25,
    responsibilityCategory: "II",
    foundationType: "concrete_block",
  };
}

export interface FoundationSoilInput {
  soilBearingCapacity: number;
  frictionCoefficient: number;
  frostDepthM: number;
}

export function defaultFoundationSoil(): FoundationSoilInput {
  return { soilBearingCapacity: 150, frictionCoefficient: 0.35, frostDepthM: 1.2 };
}

export interface AnchorSettingsInput {
  boltGradeKey: string;
  boltCount: number;
}

export function defaultAnchorSettings(): AnchorSettingsInput {
  return { boltGradeKey: "8.8", boltCount: 4 };
}
