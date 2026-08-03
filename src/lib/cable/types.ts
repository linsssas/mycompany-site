export interface CableRow {
  id: string;
  /** Маркировка кабеля по схеме, напр. "гр.1", "W1" */
  marking: string;
  /** Начало трассы (откуда) */
  from: string;
  /** Конец трассы (куда) */
  to: string;
  /** Марка кабеля, напр. "ВВГнг(А)-LS" */
  brand: string;
  /** Число и сечение жил, напр. "3×2,5" */
  section: string;
  /** Длина, м */
  lengthM: number;
  /** Способ прокладки */
  layingMethod: string;
  note: string;
}

export interface CableJournalProject {
  projectName: string;
  /** Запас длины при подсчете спецификации, % */
  reservePercent: number;
  rows: CableRow[];
}

/** Свод кабелей: суммарные длины по марке и сечению */
export interface CableSummaryItem {
  brand: string;
  section: string;
  count: number;
  totalLengthM: number;
  /** Длина с учетом запаса, м */
  totalWithReserveM: number;
}

export function summarizeCables(rows: CableRow[], reservePercent: number): CableSummaryItem[] {
  const map = new Map<string, CableSummaryItem>();
  for (const row of rows) {
    const brand = row.brand.trim();
    const section = row.section.trim();
    if (!brand && !section) continue;
    const key = `${brand}|${section}`;
    const item = map.get(key) ?? { brand, section, count: 0, totalLengthM: 0, totalWithReserveM: 0 };
    item.count += 1;
    item.totalLengthM += row.lengthM > 0 ? row.lengthM : 0;
    map.set(key, item);
  }
  const factor = 1 + reservePercent / 100;
  return [...map.values()]
    .map((i) => ({ ...i, totalWithReserveM: Math.ceil(i.totalLengthM * factor) }))
    .sort((a, b) => a.brand.localeCompare(b.brand, "ru") || a.section.localeCompare(b.section, "ru"));
}

export function createEmptyRow(): CableRow {
  return {
    id: crypto.randomUUID(),
    marking: "",
    from: "",
    to: "",
    brand: "",
    section: "",
    lengthM: 0,
    layingMethod: "",
    note: "",
  };
}
