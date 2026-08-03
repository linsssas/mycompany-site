import { CableJournalProject, summarizeCables } from "./types";

const JOURNAL_HEADERS = [
  "№ п/п",
  "Маркировка кабеля",
  "Начало (откуда)",
  "Конец (куда)",
  "Марка кабеля, провода",
  "Число и сечение жил",
  "Длина, м",
  "Способ прокладки",
  "Примечание",
];

const SUMMARY_HEADERS = ["Марка кабеля, провода", "Число и сечение жил", "Линий, шт", "Длина, м", `Длина с запасом, м`];

const THIN_BORDER = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
} as const;

export async function exportJournalXlsx(project: CableJournalProject): Promise<void> {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();

  const journal = wb.addWorksheet("Кабельный журнал");
  journal.columns = [
    { width: 7 },
    { width: 18 },
    { width: 28 },
    { width: 28 },
    { width: 22 },
    { width: 16 },
    { width: 10 },
    { width: 22 },
    { width: 24 },
  ];
  const title = journal.addRow([`Кабельный журнал — ${project.projectName}`]);
  title.font = { bold: true, size: 14 };
  journal.mergeCells(1, 1, 1, JOURNAL_HEADERS.length);
  journal.addRow([]);

  const head = journal.addRow(JOURNAL_HEADERS);
  head.font = { bold: true };
  head.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  head.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });

  project.rows.forEach((row, i) => {
    const r = journal.addRow([
      i + 1,
      row.marking,
      row.from,
      row.to,
      row.brand,
      row.section,
      row.lengthM > 0 ? row.lengthM : "",
      row.layingMethod,
      row.note,
    ]);
    r.alignment = { vertical: "top", wrapText: true };
    r.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col <= JOURNAL_HEADERS.length) cell.border = THIN_BORDER;
    });
  });

  const summary = wb.addWorksheet("Спецификация кабелей");
  summary.columns = [{ width: 26 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 18 }];
  const sTitle = summary.addRow([`Спецификация кабелей (запас ${project.reservePercent}%)`]);
  sTitle.font = { bold: true, size: 14 };
  summary.mergeCells(1, 1, 1, SUMMARY_HEADERS.length);
  summary.addRow([]);

  const sHead = summary.addRow(SUMMARY_HEADERS);
  sHead.font = { bold: true };
  sHead.alignment = { horizontal: "center", wrapText: true };
  sHead.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });

  for (const item of summarizeCables(project.rows, project.reservePercent)) {
    const r = summary.addRow([item.brand, item.section, item.count, item.totalLengthM, item.totalWithReserveM]);
    r.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col <= SUMMARY_HEADERS.length) cell.border = THIN_BORDER;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${safeFileName(project.projectName)}-кабельный-журнал.xlsx`,
  );
}

export function exportJournalCsv(project: CableJournalProject): void {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [
    JOURNAL_HEADERS.join(";"),
    ...project.rows.map((row, i) =>
      [i + 1, row.marking, row.from, row.to, row.brand, row.section, row.lengthM > 0 ? row.lengthM : "", row.layingMethod, row.note]
        .map(escape)
        .join(";"),
    ),
  ];
  // BOM, чтобы Excel корректно открывал кириллицу в CSV
  downloadBlob(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${safeFileName(project.projectName)}-кабельный-журнал.csv`);
}

function safeFileName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "проект";
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
