import { MaterialKey, MaterialProperties } from "./types";

// Справочные характеристики сталей (упрощенно, по ГОСТ 27772 / EN 10025)
export const MATERIALS: Record<Exclude<MaterialKey, "CUSTOM">, MaterialProperties> = {
  S235: { key: "S235", name: "S235 (EN 10025)", fy: 235, fu: 360, E: 206000, density: 7850, gammaM: 1.0 },
  S275: { key: "S275", name: "S275 (EN 10025)", fy: 275, fu: 430, E: 206000, density: 7850, gammaM: 1.0 },
  S355: { key: "S355", name: "S355 (EN 10025)", fy: 355, fu: 470, E: 206000, density: 7850, gammaM: 1.0 },
  C245: { key: "C245", name: "С245 (ГОСТ 27772)", fy: 245, fu: 370, E: 206000, density: 7850, gammaM: 1.025 },
  C255: { key: "C255", name: "С255 (ГОСТ 27772)", fy: 255, fu: 380, E: 206000, density: 7850, gammaM: 1.025 },
  C345: { key: "C345", name: "С345 (ГОСТ 27772)", fy: 345, fu: 470, E: 206000, density: 7850, gammaM: 1.05 },
};

export function getMaterial(key: MaterialKey, custom?: MaterialProperties): MaterialProperties {
  if (key === "CUSTOM") {
    if (!custom) throw new Error("Custom material requires properties");
    return custom;
  }
  return MATERIALS[key];
}

export const MATERIAL_LIST = Object.values(MATERIALS);
