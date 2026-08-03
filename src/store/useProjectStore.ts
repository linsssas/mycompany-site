import { create } from "zustand";
import { GeometryInput, PanelInput, ProfileAssignment, LocationInput, ProjectSettings, ElementRole, ClimateData } from "@/lib/calc/types";
import { defaultGeometry, defaultPanel, defaultProfiles, defaultLocation, defaultSettings, defaultFoundationSoil, defaultAnchorSettings, FoundationSoilInput, AnchorSettingsInput } from "@/lib/calc/defaults";
import { runCalculation, CalculationResults } from "@/lib/calc/runCalculation";

interface ProjectState {
  projectName: string;
  geometry: GeometryInput;
  panel: PanelInput;
  profiles: Record<ElementRole, ProfileAssignment>;
  location: LocationInput;
  climateOverride?: ClimateData;
  settings: ProjectSettings;
  foundationSoil: FoundationSoilInput;
  anchorSettings: AnchorSettingsInput;
  results: CalculationResults;

  setProjectName: (name: string) => void;
  setGeometry: (patch: Partial<GeometryInput>) => void;
  setPanel: (patch: Partial<PanelInput>) => void;
  setProfile: (role: ElementRole, patch: Partial<ProfileAssignment>) => void;
  setLocation: (patch: Partial<LocationInput>) => void;
  setClimateOverride: (climate?: ClimateData) => void;
  setSettings: (patch: Partial<ProjectSettings>) => void;
  setFoundationSoil: (patch: Partial<FoundationSoilInput>) => void;
  setAnchorSettings: (patch: Partial<AnchorSettingsInput>) => void;

  exportProjectJson: () => string;
  importProjectJson: (json: string) => void;
  resetProject: () => void;
}

function buildInitial() {
  const geometry = defaultGeometry();
  const panel = defaultPanel();
  const profiles = defaultProfiles();
  const location = defaultLocation();
  const settings = defaultSettings();
  const foundationSoil = defaultFoundationSoil();
  const anchorSettings = defaultAnchorSettings();
  const results = runCalculation({ geometry, panel, profiles, location, settings, foundationSoil, anchorSettings });
  return { geometry, panel, profiles, location, settings, foundationSoil, anchorSettings, results };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectName: "Проект СЭС №1",
  ...buildInitial(),

  setProjectName: (name) => set({ projectName: name }),

  setGeometry: (patch) => {
    const geometry = { ...get().geometry, ...patch };
    set({ geometry });
    recalc(set, get);
  },
  setPanel: (patch) => {
    const panel = { ...get().panel, ...patch };
    set({ panel });
    recalc(set, get);
  },
  setProfile: (role, patch) => {
    const profiles = { ...get().profiles, [role]: { ...get().profiles[role], ...patch } };
    set({ profiles });
    recalc(set, get);
  },
  setLocation: (patch) => {
    const location = { ...get().location, ...patch };
    set({ location, climateOverride: undefined });
    recalc(set, get);
  },
  setClimateOverride: (climate) => {
    set({ climateOverride: climate });
    recalc(set, get);
  },
  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    recalc(set, get);
  },
  setFoundationSoil: (patch) => {
    const foundationSoil = { ...get().foundationSoil, ...patch };
    set({ foundationSoil });
    recalc(set, get);
  },
  setAnchorSettings: (patch) => {
    const anchorSettings = { ...get().anchorSettings, ...patch };
    set({ anchorSettings });
    recalc(set, get);
  },

  exportProjectJson: () => {
    const s = get();
    return JSON.stringify(
      {
        projectName: s.projectName,
        geometry: s.geometry,
        panel: s.panel,
        profiles: s.profiles,
        location: s.location,
        climateOverride: s.climateOverride,
        settings: s.settings,
        foundationSoil: s.foundationSoil,
        anchorSettings: s.anchorSettings,
      },
      null,
      2
    );
  },
  importProjectJson: (json) => {
    const data = JSON.parse(json);
    set({
      projectName: data.projectName ?? "Импортированный проект",
      geometry: data.geometry ?? defaultGeometry(),
      panel: data.panel ?? defaultPanel(),
      profiles: data.profiles ?? defaultProfiles(),
      location: data.location ?? defaultLocation(),
      climateOverride: data.climateOverride,
      settings: data.settings ?? defaultSettings(),
      foundationSoil: data.foundationSoil ?? defaultFoundationSoil(),
      anchorSettings: data.anchorSettings ?? defaultAnchorSettings(),
    });
    recalc(set, get);
  },
  resetProject: () => {
    set({ projectName: "Проект СЭС №1", ...buildInitial() });
  },
}));

function recalc(set: (partial: Partial<ProjectState>) => void, get: () => ProjectState) {
  const s = get();
  try {
    const results = runCalculation({
      geometry: s.geometry,
      panel: s.panel,
      profiles: s.profiles,
      location: s.location,
      climateOverride: s.climateOverride,
      settings: s.settings,
      foundationSoil: s.foundationSoil,
      anchorSettings: s.anchorSettings,
    });
    set({ results });
  } catch (e) {
    // Некорректная промежуточная комбинация входных данных (например, при вводе) — не прерываем работу формы
    console.error("Ошибка пересчета", e);
  }
}
