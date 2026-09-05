// Ветровая нагрузка.
//
// Ветка 1 (по умолчанию): СП РК EN 1991-1-4, п. 7.3 — свободно стоящий односкатный навес
//   vm(z) = cr(z)·co(z)·vb
//   qp(z) = [1 + 7·Iv(z)]·0,5·ρ·vm²(z),  ρ = 1,25 кг/м³
//   Fw    = cs·cd · cf · qp(ze) · Aref
//   w,net = cp,net · qp(ze)
// Ветка 2: СП 20.13330.2016 — w = wm + wg, wm = w0·k(ze)·c
//
// Аэродинамические коэффициенты вынесены в data/solar/wind_coefficients.json.

import { ClimateInput, FormulaLine, Warning } from "./types";
import { fmt } from "./units";
import windData from "@/data/solar/wind_coefficients.json";

export type WindDirection = "front" | "rear" | "along";

export interface WindZoneCoefficients {
  pos: number;
  neg_phi0: number;
  neg_phi1: number;
}

export interface WindLoadCase {
  key: string;
  label: string;
  direction: WindDirection;
  ref: string;
  note: string;
  /** Коэффициент силы, применённый в этой схеме */
  cf: number;
  /** Итоговое давление на плоскость ската (положительное — прижим), кПа */
  wNet: number;
  /** Полная сила на весь стол, кН */
  totalKN: number;
  /** Эксцентриситет равнодействующей от центра ската, мм */
  eccentricity: number;
  /** Дополнительный момент от эксцентриситета на одну раму, кН·м */
  eccentricMomentKNm: number;
  /** Коэффициент заполнения, для которого получен cf */
  blockage: "0" | "1" | "—";
  /**
   * Распределение нагрузки по скату:
   *  uniform — равномерно по всей длине ската;
   *  windwardHalf — равномерно по наветренной ПОЛОВИНЕ ската с удвоенной интенсивностью.
   * Второй вариант реализует нормативное положение равнодействующей на 0,25·d от
   * наветренной кромки (EN 1991-1-4, п. 7.3(3)) при неотрицательной нагрузке:
   * равномерная нагрузка на половине длины даёт равнодействующую ровно в d/4.
   */
  distributionMode: "uniform" | "windwardHalf";
  /** Наветренная кромка: нижняя или верхняя */
  windwardEdge: "lower" | "upper";
}

export interface WindResult {
  /** Базовая скорость ветра, м/с */
  vb: number;
  /** Средняя скорость на опорной высоте, м/с */
  vm: number;
  /** Опорная высота, м */
  ze: number;
  /** Коэффициент шероховатости */
  cr: number;
  /** Интенсивность турбулентности */
  Iv: number;
  /** Пиковое скоростное давление, кПа */
  qp: number;
  /** Коэффициенты по зонам A/B/C */
  zones: Record<"A" | "B" | "C", WindZoneCoefficients>;
  /** Максимальное по модулю местное давление (для прогонов и зажимов), кПа */
  wLocalMax: number;
  cases: WindLoadCase[];
  formulas: FormulaLine[];
  warnings: Warning[];
  /** Повышающий коэффициент краевых зон */
  edgeZoneFactor: number;
}

export interface WindInputs {
  climate: ClimateInput;
  alphaDeg: number;
  /** Базовая скорость ветра по району (или ручной ввод), м/с */
  vbRegion: number;
  /** Нормативное ветровое давление w0 для ветки СП 20, кПа */
  w0Region: number;
  /** Опорная высота — верх конструкции, мм */
  zeMm: number;
  /** Площадь ската (Aref), мм² */
  arefMm2: number;
  /** Длина ската (для эксцентриситета), мм */
  slopeLengthMm: number;
  /** Площадь торцевого силуэта стола (для ветра вдоль стола), мм² */
  frontalAreaMm2: number;
  /** Минимальная доля продольной силы от наибольшей поперечной (консервативная нижняя граница) */
  alongMinFraction: number;
  /** Число рам (для распределения силы) */
  frameCount: number;
  edgeZoneFactor: number;
}

const AIR_DENSITY = windData.airDensity; // кг/м³

