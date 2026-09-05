// Проверки болтовых соединений.
// СП РК EN 1993-1-8 (общие правила) + EN 1993-1-3, разд. 8 (соединения тонких листов).
//
// ВАЖНО: при толщине листа 1,5–2 мм определяющей, как правило, является проверка
// СМЯТИЯ ЛИСТА, а не среза болта.

import boltData from "@/data/solar/bolts.json";
import { BoltJointInput, JOINT_LABELS, MaterialInput, Warning, statusOf } from "../types";
import { CheckRow, UtilizationItem } from "./member";
import { fmt, nToKN } from "../units";

export interface BoltGrade {
  key: string;
  fyb: number;
  fub: number;
  alphaV: number;
  note: string;
}

export interface BoltDiameter {
  d: number;
  A: number;
  As: number;
  dm: number;
  d0: number;
}

export const BOLT_GRADES: BoltGrade[] = boltData.grades;
export const BOLT_DIAMETERS: BoltDiameter[] = boltData.diameters;

export function boltGrade(key: string): BoltGrade {
  return BOLT_GRADES.find((g) => g.key === key) ?? BOLT_GRADES[2];
}
export function boltDiameter(d: number): BoltDiameter {
  return BOLT_DIAMETERS.find((x) => x.d === d) ?? BOLT_DIAMETERS[1];
}

export interface BoltResistances {
  /** Срез одного болта, Н */
  FvRd: number;
  /** Смятие листа под одним болтом, Н */
  FbRd: number;
  /** Растяжение болта, Н */
  FtRd: number;
  /** Продавливание головки/гайки, Н */
  BpRd: number;
  /** Определяющая проверка на сдвиг */
  governing: "срез болта" | "смятие листа";
  alphaB: number;
  k1: number;
  kt: number;
  details: string[];
}

export function boltResistances(j: BoltJointInput, mat: MaterialInput): BoltResistances {
  const g = boltGrade(j.grade);
  const dim = boltDiameter(j.d);
  const details: string[] = [];
  const gammaM2 = mat.gammaM2;
  const fu = mat.fu;

  // --- Срез болта (EN 1993-1-8, табл. 3.4) ---
  const shearArea = j.threadInShear ? dim.As : dim.A;
  const alphaV = j.threadInShear ? g.alphaV : 0.6;
  const FvRd = (alphaV * g.fub * shearArea) / gammaM2;
  details.push(
    `F_v,Rd = αv·fub·A/γM2 = ${fmt(alphaV)}·${g.fub}·${fmt(shearArea)}/${fmt(gammaM2)} = ${fmt(nToKN(FvRd))} кН` +
      (j.threadInShear ? " (резьба в плоскости среза, A = As)" : " (срез по гладкой части стержня)")
  );

  // --- Смятие листа ---
  const t = Math.min(j.t1, j.t2);
  // Вариант EN 1993-1-8, п. 3.6.1
  const alphaB18 = Math.min(j.e1 / (3 * dim.d0), g.fub / fu, 1.0);
  const k1 = Math.min((2.8 * j.e2) / dim.d0 - 1.7, 2.5);
  const Fb18 = (k1 * alphaB18 * fu * j.d * t) / gammaM2;
  // Вариант EN 1993-1-3, п. 8.3.2 (тонкие листы)
  const kt = t >= 0.75 && t <= 1.25 ? (0.8 * t + 1.5) / 2.5 : 1.0;
  const alphaB13 = Math.min(1.0, j.e1 / (3 * j.d));
  const Fb13 = (2.5 * alphaB13 * kt * fu * j.d * t) / gammaM2;
  const FbRd = Math.min(Fb18, Fb13);
  details.push(
    `F_b,Rd = min(EN 1993-1-8: ${fmt(nToKN(Fb18))} кН; EN 1993-1-3 п. 8.3.2: ${fmt(nToKN(Fb13))} кН) = ${fmt(
      nToKN(FbRd)
    )} кН при t = ${fmt(t)} мм`
  );

  // --- Растяжение и продавливание ---
  const FtRd = (0.9 * g.fub * dim.As) / gammaM2;
  const BpRd = (0.6 * Math.PI * dim.dm * t * fu) / gammaM2;
  details.push(`F_t,Rd = 0,9·fub·As/γM2 = ${fmt(nToKN(FtRd))} кН`);
  details.push(`B_p,Rd = 0,6·π·dm·tp·fu/γM2 = ${fmt(nToKN(BpRd))} кН`);

  return {
    FvRd,
    FbRd,
    FtRd,
    BpRd,
    governing: FbRd < FvRd ? "смятие листа" : "срез болта",
    alphaB: alphaB13,
    k1,
    kt,
    details,
  };
}

