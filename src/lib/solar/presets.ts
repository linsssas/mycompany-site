// Пресеты проектов и библиотека сечений.

import libraryData from "@/data/solar/sections_library.json";
import regionsData from "@/data/solar/regions_kz.json";
import soilsData from "@/data/solar/soils.json";
import {
  BoltJointInput,
  Coating,
  MemberRole,
  SectionDef,
  SectionShape,
  SolarProject,
} from "./types";

export interface RegionRef {
  key: string;
  city: string;
  region: string;
  sk: number;
  vb: number;
  w0: number;
  altitude: number;
  frostDepth: number;
  snowDistrict: string;
  windDistrict: string;
}

export interface SoilRef {
  key: string;
  name: string;
  type: string;
  phi: number;
  c: number;
  gamma: number;
  R: number;
  nh: number;
  ks: number;
}

export const REGIONS: RegionRef[] = regionsData.regions;
export const SOILS: SoilRef[] = soilsData.soils;
export const ALTITUDE_FACTOR_PER_100M = regionsData.altitudeFactorPer100m;

export function loadSectionLibrary(): SectionDef[] {
  return libraryData.sections.map((s) => ({
    key: s.key,
    name: s.name,
    shape: s.shape as SectionShape,
    h: s.h,
    b: s.b,
    c: s.c,
    t: s.t,
    rFactor: s.rFactor,
    webStiffenerDepth: (s as { webStiffenerDepth?: number }).webStiffenerDepth,
    coating: s.coating as Coating,
    comment: s.comment,
  }));
}

export function findSection(key: string): SectionDef {
  const lib = loadSectionLibrary();
  return lib.find((s) => s.key === key) ?? lib[0];
}

export function region(key: string): RegionRef {
  return REGIONS.find((r) => r.key === key) ?? REGIONS[0];
}

export function soil(key: string): SoilRef {
  return SOILS.find((s) => s.key === key) ?? SOILS[1];
}

function defaultJoints(): BoltJointInput[] {
  return [
    { key: "panel_purlin", d: 8, grade: "8.8", n: 2, t1: 2.0, t2: 2.0, e1: 20, e2: 20, p1: 40, threadInShear: true },
    { key: "purlin_beam", d: 10, grade: "8.8", n: 2, t1: 2.0, t2: 2.0, e1: 25, e2: 20, p1: 40, threadInShear: true },
    { key: "beam_post", d: 12, grade: "8.8", n: 2, t1: 2.0, t2: 2.0, e1: 30, e2: 25, p1: 50, threadInShear: true },
    { key: "brace_beam", d: 12, grade: "8.8", n: 2, t1: 1.5, t2: 2.0, e1: 30, e2: 25, p1: 50, threadInShear: true },
    { key: "brace_plate", d: 12, grade: "8.8", n: 2, t1: 1.5, t2: 4.0, e1: 30, e2: 25, p1: 50, threadInShear: true },
    { key: "purlin_splice", d: 10, grade: "8.8", n: 4, t1: 2.0, t2: 2.0, e1: 25, e2: 20, p1: 45, threadInShear: true },
    { key: "wind_brace", d: 10, grade: "8.8", n: 2, t1: 1.5, t2: 2.0, e1: 25, e2: 20, p1: 40, threadInShear: true },
  ];
}

