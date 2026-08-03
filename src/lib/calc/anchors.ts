export interface BoltGrade {
  key: string;
  label: string;
  fyb: number; // МПа
  fub: number; // МПа
}

export const BOLT_GRADES: BoltGrade[] = [
  { key: "4.6", label: "4.6", fyb: 240, fub: 400 },
  { key: "5.6", label: "5.6", fyb: 300, fub: 500 },
  { key: "8.8", label: "8.8", fyb: 640, fub: 800 },
];

export const BOLT_DIAMETERS: { d: number; As: number }[] = [
  { d: 12, As: 84.3 },
  { d: 16, As: 157 },
  { d: 20, As: 245 },
  { d: 24, As: 353 },
  { d: 30, As: 561 },
  { d: 36, As: 817 },
];

const GAMMA_M2 = 1.25;

export interface AnchorCheckResult {
  N: number; // кН, осевая (растяжение +)
  M: number; // кН·м, момент у базы стойки
  V: number; // кН, поперечная
  boltGrade: BoltGrade;
  boltCount: number;
  leverArmM: number;
  tensionPerBoltKN: number;
  shearPerBoltKN: number;
  recommendedDiameter: number;
  tensionUtilization: number;
  shearUtilization: number;
  combinedUtilization: number;
  formulas: string[];
}

export function calcAnchorCheck(
  N: number,
  M: number,
  V: number,
  basePlateWidthM: number,
  boltGrade: BoltGrade = BOLT_GRADES[2],
  boltCount = 4
): AnchorCheckResult {
  const leverArmM = basePlateWidthM * 0.8;
  const tensionBolts = Math.max(1, Math.floor(boltCount / 2));
  const uplift = Math.max(0, -N); // N<0 = растяжение (отрыв)
  const tensionPerBoltKN = uplift / boltCount + (leverArmM > 0 ? M / (tensionBolts * leverArmM) : 0);
  const shearPerBoltKN = Math.abs(V) / boltCount;

  let chosen = BOLT_DIAMETERS[BOLT_DIAMETERS.length - 1];
  let tensionUtilization = 0;
  let shearUtilization = 0;
  let combinedUtilization = 0;

  for (const bd of BOLT_DIAMETERS) {
    const NtRd = (0.9 * boltGrade.fub * bd.As) / GAMMA_M2 / 1000; // кН
    const NvRd = (0.6 * boltGrade.fub * bd.As) / GAMMA_M2 / 1000; // кН
    const tU = NtRd > 0 ? tensionPerBoltKN / NtRd : 0;
    const sU = NvRd > 0 ? shearPerBoltKN / NvRd : 0;
    const combined = sU / 1.4 + tU;
    if (combined <= 1) {
      chosen = bd;
      tensionUtilization = tU;
      shearUtilization = sU;
      combinedUtilization = combined;
      break;
    }
    chosen = bd;
    tensionUtilization = tU;
    shearUtilization = sU;
    combinedUtilization = combined;
  }

  return {
    N,
    M,
    V,
    boltGrade,
    boltCount,
    leverArmM,
    tensionPerBoltKN,
    shearPerBoltKN,
    recommendedDiameter: chosen.d,
    tensionUtilization,
    shearUtilization,
    combinedUtilization,
    formulas: [
      "Ft = N_отрыв/n + M/(n_раст · a) — растяжение на болт, a — плечо пары сил",
      "Fv = V/n — срез на болт",
      "Nt,Rd = 0.9·fub·As/γM2 — расчетное сопротивление болта растяжению",
      "Nv,Rd = 0.6·fub·As/γM2 — расчетное сопротивление болта срезу",
      "Fv/Fv,Rd/1.4 + Ft/Nt,Rd ≤ 1 — проверка на совместное действие среза и растяжения",
    ],
  };
}