export interface JointCheckInput {
  joint: BoltJointInput;
  /** Сдвигающее усилие в узле, Н */
  shear: number;
  /** Растягивающее усилие в узле (отрыв), Н */
  tension: number;
  material: MaterialInput;
  combo: string;
}

export interface JointCheckResult {
  key: string;
  label: string;
  resistances: BoltResistances;
  items: UtilizationItem[];
  rows: CheckRow[];
  /** Потребное количество болтов в узле */
  requiredCount: number;
  providedCount: number;
  warnings: Warning[];
}

export function checkJoint(input: JointCheckInput): JointCheckResult {
  const { joint, material, combo } = input;
  const r = boltResistances(joint, material);
  const dim = boltDiameter(joint.d);
  const n = Math.max(1, joint.n);
  const label = JOINT_LABELS[joint.key];
  const warnings: Warning[] = [];
  const items: UtilizationItem[] = [];

  const FvEd = Math.abs(input.shear) / n;
  const FtEd = Math.abs(input.tension) / n;

  items.push({
    key: "bolt_shear",
    check: "Срез болта",
    Ed: nToKN(FvEd),
    Rd: nToKN(r.FvRd),
    unit: "кН",
    utilization: FvEd / r.FvRd,
    ref: "EN 1993-1-8, табл. 3.4",
    formula: "F_v,Rd = αv·fub·A/γM2",
    substitution: `${fmt(nToKN(FvEd))} / ${fmt(nToKN(r.FvRd))}`,
  });

  items.push({
    key: "bearing",
    check: "СМЯТИЕ ЛИСТА",
    Ed: nToKN(FvEd),
    Rd: nToKN(r.FbRd),
    unit: "кН",
    utilization: FvEd / r.FbRd,
    ref: "EN 1993-1-3, п. 8.3.2 / EN 1993-1-8, п. 3.6.1",
    formula: "F_b,Rd = k1·αb·fu·d·t/γM2",
    substitution: `${fmt(nToKN(FvEd))} / ${fmt(nToKN(r.FbRd))} (t = ${fmt(Math.min(joint.t1, joint.t2))} мм)`,
  });

  if (FtEd > 0) {
    items.push({
      key: "bolt_tension",
      check: "Растяжение болта",
      Ed: nToKN(FtEd),
      Rd: nToKN(r.FtRd),
      unit: "кН",
      utilization: FtEd / r.FtRd,
      ref: "EN 1993-1-8, табл. 3.4",
      formula: "F_t,Rd = 0,9·fub·As/γM2",
      substitution: `${fmt(nToKN(FtEd))} / ${fmt(nToKN(r.FtRd))}`,
    });
    items.push({
      key: "punching",
      check: "Продавливание головки/гайки",
      Ed: nToKN(FtEd),
      Rd: nToKN(r.BpRd),
      unit: "кН",
      utilization: FtEd / r.BpRd,
      ref: "EN 1993-1-8, табл. 3.4 (B_p,Rd)",
      formula: "B_p,Rd = 0,6·π·dm·tp·fu/γM2",
      substitution: `${fmt(nToKN(FtEd))} / ${fmt(nToKN(r.BpRd))}`,
    });
    const comb = FvEd / r.FvRd + FtEd / (1.4 * r.FtRd);
    items.push({
      key: "shear_tension",
      check: "Совместное действие среза и растяжения",
      Ed: comb,
      Rd: 1,
      unit: "—",
      utilization: comb,
      ref: "EN 1993-1-8, табл. 3.4",
      formula: "F_v,Ed/F_v,Rd + F_t,Ed/(1,4·F_t,Rd) ≤ 1",
      substitution: `${fmt(FvEd / r.FvRd)} + ${fmt(FtEd / (1.4 * r.FtRd))} = ${fmt(comb)}`,
    });
  }

  // --- Расстановка болтов (EN 1993-1-3, табл. 8.1) ---
  const minE = 1.2 * dim.d0;
  const minP = 3 * dim.d0;
  if (joint.e1 < minE) {
    warnings.push({
      severity: "error",
      scope: `Узел «${label}»`,
      message: `Расстояние до края вдоль усилия e1 = ${fmt(joint.e1)} мм меньше минимального 1,2·d0 = ${fmt(
        minE
      )} мм (EN 1993-1-3, табл. 8.1). Рекомендуется 1,5·d0.`,
    });
  }
  if (joint.e2 < minE) {
    warnings.push({
      severity: "error",
      scope: `Узел «${label}»`,
      message: `Расстояние до края поперёк усилия e2 = ${fmt(joint.e2)} мм меньше 1,2·d0 = ${fmt(minE)} мм.`,
    });
  }
  if (n > 1 && joint.p1 < minP) {
    warnings.push({
      severity: "warning",
      scope: `Узел «${label}»`,
      message: `Шаг болтов p1 = ${fmt(joint.p1)} мм меньше 3·d0 = ${fmt(minP)} мм (EN 1993-1-3, табл. 8.1).`,
    });
  }

  // Потребное количество болтов определяется наиболее нагруженным видом усилия:
  // сдвигом (срез либо смятие листа) или растяжением (болт либо продавливание).
  const shearCapacity = Math.min(r.FvRd, r.FbRd);
  const tensionCapacity = Math.min(r.FtRd, r.BpRd);
  const byShear = shearCapacity > 0 ? Math.ceil(Math.abs(input.shear) / shearCapacity) : n;
  const byTension = tensionCapacity > 0 ? Math.ceil(Math.abs(input.tension) / tensionCapacity) : n;
  const requiredCount = Math.max(1, byShear, byTension);

  const rows: CheckRow[] = items.map((it) => ({
    id: `${joint.key}-${it.key}`,
    member: label,
    role: "joint" as const,
    check: it.check,
    Ed: it.Ed,
    Rd: it.Rd,
    unit: it.unit,
    utilization: it.utilization,
    status: statusOf(it.utilization),
    combo,
    variant: "—",
    ref: it.ref,
    formula: it.formula,
    substitution: it.substitution,
  }));

  return {
    key: joint.key,
    label,
    resistances: r,
    items,
    rows,
    requiredCount,
    providedCount: n,
    warnings,
  };
}