/** Пресет по чертежу «Опора солнечных панелей 33°, 15 стоек, усиленный стол» (Profland). */
export function proflandPreset(): SolarProject {
  const astana = region("astana");
  const loamSoil = soil("loam");
  const sections: Record<MemberRole, SectionDef> = {
    rearPost: findSection("ps_100x50x12_2"),
    frontPost: findSection("ps_120x60x13_2"),
    beam: findSection("ps_110x30x10_2"),
    brace: findSection("pp_76x36x10_15"),
    purlin: findSection("psu_41x61_2"),
    windBrace: findSection("pp_59x35x10_15"),
  };

  return {
    meta: {
      name: "Опора солнечных панелей 33°, 15 стоек, усиленный стол",
      author: "",
      object: "Наземная СЭС",
      presetKey: "profland33",
    },
    geometry: {
      tiltDeg: 33,
      frameCount: 15,
      framePitch: 2100,
      edgeOverhang: 385,
      panelRows: 2,
      panelOrientation: "portrait",
      panelGap: 20,
      postSpacing: 2630,
      rearTopHeight: 2800,
      frontTopHeight: 1100,
      linkMode: "angle",
      beamOverhang: 700,
      beamRearOverhang: 0,
      panelFieldMode: "centered",
      panelFieldOffset: 0,
      purlinLines: 4,
      purlinPositionsPct: [12.5, 37.5, 62.5, 87.5],
      braceEnabled: true,
      bracePostAttachHeight: 380,
      braceBeamPositionPct: 50,
      purlinSectionLength: 6040,
    },
    sections,
    material: {
      fy: 350, // S350GD
      fu: 420,
      E: 210000,
      G: 81000,
      nu: 0.3,
      rho: 7850,
      gammaC: 0.95,
      gammaM0: 1.0,
      gammaM1: 1.0,
      gammaM2: 1.25,
    },
    panel: {
      mass: 30,
      length: 2382,
      width: 1134,
      powerW: 580,
      countOverride: null,
    },
    selfWeight: {
      mode: "auto",
      manualMassKg: 1050,
      fastenerFactor: 1.05,
    },
    ground: {
      embedDepth: 1200,
      foundationType: "driven",
      concreteDia: 300,
      soilKey: loamSoil.key,
      phi: loamSoil.phi,
      c: loamSoil.c,
      gamma: loamSoil.gamma,
      R: loamSoil.R,
      nh: loamSoil.nh,
      ks: loamSoil.ks,
      frostDepthM: astana.frostDepth,
      supportModel: "elastic",
      upliftSafetyFactor: 1.5,
    },
    bolts: {
      joints: defaultJoints(),
      drawingCounts: [
        { d: 10, count: 132 },
        { d: 12, count: 135 },
      ],
      clampEndCount: 8,
      clampMidCount: 100,
      clampCapacityKN: 2.0,
    },
    climate: {
      norm: "SP_RK_EN",
      regionKey: "astana",
      skManual: null,
      vbManual: null,
      terrain: "II",
      altitude: astana.altitude,
      Ct: 1.0,
      Ce: 0.8,
      returnPeriodYears: 50,
      serviceLifeYears: 25,
      iceEnabled: false,
      iceThicknessMm: 5,
      deltaT: 40,
      blockage: "both",
      useAsce: false,
    },
    design: {
      bucklingFactors: {
        rearPost: 2.0,
        frontPost: 2.0,
        beam: 1.0,
        brace: 1.0,
        purlin: 1.0,
        windBrace: 1.0,
      },
      // Из плоскости рамы стойки раскреплены прогонами, панелями и ветровыми связями,
      // поэтому расчётная длина принимается равной геометрической.
      bucklingFactorsOut: {
        rearPost: 1.0,
        frontPost: 1.0,
        beam: 1.0,
        brace: 1.0,
        purlin: 1.0,
        windBrace: 1.0,
      },
      deflectionLimits: {
        purlin: 200,
        beam: 200,
        cantilever: 200,
        postDrift: 150,
        panelAbsMm: 20,
      },
      montageLoadKN: 1.0,
      edgeZoneFactor: 1.4,
      alongMinFraction: 0.05,
      structuralDepthMm: 300,
      gammaG: 1.35,
      gammaGfav: 0.9,
      gammaQ: 1.5,
      xi: 0.85,
      psi0Snow: 0.5,
      psi0Wind: 0.6,
      spliceAsHinge: true,
    },
    economics: {
      steelPricePerKg: 800,
      currency: "₸",
    },
  };
}

/** Облегчённый стол: меньше рам, тоньше профили. */
export function lightPreset(): SolarProject {
  const base = proflandPreset();
  return {
    ...base,
    meta: { ...base.meta, name: "Облегчённый стол 25°", presetKey: "light" },
    geometry: {
      ...base.geometry,
      tiltDeg: 25,
      frameCount: 9,
      postSpacing: 2400,
      rearTopHeight: 2300,
      frontTopHeight: 1180,
      linkMode: "angle",
      panelRows: 2,
      braceEnabled: false,
    },
    sections: {
      ...base.sections,
      rearPost: findSection("rhs_80x40_3"),
      frontPost: findSection("rhs_80x40_3"),
      beam: findSection("c_140x60x15_2"),
      brace: findSection("pp_76x36x10_15"),
      purlin: findSection("sigma_80x50_2"),
      windBrace: findSection("pp_59x35x10_15"),
    },
    ground: { ...base.ground, embedDepth: 1500, foundationType: "concreted" },
  };
}

/** Пустой проект — минимальная конфигурация для расчёта «с нуля». */
export function emptyPreset(): SolarProject {
  const base = proflandPreset();
  return {
    ...base,
    meta: { ...base.meta, name: "Новый проект", presetKey: "empty" },
    geometry: {
      ...base.geometry,
      frameCount: 2,
      panelRows: 1,
      braceEnabled: false,
      purlinLines: 2,
      purlinPositionsPct: [25, 75],
    },
  };
}

export const PRESETS: { key: string; label: string; build: () => SolarProject }[] = [
  { key: "profland33", label: "Profland 33°, 15 стоек, усиленный стол", build: proflandPreset },
  { key: "light", label: "Облегчённый стол 25°", build: lightPreset },
  { key: "empty", label: "Пустой проект", build: emptyPreset },
];
