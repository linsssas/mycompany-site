// Общие типы для инженерного калькулятора опор СЭС

export type NormCode = "SP_RK" | "EN1991_1993" | "ASCE7";

export type PanelOrientation = "portrait" | "landscape";

export type FoundationType = "pile" | "driven_post" | "concrete_block" | "monolithic";

export type ResponsibilityCategory = "I" | "II" | "III"; // категория ответственности объекта (высокая/нормальная/пониженная)

export interface GeometryInput {
  totalLength: number; // мм — общая длина конструкции
  totalWidth: number; // мм — общая ширина
  totalHeight: number; // мм — общая высота
  frontPostHeight: number; // мм — высота передней стойки
  rearPostHeight: number; // мм — высота задней стойки
  tiltAngle: number; // ° — угол наклона панелей
  spanCount: number; // количество пролетов
  spanLength: number; // мм — длина пролета
  postPitch: number; // мм — шаг между стойками
  postCount: number; // количество стоек
  beamLength: number; // мм — длина несущих балок
  purlinLength: number; // мм — длина прогонов
  braceLength: number; // мм — длина подкосов
  diagonalLength: number; // мм — длина диагональных связей
  overhang: number; // мм — размер свесов
  panelRowCount: number; // количество рядов панелей
  panelsPerRow: number; // количество панелей в одном ряду
}

export interface PanelInput {
  length: number; // мм
  width: number; // мм
  thickness: number; // мм
  weight: number; // кг/шт
  area: number; // м² (может быть авто = length*width)
  count: number; // шт (авто = rows*perRow, но допускает переопределение)
  gap: number; // мм — расстояние между панелями
  orientation: PanelOrientation;
}

export interface PanelDerived {
  totalAreaM2: number;
  totalWeightKg: number;
  centerOfGravity: { x: number; y: number; z: number }; // мм, от базовой точки конструкции
}

export interface SectionProperties {
  name: string;
  standard?: string; // напр. ГОСТ 8240-97
  h: number; // мм — высота
  b: number; // мм — ширина
  t: number; // мм — толщина стенки/полки (упрощенно)
  tf?: number; // мм — толщина полки, если применимо
  area: number; // см²
  mass: number; // кг/м
  Ix: number; // см⁴ — момент инерции относительно X
  Iy: number; // см⁴ — момент инерции относительно Y
  Wx: number; // см³ — момент сопротивления X
  Wy: number; // см³ — момент сопротивления Y
  ix?: number; // см — радиус инерции X
  iy?: number; // см — радиус инерции Y
}

export type ElementRole = "post" | "beam" | "purlin" | "brace" | "diagonal";

export interface ProfileAssignment {
  role: ElementRole;
  sectionKey: string | null; // ключ из библиотеки, null если custom
  custom?: SectionProperties; // при ручном вводе
  materialKey: MaterialKey;
  customMaterial?: MaterialProperties; // при materialKey === "CUSTOM"
}

export type MaterialKey = "S235" | "S275" | "S355" | "C245" | "C255" | "C345" | "CUSTOM";

export interface MaterialProperties {
  key: MaterialKey;
  name: string;
  fy: number; // МПа — предел текучести
  fu: number; // МПа — предел прочности
  E: number; // МПа — модуль упругости
  density: number; // кг/м³
  gammaM: number; // коэффициент надежности по материалу
}

export interface LocationInput {
  country: string;
  region: string; // область
  city: string;
  lat?: number;
  lon?: number;
  useGps: boolean;
}

export interface ClimateData {
  snowRegion: string;
  windRegion: string;
  s0: number; // кПа — норм. вес снегового покрова
  w0: number; // кПа — норм. ветровое давление
  terrainCategory: "A" | "B" | "C";
}

export interface ProjectSettings {
  norm: NormCode;
  safetyFactor: number; // дополнительный коэффициент запаса
  serviceLife: number; // лет
  responsibilityCategory: ResponsibilityCategory;
  foundationType: FoundationType;
}
