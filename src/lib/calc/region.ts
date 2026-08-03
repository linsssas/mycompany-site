import { ClimateData } from "./types";

/**
 * Справочные значения снегового/ветрового давления по районам (аналогично СП РК 2.04-01-2017 /
 * СНиП 2.01.07-85* "Нагрузки и воздействия"). Приведены типовые значения для демонстрации
 * методики расчета. Перед выпуском рабочей документации значения S0/W0 для конкретной площадки
 * должны быть уточнены по действующей карте районирования СП РК или по данным изысканий.
 */
export const SNOW_REGION_S0: Record<string, number> = {
  I: 0.8,
  II: 1.2,
  III: 1.8,
  IV: 2.4,
  V: 3.2,
  VI: 4.0,
};

export const WIND_REGION_W0: Record<string, number> = {
  "Ia": 0.17,
  I: 0.23,
  II: 0.3,
  III: 0.38,
  IV: 0.48,
  V: 0.6,
  VI: 0.73,
  VII: 0.85,
};

export interface CityClimateRef {
  country: string;
  region: string; // область
  city: string;
  lat: number;
  lon: number;
  snowRegion: keyof typeof SNOW_REGION_S0 | string;
  windRegion: keyof typeof WIND_REGION_W0 | string;
  terrainCategory: "A" | "B" | "C";
}

export const CITY_DATABASE: CityClimateRef[] = [
  { country: "Казахстан", region: "г. Астана", city: "Астана", lat: 51.1694, lon: 71.4491, snowRegion: "III", windRegion: "III", terrainCategory: "B" },
  { country: "Казахстан", region: "г. Алматы", city: "Алматы", lat: 43.2389, lon: 76.8897, snowRegion: "III", windRegion: "II", terrainCategory: "B" },
  { country: "Казахстан", region: "Туркестанская область", city: "Шымкент", lat: 42.3, lon: 69.6, snowRegion: "II", windRegion: "II", terrainCategory: "B" },
  { country: "Казахстан", region: "Карагандинская область", city: "Караганда", lat: 49.8, lon: 73.1, snowRegion: "III", windRegion: "III", terrainCategory: "B" },
  { country: "Казахстан", region: "Актюбинская область", city: "Актобе", lat: 50.28, lon: 57.17, snowRegion: "III", windRegion: "III", terrainCategory: "B" },
  { country: "Казахстан", region: "Атырауская область", city: "Атырау", lat: 47.1, lon: 51.9, snowRegion: "II", windRegion: "IV", terrainCategory: "A" },
  { country: "Казахстан", region: "Павлодарская область", city: "Павлодар", lat: 52.28, lon: 76.95, snowRegion: "IV", windRegion: "III", terrainCategory: "B" },
  { country: "Казахстан", region: "Восточно-Казахстанская область", city: "Усть-Каменогорск", lat: 49.95, lon: 82.6, snowRegion: "IV", windRegion: "II", terrainCategory: "B" },
  { country: "Казахстан", region: "Кызылординская область", city: "Кызылорда", lat: 44.85, lon: 65.5, snowRegion: "I", windRegion: "III", terrainCategory: "A" },
  { country: "Казахстан", region: "Жамбылская область", city: "Тараз", lat: 42.9, lon: 71.37, snowRegion: "II", windRegion: "II", terrainCategory: "B" },
  { country: "Казахстан", region: "Костанайская область", city: "Костанай", lat: 53.2, lon: 63.6, snowRegion: "IV", windRegion: "IV", terrainCategory: "A" },
  { country: "Казахстан", region: "Северо-Казахстанская область", city: "Петропавловск", lat: 54.87, lon: 69.15, snowRegion: "IV", windRegion: "IV", terrainCategory: "A" },
  { country: "Казахстан", region: "Мангистауская область", city: "Актау", lat: 43.65, lon: 51.2, snowRegion: "I", windRegion: "V", terrainCategory: "A" },
  { country: "Казахстан", region: "Абайская область", city: "Семей", lat: 50.4, lon: 80.25, snowRegion: "IV", windRegion: "II", terrainCategory: "B" },
  { country: "Казахстан", region: "Жетысуская область", city: "Талдыкорган", lat: 45.02, lon: 78.37, snowRegion: "III", windRegion: "II", terrainCategory: "B" },
  { country: "Казахстан", region: "Западно-Казахстанская область", city: "Уральск", lat: 51.23, lon: 51.37, snowRegion: "IV", windRegion: "III", terrainCategory: "A" },
];

export const COUNTRIES = ["Казахстан"];

export function citiesByRegion(country: string, region: string): CityClimateRef[] {
  return CITY_DATABASE.filter((c) => c.country === country && c.region === region);
}

export function regionsByCountry(country: string): string[] {
  return Array.from(new Set(CITY_DATABASE.filter((c) => c.country === country).map((c) => c.region)));
}

/** Ближайший город из справочника по GPS-координатам (метод ближайшего соседа) */
export function nearestCity(lat: number, lon: number): CityClimateRef {
  let best = CITY_DATABASE[0];
  let bestDist = Infinity;
  for (const c of CITY_DATABASE) {
    const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export function climateFromCityRef(ref: CityClimateRef): ClimateData {
  return {
    snowRegion: ref.snowRegion,
    windRegion: ref.windRegion,
    s0: SNOW_REGION_S0[ref.snowRegion] ?? 1.2,
    w0: WIND_REGION_W0[ref.windRegion] ?? 0.3,
    terrainCategory: ref.terrainCategory,
  };
}
