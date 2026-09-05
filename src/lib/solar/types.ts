// Типы модели «Опора солнечных панелей».
//
// СОГЛАШЕНИЕ О ЕДИНИЦАХ (важно!):
//   * все ВХОДНЫЕ данные хранятся в удобных инженеру единицах: мм, кг, кПа, м/с, МПа, °;
//   * все ВНУТРЕННИЕ расчёты ведутся в Н, мм, МПа (Н/мм²), Н·мм;
//   * конвертация — только на границе (см. lib/solar/units.ts).

export type NormCode = "SP_RK_EN" | "SP20" | "MANUAL";

export type MemberRole =
  | "rearPost" // задняя (высокая) стойка
  | "frontPost" // передняя (низкая) стойка
  | "beam" // балка (стропило)
  | "brace" // подпорка балки (раскос)
  | "purlin" // прогон
  | "windBrace"; // ветровая связь

export const MEMBER_ROLES: MemberRole[] = ["rearPost", "frontPost", "beam", "brace", "purlin", "windBrace"];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  rearPost: "Стойка задняя",
  frontPost: "Стойка передняя",
  beam: "Балка (стропило)",
  brace: "Подпорка балки",
  purlin: "Прогон",
  windBrace: "Связь ветровая",
};

// ---------------------------------------------------------------------------
// Сечения
// ---------------------------------------------------------------------------

/** Тип сечения. Для всех типов, кроме CUSTOM, характеристики вычисляются из габаритов. */
export type SectionShape = "C" | "SIGMA" | "Z" | "RHS" | "ANGLE" | "CUSTOM";

export const SECTION_SHAPE_LABELS: Record<SectionShape, string> = {
  C: "C — швеллер гнутый (с отгибами)",
  SIGMA: "Σ — сигма-профиль",
  Z: "Z — зетовый профиль",
  RHS: "Труба прямоугольная",
  ANGLE: "Уголок гнутый",
  CUSTOM: "Произвольное (ручной ввод характеристик)",
};

/** Ручной ввод геометрических характеристик сечения (в инженерных единицах). */
export interface ManualSectionProps {
  A: number; // см²
  Ix: number; // см⁴
  Iy: number; // см⁴
  Wx: number; // см³
  Wy: number; // см³
  ix: number; // см
  iy: number; // см
  It: number; // см⁴
  Iw: number; // см⁶
  Aeff?: number; // см² — эффективная площадь (если известна)
  Weff?: number; // см³ — эффективный момент сопротивления
}

export type Coating = "Sz" | "HDZ" | "none";

/** Описание профиля в библиотеке сечений (редактируемая пользователем таблица). */
export interface SectionDef {
  key: string;
  name: string;
  shape: SectionShape;
  /** Габарит по высоте (высота стенки), мм */
  h: number;
  /** Габарит по ширине (ширина полки), мм */
  b: number;
  /** Длина краевого отгиба (губки), мм. 0 — без отгиба */
  c: number;
  /** Толщина стали, мм */
  t: number;
  /** Радиус гиба задаётся как rFactor · t (по умолчанию 1,5·t) */
  rFactor: number;
  /** Глубина подкрепляющего гофра стенки для Σ-профиля, мм */
  webStiffenerDepth?: number;
  coating: Coating;
  /** Характеристики при ручном вводе (shape === "CUSTOM") */
  manual?: ManualSectionProps;
  /** Пользовательский профиль (можно удалить из библиотеки) */
  userDefined?: boolean;
  comment?: string;
}

// ---------------------------------------------------------------------------
// Геометрия
// ---------------------------------------------------------------------------

export type PanelOrientation = "portrait" | "landscape";

/** Какая из трёх связанных величин «угол ↔ высоты стоек ↔ разнос» вычисляется автоматически. */
export type GeometryLinkMode = "angle" | "heights" | "spacing";

export interface GeometryInput {
  /** Угол наклона панелей α, ° */
  tiltDeg: number;
  /** Количество опорных рам N */
  frameCount: number;
  /** Шаг рам, мм */
  framePitch: number;
  /** Свес прогонов по краям стола, мм */
  edgeOverhang: number;
  /** Число рядов панелей по скату */
  panelRows: number;
  panelOrientation: PanelOrientation;
  /** Зазор между панелями, мм */
  panelGap: number;
  /** Горизонтальный разнос осей стоек, мм */
  postSpacing: number;
  /** Высота верха задней стойки над землёй, мм */
  rearTopHeight: number;
  /** Высота верха передней стойки над землёй, мм */
  frontTopHeight: number;
  /** Что пересчитывается автоматически из двух других величин */
  linkMode: GeometryLinkMode;
  /** Свес балки за переднюю стойку (по скату), мм */
  beamOverhang: number;
  /** Свес балки за заднюю стойку (по скату), мм */
  beamRearOverhang: number;
  /** Положение панельного поля на балке: centered — по центру балки, manual — по смещению */
  panelFieldMode: "centered" | "manual";
  /** Смещение нижней кромки панельного поля от нижнего конца балки (по скату), мм */
  panelFieldOffset: number;
  /** Число линий прогонов */
  purlinLines: number;
  /** Положение линий прогонов, % от длины ската (от нижней кромки) */
  purlinPositionsPct: number[];
  /** Подпорка балки: включена ли */
  braceEnabled: boolean;
  /** Высота крепления подпорки на задней стойке, мм */
  bracePostAttachHeight: number;
  /** Положение подпорки на балке, % пролёта между стойками (от задней стойки) */
  braceBeamPositionPct: number;
  /** Длина одной секции прогона (монтажный стык), мм */
  purlinSectionLength: number;
}