/** Проверка зажимов панелей на отрыв при ветровом подъёме. */
export function checkPanelClamps(
  upliftForcePerPanel: number,
  clampsPerPanel: number,
  clampCapacityKN: number,
  combo: string
): CheckRow {
  const perClamp = clampsPerPanel > 0 ? Math.abs(upliftForcePerPanel) / clampsPerPanel : 0;
  const Rd = clampCapacityKN * 1000;
  const u = Rd > 0 ? perClamp / Rd : 0;
  return {
    id: "clamp-uplift",
    member: "Зажимы панелей",
    role: "joint",
    check: "Отрыв панели при ветровом подъёме",
    Ed: nToKN(perClamp),
    Rd: clampCapacityKN,
    unit: "кН",
    utilization: u,
    status: statusOf(u),
    combo,
    variant: "—",
    ref: "Паспортная несущая способность зажима (вводится пользователем)",
    formula: "F_зажим = F_отрыв,панель / n_зажимов",
    substitution: `${fmt(nToKN(Math.abs(upliftForcePerPanel)))} кН / ${clampsPerPanel} = ${fmt(nToKN(perClamp))} кН`,
  };
}

/** Справочный момент затяжки. */
export function tighteningTorque(d: number, grade: string): number | null {
  const v = boltData.tighteningTorque.values.find((x) => x.d === d && x.grade === grade);
  return v ? v.torque : null;
}