/** Коэффициент пересчёта на другой период повторяемости, EN 1991-1-4, п. 4.2(2)P прим. 4. */
export function windProbabilityFactor(years: number, K = 0.2, n = 0.5): number {
  if (years <= 1) return 1;
  const p = 1 / years;
  const num = 1 - K * Math.log(-Math.log(1 - p));
  const den = 1 - K * Math.log(-Math.log(0.98));
  return Math.pow(num / den, n);
}

/** Коэффициент шероховатости cr(z), EN 1991-1-4, п. 4.3.2. */
export function roughnessFactor(zMeters: number, terrain: ClimateInput["terrain"]) {
  const cat = windData.terrain.categories[terrain];
  const z0 = cat.z0;
  const zmin = cat.zmin;
  const kr = 0.19 * Math.pow(z0 / windData.terrain.z0II, 0.07);
  const z = Math.max(zMeters, zmin);
  return { cr: kr * Math.log(z / z0), kr, z0, zmin, zUsed: z };
}

/** Линейная интерполяция коэффициентов таблицы 7.6 по углу наклона. */
export function interpolateCanopyCoefficients(alphaDeg: number) {
  const rows = windData.monopitch.rows;
  const maxAngle = windData.extrapolation.maxTabulatedAngle;
  const extrapolated = alphaDeg > maxAngle;
  const clampLow = rows[0];
  if (alphaDeg <= clampLow.alpha) return { row: clampLow, extrapolated: false, mixed: null as null | typeof clampLow };

  // Поиск пары строк для интерполяции/экстраполяции
  let lo = rows[0];
  let hi = rows[rows.length - 1];
  for (let i = 0; i < rows.length - 1; i++) {
    if (alphaDeg >= rows[i].alpha && alphaDeg <= rows[i + 1].alpha) {
      lo = rows[i];
      hi = rows[i + 1];
      break;
    }
  }
  if (alphaDeg > rows[rows.length - 1].alpha) {
    lo = rows[rows.length - 2];
    hi = rows[rows.length - 1];
  }
  const k = (alphaDeg - lo.alpha) / (hi.alpha - lo.alpha);
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const row = {
    alpha: alphaDeg,
    cf_pos: lerp(lo.cf_pos, hi.cf_pos),
    cf_neg_phi0: lerp(lo.cf_neg_phi0, hi.cf_neg_phi0),
    cf_neg_phi1: lerp(lo.cf_neg_phi1, hi.cf_neg_phi1),
    zones: {
      A: {
        pos: lerp(lo.zones.A.pos, hi.zones.A.pos),
        neg_phi0: lerp(lo.zones.A.neg_phi0, hi.zones.A.neg_phi0),
        neg_phi1: lerp(lo.zones.A.neg_phi1, hi.zones.A.neg_phi1),
      },
      B: {
        pos: lerp(lo.zones.B.pos, hi.zones.B.pos),
        neg_phi0: lerp(lo.zones.B.neg_phi0, hi.zones.B.neg_phi0),
        neg_phi1: lerp(lo.zones.B.neg_phi1, hi.zones.B.neg_phi1),
      },
      C: {
        pos: lerp(lo.zones.C.pos, hi.zones.C.pos),
        neg_phi0: lerp(lo.zones.C.neg_phi0, hi.zones.C.neg_phi0),
        neg_phi1: lerp(lo.zones.C.neg_phi1, hi.zones.C.neg_phi1),
      },
    },
  };
  return { row, extrapolated, mixed: null };
}