// ---------------------------------------------------------------------------
// Материал
// ---------------------------------------------------------------------------

export interface MaterialInput {
  /** Предел текучести fy (Ry), МПа */
  fy: number;
  /** Предел прочности fu, МПа */
  fu: number;
  E: number; // МПа
  G: number; // МПа
  nu: number;
  /** Плотность, кг/м³ */
  rho: number;
  /** Коэффициент условий работы γc */
  gammaC: number;
  gammaM0: number;
  gammaM1: number;
  gammaM2: number;
}

// ---------------------------------------------------------------------------
// Панели
// ---------------------------------------------------------------------------

export interface PanelInput {
  /** Масса одной панели, кг */
  mass: number;
  /** Длина панели (по скату при ориентации «портрет»), мм */
  length: number;
  /** Ширина панели, мм */
  width: number;
  /** Мощность одной панели, Вт */
  powerW: number;
  /** Ручное переопределение количества панелей (null — считать из геометрии) */
  countOverride: number | null;
}

// ---------------------------------------------------------------------------
// Собственный вес
// ---------------------------------------------------------------------------

export interface SelfWeightInput {
  /** auto — по спецификации, manual — задана общая масса металла */
  mode: "auto" | "manual";
  /** Масса металлоконструкции при ручном вводе, кг */
  manualMassKg: number;
  /** Коэффициент запаса на крепёж и мелочёвку */
  fastenerFactor: number;
}

// ---------------------------------------------------------------------------
// Грунт и фундамент
// ---------------------------------------------------------------------------

export type FoundationType = "driven" | "concreted" | "screw" | "footing";

export const FOUNDATION_LABELS: Record<FoundationType, string> = {
  driven: "Забивная стойка в грунт",
  concreted: "Бетонирование в скважине",
  screw: "Винтовая свая",
  footing: "Бетонный башмак",
};

export interface GroundInput {
  /** Глубина заглубления стойки, мм */
  embedDepth: number;
  foundationType: FoundationType;
  /** Диаметр (сторона) бетонирования, мм */
  concreteDia: number;
  soilKey: string;
  /** Угол внутреннего трения, ° */
  phi: number;
  /** Удельное сцепление, кПа */
  c: number;
  /** Удельный вес грунта, кН/м³ */
  gamma: number;
  /** Расчётное сопротивление грунта, кПа */
  R: number;
  /** Коэффициент реакции грунта: пески — nh, кН/м³ (растёт с глубиной) */
  nh: number;
  /** Коэффициент реакции грунта: глины — ks, кН/м³ (постоянный) */
  ks: number;
  /** Глубина промерзания, м */
  frostDepthM: number;
  /** Модель опирания стойки в расчётной схеме */
  supportModel: "elastic" | "fixed";
  /** Требуемый коэффициент запаса на выдёргивание */
  upliftSafetyFactor: number;
}

// ---------------------------------------------------------------------------
// Болты и узлы
// ---------------------------------------------------------------------------

export type JointKey =
  | "panel_purlin"
  | "purlin_beam"
  | "beam_post"
  | "brace_beam"
  | "brace_plate"
  | "purlin_splice"
  | "wind_brace";

export const JOINT_LABELS: Record<JointKey, string> = {
  panel_purlin: "Панель — прогон (зажимы)",
  purlin_beam: "Прогон — балка",
  beam_post: "Балка — стойка",
  brace_beam: "Подпорка — балка",
  brace_plate: "Подпорка — пластина",
  purlin_splice: "Стык прогонов через бандаж",
  wind_brace: "Связь ветровая",
};

export interface BoltJointInput {
  key: JointKey;
  /** Диаметр болта, мм (8/10/12/16) */
  d: number;
  /** Класс прочности болта */
  grade: string;
  /** Количество болтов в узле */
  n: number;
  /** Толщина тонкого соединяемого элемента, мм (определяет смятие) */
  t1: number;
  /** Толщина второго элемента, мм */
  t2: number;
  /** Расстояние до края вдоль усилия e1, мм */
  e1: number;
  /** Расстояние до края поперёк усилия e2, мм */
  e2: number;
  /** Шаг болтов вдоль усилия p1, мм */
  p1: number;
  /** Резьба в плоскости среза */
  threadInShear: boolean;
}

