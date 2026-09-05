"use client";

import { create } from "zustand";
import {
  BoltJointInput,
  ClimateInput,
  DesignInput,
  GeometryInput,
  GroundInput,
  JointKey,
  MaterialInput,
  MemberRole,
  PanelInput,
  ProjectMeta,
  SectionDef,
  SelfWeightInput,
  SolarProject,
} from "@/lib/solar/types";
import { runSolarCalculation, SolarResults, SolarCharts } from "@/lib/solar/run";
import { PRESETS, proflandPreset, region, soil } from "@/lib/solar/presets";

const RECALC_DEBOUNCE_MS = 200;

export type ThemeMode = "light" | "dark";

interface SolarState {
  project: SolarProject;
  results: SolarResults;
  /** Графики-развёртки считаются по требованию: они в ~20 раз дороже основного расчёта */
  charts: SolarCharts | null;
  chartsPending: boolean;
  /** Режим сравнения двух вариантов */
  compareProject: SolarProject | null;
  compareResults: SolarResults | null;
  theme: ThemeMode;
  /** Идёт пересчёт (для индикатора) */
  computing: boolean;
  lastComputeMs: number;

  setMeta: (patch: Partial<ProjectMeta>) => void;
  setGeometry: (patch: Partial<GeometryInput>) => void;
  setMaterial: (patch: Partial<MaterialInput>) => void;
  setPanel: (patch: Partial<PanelInput>) => void;
  setSelfWeight: (patch: Partial<SelfWeightInput>) => void;
  setGround: (patch: Partial<GroundInput>) => void;
  setClimate: (patch: Partial<ClimateInput>) => void;
  setDesign: (patch: Partial<DesignInput>) => void;
  setEconomics: (patch: Partial<SolarProject["economics"]>) => void;
  setSection: (role: MemberRole, def: SectionDef) => void;
  setJoint: (key: JointKey, patch: Partial<BoltJointInput>) => void;
  setBolts: (patch: Partial<SolarProject["bolts"]>) => void;
  setSoilPreset: (soilKey: string) => void;
  setRegionPreset: (regionKey: string) => void;

  loadPreset: (key: string) => void;
  importJson: (json: string) => void;
  exportJson: () => string;
  reset: () => void;

  requestCharts: () => void;
  enableCompare: (enabled: boolean) => void;
  updateCompare: (patch: Partial<SolarProject>) => void;
  setTheme: (theme: ThemeMode) => void;
}

function calc(project: SolarProject): SolarResults {
  return runSolarCalculation(project, { sweeps: false });
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useSolarStore = create<SolarState>((set, get) => {
  const initial = proflandPreset();

  /** Обновление проекта с отложенным пересчётом (без кнопки «Рассчитать»). */
  const patchProject = (mutate: (p: SolarProject) => SolarProject) => {
    const project = mutate(get().project);
    set({ project, computing: true, charts: null });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const t0 = performance.now();
      try {
        const results = calc(get().project);
        set({ results, computing: false, lastComputeMs: performance.now() - t0 });
      } catch (e) {
        console.error("Ошибка расчёта", e);
        set({ computing: false });
      }
    }, RECALC_DEBOUNCE_MS);
  };

  const section =
    <K extends keyof SolarProject>(key: K) =>
    (patch: Partial<SolarProject[K]>) =>
      patchProject((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  return {
    project: initial,
    results: calc(initial),
    charts: null,
    chartsPending: false,
    compareProject: null,
    compareResults: null,
    theme: "light",
    computing: false,
    lastComputeMs: 0,

    setMeta: section("meta"),
    setGeometry: section("geometry"),
    setMaterial: section("material"),
    setPanel: section("panel"),
    setSelfWeight: section("selfWeight"),
    setGround: section("ground"),
    setClimate: section("climate"),
    setDesign: section("design"),
    setEconomics: section("economics"),

    setSection: (role, def) => patchProject((p) => ({ ...p, sections: { ...p.sections, [role]: def } })),

    setJoint: (key, patch) =>
      patchProject((p) => ({
        ...p,
        bolts: { ...p.bolts, joints: p.bolts.joints.map((j) => (j.key === key ? { ...j, ...patch } : j)) },
      })),

    setBolts: (patch) => patchProject((p) => ({ ...p, bolts: { ...p.bolts, ...patch } })),

    setSoilPreset: (soilKey) => {
      const s = soil(soilKey);
      patchProject((p) => ({
        ...p,
        ground: { ...p.ground, soilKey, phi: s.phi, c: s.c, gamma: s.gamma, R: s.R, nh: s.nh, ks: s.ks },
      }));
    },

    setRegionPreset: (regionKey) => {
      const r = region(regionKey);
      patchProject((p) => ({
        ...p,
        climate: { ...p.climate, regionKey, skManual: null, vbManual: null, altitude: r.altitude },
        ground: { ...p.ground, frostDepthM: r.frostDepth },
      }));
    },

    loadPreset: (key) => {
      const preset = PRESETS.find((x) => x.key === key);
      if (!preset) return;
      const project = preset.build();
      set({ project, results: calc(project), charts: null });
    },

    importJson: (json) => {
      const data = JSON.parse(json) as SolarProject;
      // Недостающие поля берутся из пресета — совместимость со старыми файлами
      const base = proflandPreset();
      const project: SolarProject = {
        meta: { ...base.meta, ...data.meta },
        geometry: { ...base.geometry, ...data.geometry },
        sections: { ...base.sections, ...data.sections },
        material: { ...base.material, ...data.material },
        panel: { ...base.panel, ...data.panel },
        selfWeight: { ...base.selfWeight, ...data.selfWeight },
        ground: { ...base.ground, ...data.ground },
        bolts: { ...base.bolts, ...data.bolts },
        climate: { ...base.climate, ...data.climate },
        design: { ...base.design, ...data.design },
        economics: { ...base.economics, ...data.economics },
      };
      set({ project, results: calc(project), charts: null });
    },

    exportJson: () => JSON.stringify(get().project, null, 2),

    reset: () => {
      const project = proflandPreset();
      set({ project, results: calc(project), charts: null, compareProject: null, compareResults: null });
    },

    requestCharts: () => {
      if (get().charts || get().chartsPending) return;
      set({ chartsPending: true });
      // Уступаем кадр, чтобы успел отрисоваться индикатор загрузки
      setTimeout(() => {
        try {
          const full = runSolarCalculation(get().project, { sweeps: true });
          set({ charts: full.charts, results: full, chartsPending: false });
        } catch (e) {
          console.error("Ошибка построения графиков", e);
          set({ chartsPending: false });
        }
      }, 30);
    },

    enableCompare: (enabled) => {
      if (!enabled) {
        set({ compareProject: null, compareResults: null });
        return;
      }
      const compareProject = structuredClone(get().project);
      set({ compareProject, compareResults: calc(compareProject) });
    },

    updateCompare: (patch) => {
      const current = get().compareProject;
      if (!current) return;
      const compareProject = { ...current, ...patch };
      set({ compareProject, compareResults: calc(compareProject) });
    },

    setTheme: (theme) => {
      set({ theme });
      if (typeof window !== "undefined") localStorage.setItem("solar-theme", theme);
    },
  };
});