export function calcWind(input: WindInputs): WindResult {
  const { climate, alphaDeg, vbRegion, w0Region, zeMm, arefMm2, slopeLengthMm, frontalAreaMm2 } = input;
  const warnings: Warning[] = [];
  const formulas: FormulaLine[] = [];

  const ze = Math.max(zeMm / 1000, 0.5); // м
  const arefM2 = arefMm2 / 1e6;
  const frontalM2 = frontalAreaMm2 / 1e6;

  // ---------------- Ветка СП 20.13330 ----------------
  if (climate.norm === "SP20") {
    // k(ze) по таблице 11.2 (тип местности B) — аппроксимация степенной функцией
    const k = Math.max(0.5, 0.65 * Math.pow(Math.max(ze, 5) / 10, 0.4));
    const wm = w0Region * k;
    formulas.push({
      symbol: "wm",
      formula: "wm = w0 · k(ze) · c",
      substitution: `${fmt(w0Region)} · ${fmt(k)} · c`,
      value: wm,
      unit: "кПа",
      ref: "СП 20.13330.2016, п. 11.1.2",
    });
    warnings.push({
      severity: "warning",
      scope: "Ветер",
      message:
        "Ветка СП 20.13330 реализована в упрощённом виде: коэффициент k(ze) аппроксимирован степенной зависимостью, аэродинамические коэффициенты приняты как для отдельно стоящих плоских конструкций (прил. В.1.15). Для выпуска документации использовать основную ветку СП РК EN 1991-1-4.",
    });
    const cases = buildCases({
      qp: wm,
      row: interpolateCanopyCoefficients(alphaDeg).row,
      blockageMode: climate.blockage,
      arefM2,
      slopeLengthMm,
      frontalM2,
      frameCount: input.frameCount,
      alongCf: windData.alongTable.cf,
      alongMinFraction: input.alongMinFraction,
    });
    return {
      vb: vbRegion,
      vm: 0,
      ze,
      cr: k,
      Iv: 0,
      qp: wm,
      zones: interpolateCanopyCoefficients(alphaDeg).row.zones,
      wLocalMax: Math.max(...cases.map((c) => Math.abs(c.wNet))),
      cases,
      formulas,
      warnings,
      edgeZoneFactor: input.edgeZoneFactor,
    };
  }

  // ---------------- Ветка СП РК EN 1991-1-4 ----------------
  const cprob = climate.returnPeriodYears === 50 ? 1 : windProbabilityFactor(climate.returnPeriodYears);
  const vb = vbRegion * cprob;
  const { cr, kr, z0, zmin, zUsed } = roughnessFactor(ze, climate.terrain);
  const co = 1.0; // орография
  const vm = cr * co * vb;
  const Iv = 1.0 / (co * Math.log(zUsed / z0));
  const qpPa = (1 + 7 * Iv) * 0.5 * AIR_DENSITY * vm * vm; // Па
  const qp = qpPa / 1000; // кПа

  formulas.push({
    symbol: "vb",
    formula: "vb = cprob · vb,0",
    substitution: `${fmt(cprob)} · ${fmt(vbRegion)}`,
    value: vb,
    unit: "м/с",
    ref: "EN 1991-1-4, п. 4.2",
  });
  formulas.push({
    symbol: "cr(ze)",
    formula: "cr = kr · ln(ze/z0),  kr = 0,19·(z0/z0,II)^0,07",
    substitution: `${fmt(kr)} · ln(${fmt(zUsed)}/${fmt(z0)})`,
    value: cr,
    unit: "—",
    ref: `EN 1991-1-4, п. 4.3.2 (категория местности ${climate.terrain}, z0 = ${z0} м)`,
  });
  formulas.push({
    symbol: "vm(ze)",
    formula: "vm = cr · co · vb",
    substitution: `${fmt(cr)} · ${fmt(co)} · ${fmt(vb)}`,
    value: vm,
    unit: "м/с",
    ref: "EN 1991-1-4, п. 4.3.1",
  });
  formulas.push({
    symbol: "Iv(ze)",
    formula: "Iv = kI / (co · ln(ze/z0))",
    substitution: `1,0 / (${fmt(co)} · ln(${fmt(zUsed)}/${fmt(z0)}))`,
    value: Iv,
    unit: "—",
    ref: "EN 1991-1-4, п. 4.4",
  });
  formulas.push({
    symbol: "qp(ze)",
    formula: "qp = [1 + 7·Iv] · 0,5 · ρ · vm²",
    substitution: `[1 + 7·${fmt(Iv)}] · 0,5 · ${AIR_DENSITY} · ${fmt(vm)}²`,
    value: qp,
    unit: "кПа",
    ref: "EN 1991-1-4, п. 4.5",
  });

  if (ze < zmin) {
    warnings.push({
      severity: "info",
      scope: "Ветер",
      message: `Опорная высота ze = ${fmt(ze)} м меньше zmin = ${zmin} м для категории местности ${
        climate.terrain
      }: в расчёте принято z = zmin (EN 1991-1-4, п. 4.3.2).`,
    });
  }

  const interp = interpolateCanopyCoefficients(alphaDeg);
  if (climate.useAsce) {
    // Проверочная альтернатива: методика для наземных фотоэлектрических установок.
    // Коэффициенты GCrn задаются пользователем в wind_coefficients.json.
    interp.row.cf_pos = windData.asce.GCrn_pos;
    interp.row.cf_neg_phi0 = windData.asce.GCrn_neg;
    interp.row.cf_neg_phi1 = windData.asce.GCrn_neg;
    warnings.push({
      severity: "warning",
      scope: "Ветер",
      message: `Включена альтернативная методика ASCE 7-22, гл. 29.4.4: приняты GCrn = ${fmt(
        windData.asce.GCrn_pos
      )} / ${fmt(
        windData.asce.GCrn_neg
      )} (редактируются в wind_coefficients.json). Скоростное давление при этом вычисляется по EN 1991-1-4, поэтому результат является ОЦЕНОЧНЫМ сопоставлением, а не полным расчётом по ASCE. ${
        windData.asce.GCrn_note
      }`,
    });
  } else if (interp.extrapolated) {
    warnings.push({
      severity: "warning",
      scope: "Ветер",
      message: `Угол наклона α = ${fmt(alphaDeg)}° выходит за пределы таблицы 7.6 EN 1991-1-4 (нормируется до ${
        windData.extrapolation.maxTabulatedAngle
      }°). Коэффициенты получены линейной экстраполяцией и требуют отдельного обоснования.`,
    });
  }
  warnings.push({
    severity: "warning",
    scope: "Ветер",
    message: windData._meta.warning,
  });

  const cases = buildCases({
    qp,
    row: interp.row,
    blockageMode: climate.blockage,
    arefM2,
    slopeLengthMm,
    frontalM2,
    frameCount: input.frameCount,
    alongCf: windData.alongTable.cf,
    alongMinFraction: input.alongMinFraction,
  });

  for (const c of cases) {
    formulas.push({
      symbol: `w,net (${c.key})`,
      formula: "w,net = cp,net · qp(ze)",
      substitution: `${fmt(c.cf)} · ${fmt(qp)}`,
      value: c.wNet,
      unit: "кПа",
      ref: c.ref,
    });
  }

  const uplift = cases.find((c) => c.direction === "rear");
  if (uplift) {
    formulas.push({
      symbol: "Me",
      formula: "Me = Fw · e,  e = 0,25·d (эксцентриситет равнодействующей для навеса)",
      substitution: `${fmt(uplift.totalKN / input.frameCount)} кН · ${fmt(uplift.eccentricity / 1000)} м`,
      value: uplift.eccentricMomentKNm,
      unit: "кН·м",
      ref: "EN 1991-1-4, п. 7.3(3)",
    });
  }

  const zones = interp.row.zones;
  const wLocalMax =
    qp *
    Math.max(
      Math.abs(zones.A.pos),
      Math.abs(zones.A.neg_phi0),
      Math.abs(zones.A.neg_phi1),
      Math.abs(zones.B.pos),
      Math.abs(zones.B.neg_phi0),
      Math.abs(zones.B.neg_phi1),
      Math.abs(zones.C.pos),
      Math.abs(zones.C.neg_phi0),
      Math.abs(zones.C.neg_phi1)
    );

  return {
    vb,
    vm,
    ze,
    cr,
    Iv,
    qp,
    zones,
    wLocalMax,
    cases,
    formulas,
    warnings,
    edgeZoneFactor: input.edgeZoneFactor,
  };
}