export interface BoltsInput {
  joints: BoltJointInput[];
  /** Фактическое количество болтов по чертежу */
  drawingCounts: { d: number; count: number }[];
  /** Зажимы панелей */
  clampEndCount: number;
  clampMidCount: number;
  /** Паспортная несущая способность одного зажима, кН */
  clampCapacityKN: number;
}

// ---------------------------------------------------------------------------
// Климат
// ---------------------------------------------------------------------------

export type TerrainCategory = "0" | "I" | "II" | "III" | "IV";

export interface ClimateInput {
  norm: NormCode;
  regionKey: string;
  /** Ручное переопределение характеристической снеговой нагрузки на грунт, кПа */
  skManual: number | null;
  /** Ручное переопределение базовой скорости ветра, м/с */
  vbManual: number | null;
  terrain: TerrainCategory;
  /** Высота площадки над уровнем моря, м */
  altitude: number;
  /** Термический коэффициент */
  Ct: number;
  /** Коэффициент окружения (снос снега ветром) */
  Ce: number;
  /** Период повторяемости, лет */
  returnPeriodYears: number;
  /** Срок службы, лет */
  serviceLifeYears: number;
  /** Гололёд */
  iceEnabled: boolean;
  iceThicknessMm: number;
  /** Перепад температур для расчёта удлинения, ±°C */
  deltaT: number;
  /** Коэффициент заполнения подстольного пространства для ветра */
  blockage: "both" | "0" | "1";
  /** Считать ветровые коэффициенты по ASCE 7-22, гл. 29.4.4 (GCrn) вместо табл. 7.6 EN */
  useAsce: boolean;
}

// ---------------------------------------------------------------------------
// Расчётные настройки
// ---------------------------------------------------------------------------

export interface DesignInput {
  /** Коэффициенты расчётной длины μ в плоскости рамы (сильная ось) */
  bucklingFactors: Record<MemberRole, number>;
  /** Коэффициенты расчётной длины μ из плоскости рамы (вдоль стола, слабая ось) */
  bucklingFactorsOut: Record<MemberRole, number>;
  deflectionLimits: {
    purlin: number; // L / value
    beam: number;
    cantilever: number; // 2·Lк / value
    postDrift: number; // H / value
    panelAbsMm: number; // допуск производителя панели, мм
  };
  /** Монтажная сосредоточенная нагрузка, кН */
  montageLoadKN: number;
  /** Повышающий коэффициент для краевых зон (крайние рамы) */
  edgeZoneFactor: number;
  /** Нижняя граница продольной ветровой силы в долях от поперечной */
  alongMinFraction: number;
  /** Конструктивная глубина торцевого силуэта стола (для ветра вдоль), мм */
  structuralDepthMm: number;
  /** Частные коэффициенты по EN 1990 */
  gammaG: number;
  gammaGfav: number;
  gammaQ: number;
  xi: number;
  psi0Snow: number;
  psi0Wind: number;
  /** Считать монтажный стык прогона шарниром (консервативно) */
  spliceAsHinge: boolean;
}

// ---------------------------------------------------------------------------
// Проект целиком
// ---------------------------------------------------------------------------

export interface ProjectMeta {
  name: string;
  author: string;
  object: string;
  presetKey: string;
}

export interface SolarProject {
  meta: ProjectMeta;
  geometry: GeometryInput;
  /** Назначенные сечения по элементам */
  sections: Record<MemberRole, SectionDef>;
  material: MaterialInput;
  panel: PanelInput;
  selfWeight: SelfWeightInput;
  ground: GroundInput;
  bolts: BoltsInput;
  climate: ClimateInput;
  design: DesignInput;
  /** Экономика */
  economics: { steelPricePerKg: number; currency: string };
}

// ---------------------------------------------------------------------------
// Общие типы результатов
// ---------------------------------------------------------------------------

export type Severity = "info" | "warning" | "error";

export interface Warning {
  severity: Severity;
  scope: string;
  message: string;
}

/** Строка вывода формулы с подстановкой чисел (требование ТЗ: показывать весь путь расчёта). */
export interface FormulaLine {
  /** Обозначение, напр. "μ₁" */
  symbol: string;
  /** Формула в символах */
  formula: string;
  /** Формула с подставленными числами */
  substitution: string;
  /** Результат */
  value: number;
  unit: string;
  /** Ссылка на пункт нормы */
  ref: string;
}

export type StatusColor = "green" | "yellow" | "red";

export function statusOf(utilization: number): StatusColor {
  if (utilization > 1.0) return "red";
  if (utilization >= 0.85) return "yellow";
  return "green";
}