interface BuildCasesArgs {
  qp: number;
  row: ReturnType<typeof interpolateCanopyCoefficients>["row"];
  blockageMode: ClimateInput["blockage"];
  arefM2: number;
  slopeLengthMm: number;
  frontalM2: number;
  frameCount: number;
  alongCf: number;
  alongMinFraction: number;
}

function buildCases(args: BuildCasesArgs): WindLoadCase[] {
  const { qp, row, blockageMode, arefM2, slopeLengthMm, frontalM2, frameCount, alongCf, alongMinFraction } = args;
  const ecc = slopeLengthMm * windData.eccentricity.fractionOfSlopeLength;
  // Плечо равнодействующей относительно ЦЕНТРА ската
  const eccArm = slopeLengthMm / 2 - ecc;
  const cases: WindLoadCase[] = [];

  const push = (
    key: string,
    label: string,
    direction: WindDirection,
    cf: number,
    blockage: "0" | "1" | "—",
    area: number,
    ref: string,
    note: string,
    distributionMode: "uniform" | "windwardHalf" = "uniform",
    windwardEdge: "lower" | "upper" = "lower"
  ) => {
    const wNet = cf * qp;
    const totalKN = wNet * area;
    const perFrameKN = frameCount > 0 ? totalKN / frameCount : totalKN;
    cases.push({
      key,
      label,
      direction,
      ref,
      note,
      cf,
      wNet,
      totalKN,
      eccentricity: direction === "along" ? 0 : eccArm,
      eccentricMomentKNm: direction === "along" ? 0 : (Math.abs(perFrameKN) * eccArm) / 1000,
      blockage,
      distributionMode,
      windwardEdge,
    });
  };

  push(
    "W1",
    "Ветер на фронт (прижим), равномерно",
    "front",
    row.cf_pos,
    "—",
    arefM2,
    "EN 1991-1-4, табл. 7.6 (cf при давлении вниз)",
    "Складывается со снегом и собственным весом: определяет сжатие стоек и вдавливание фундамента."
  );
  push(
    "W1e",
    "Ветер на фронт (прижим), равнодействующая на 0,25·d",
    "front",
    row.cf_pos,
    "—",
    arefM2,
    "EN 1991-1-4, п. 7.3(3) — эксцентриситет равнодействующей",
    "Та же суммарная сила, приложенная к наветренной половине ската: даёт дополнительный момент на балку и стойки.",
    "windwardHalf",
    "lower"
  );

  const negs: { cf: number; blockage: "0" | "1" }[] = [];
  if (blockageMode === "both" || blockageMode === "0") negs.push({ cf: row.cf_neg_phi0, blockage: "0" });
  if (blockageMode === "both" || blockageMode === "1") negs.push({ cf: row.cf_neg_phi1, blockage: "1" });
  for (const n of negs) {
    const note =
      n.blockage === "1"
        ? "Подстольное пространство заблокировано (снег, растительность, оборудование) — как правило, определяет анкеровку и заглубление."
        : "Свободный поток под столом.";
    push(
      `W2_phi${n.blockage}`,
      `Ветер в тыл (отрыв/подъём) φ=${n.blockage}, равномерно`,
      "rear",
      n.cf,
      n.blockage,
      arefM2,
      `EN 1991-1-4, табл. 7.6 (cf при отсосе, коэффициент заполнения φ = ${n.blockage})`,
      note
    );
    push(
      `W2e_phi${n.blockage}`,
      `Ветер в тыл (отрыв/подъём) φ=${n.blockage}, равнодействующая на 0,25·d`,
      "rear",
      n.cf,
      n.blockage,
      arefM2,
      "EN 1991-1-4, п. 7.3(3) — эксцентриситет равнодействующей",
      note + " Сила приложена к наветренной (верхней) половине ската.",
      "windwardHalf",
      "upper"
    );
  }

  // Ветер ВДОЛЬ стола. Панельное поле обтекается по касательной, поэтому продольная
  // сила складывается из силы трения по поверхности панелей (EN 1991-1-4, п. 7.5,
  // cfr = 0,01 для гладкой поверхности) и лобового сопротивления торцевого силуэта.
  // Дополнительно принимается нижняя граница в долях от наибольшей поперечной силы —
  // консервативная оценка вклада конструктивных элементов и косых направлений ветра.
  const cfr = 0.01;
  const frictionKN = cfr * qp * arefM2;
  const endKN = alongCf * qp * frontalM2;
  const maxTransverseKN = Math.max(...cases.map((c) => Math.abs(c.totalKN)), 0);
  const alongKN = Math.max(frictionKN + endKN, alongMinFraction * maxTransverseKN);
  const effectiveCf = qp * arefM2 !== 0 ? alongKN / (qp * arefM2) : 0;
  push(
    "W3",
    "Ветер вдоль стола (на торец)",
    "along",
    effectiveCf,
    "—",
    arefM2,
    "EN 1991-1-4, п. 7.5 (силы трения) + лобовое сопротивление торца; нижняя граница в долях от поперечной силы",
    `Трение по панелям ${fmt(frictionKN)} кН + торец ${fmt(endKN)} кН; принято ${fmt(
      alongKN
    )} кН (не менее ${fmt(alongMinFraction * 100)} % от поперечной силы ${fmt(maxTransverseKN)} кН). Воспринимается ветровыми связями.`
  );

  return cases;
}
