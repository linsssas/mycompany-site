// PDF-отчёт на русском языке, формат А4 с рамкой и штампом.
//
// Встроенные шрифты jsPDF не содержат кириллицы, поэтому подключается подмножество
// DejaVu Sans (см. dejavuFont.ts).

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SolarResults } from "../run";
import { fmt } from "../units";
import { FOUNDATION_LABELS, MEMBER_ROLES, MEMBER_ROLE_LABELS } from "../types";
import { DEJAVU_SANS_BOLD_BASE64, DEJAVU_SANS_REGULAR_BASE64 } from "./dejavuFont";
import { region } from "../presets";

export const DISCLAIMER =
  "Расчёт является предварительным (инженерная оценка). Не заменяет проектную документацию и поверочный " +
  "расчёт в сертифицированном ПО. Итоговые значения подлежат проверке аттестованным инженером-конструктором " +
  "и привязке к актуальной редакции норм РК.";

const FONT = "DejaVuSans";
const MARGIN = 12;
const A4 = { w: 210, h: 297 };
const FRAME = { x: MARGIN, y: MARGIN, w: A4.w - 2 * MARGIN, h: A4.h - 2 * MARGIN - 22 };

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS("DejaVuSans.ttf", DEJAVU_SANS_REGULAR_BASE64);
  doc.addFont("DejaVuSans.ttf", FONT, "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", DEJAVU_SANS_BOLD_BASE64);
  doc.addFont("DejaVuSans-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

/** Рамка и штамп по каждому листу. */
function drawFrameAndStamp(doc: jsPDF, results: SolarResults, pageNo: number, pageCount: number) {
  doc.setDrawColor(60);
  doc.setLineWidth(0.5);
  doc.rect(FRAME.x, FRAME.y, FRAME.w, FRAME.h + 22);

  // Штамп
  const sh = 22;
  const sy = FRAME.y + FRAME.h;
  doc.setLineWidth(0.4);
  doc.rect(FRAME.x, sy, FRAME.w, sh);
  doc.line(FRAME.x + 120, sy, FRAME.x + 120, sy + sh);
  doc.line(FRAME.x, sy + 7, FRAME.x + FRAME.w, sy + 7);
  doc.line(FRAME.x, sy + 14, FRAME.x + 120, sy + 14);

  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.text(`Объект: ${results.project.meta.object || "—"}`, FRAME.x + 2, sy + 5);
  doc.text(`Проект: ${results.project.meta.name}`, FRAME.x + 2, sy + 12);
  doc.text(`Исполнитель: ${results.project.meta.author || "____________"}`, FRAME.x + 2, sy + 19);
  doc.text("Подпись: ____________", FRAME.x + 62, sy + 19);
  doc.text(`Дата: ${new Date().toLocaleDateString("ru-RU")}`, FRAME.x + 123, sy + 5);
  doc.text(
    `Расчёт: ${results.passes ? "ПРОХОДИТ" : "НЕ ПРОХОДИТ"}, Kmax = ${fmt(results.maxUtilization)}`,
    FRAME.x + 123,
    sy + 12
  );
  doc.text(`Лист ${pageNo} из ${pageCount}`, FRAME.x + 123, sy + 19);
}

interface Cursor {
  y: number;
}

function ensureSpace(doc: jsPDF, cur: Cursor, needed: number) {
  if (cur.y + needed > FRAME.y + FRAME.h - 6) {
    doc.addPage();
    cur.y = FRAME.y + 10;
  }
}

function heading(doc: jsPDF, cur: Cursor, text: string) {
  ensureSpace(doc, cur, 14);
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.text(text, FRAME.x + 3, cur.y);
  doc.setFont(FONT, "normal");
  cur.y += 5;
}

function paragraph(doc: jsPDF, cur: Cursor, text: string, size = 8) {
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, FRAME.w - 8);
  ensureSpace(doc, cur, lines.length * (size * 0.42) + 3);
  doc.text(lines, FRAME.x + 3, cur.y);
  cur.y += lines.length * (size * 0.42) + 3;
}

function table(doc: jsPDF, cur: Cursor, head: string[], body: (string | number)[][], widths?: Record<number, number>) {
  autoTable(doc, {
    startY: cur.y,
    head: [head],
    body: body.map((r) => r.map((c) => String(c))),
    margin: { left: FRAME.x + 2, right: FRAME.x + 2, bottom: 34 },
    styles: { font: FONT, fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak", lineColor: [180, 180, 180], lineWidth: 0.1 },
    headStyles: { font: FONT, fontStyle: "bold", fillColor: [30, 41, 59], textColor: 255, fontSize: 6.5 },
    columnStyles: widths ? Object.fromEntries(Object.entries(widths).map(([k, v]) => [k, { cellWidth: v }])) : undefined,
    theme: "grid",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cur.y = ((doc as any).lastAutoTable?.finalY ?? cur.y) + 5;
}

/** Формирование PDF-отчёта. Возвращает Blob для скачивания. */
export function buildPdf(results: SolarResults): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerFonts(doc);
  const p = results.project;
  const cur: Cursor = { y: FRAME.y + 12 };

  // ---------- Титул ----------
  doc.setFont(FONT, "bold");
  doc.setFontSize(14);
  doc.text("Расчёт снеговой и ветровой нагрузки", FRAME.x + 3, cur.y);
  cur.y += 6;
  doc.text("на опору солнечных панелей", FRAME.x + 3, cur.y);
  cur.y += 8;
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.text(p.meta.name, FRAME.x + 3, cur.y);
  cur.y += 8;

  paragraph(
    doc,
    cur,
    `Нормативная база: ${
      p.climate.norm === "SP_RK_EN"
        ? "СП РК EN 1991-1-3 / EN 1991-1-4, СП РК EN 1993-1-3, СП РК EN 1990"
        : p.climate.norm === "SP20"
          ? "СП 20.13330.2016, СП 260.1325800.2016"
          : "ручной ввод характеристических нагрузок"
    }. Регион: ${region(p.climate.regionKey).city}. Срок службы ${p.climate.serviceLifeYears} лет, период повторяемости ${
      p.climate.returnPeriodYears
    } лет.`
  );

  // ---------- Исходные данные ----------
  heading(doc, cur, "1. Исходные данные");
  table(
    doc,
    cur,
    ["Параметр", "Значение", "Ед."],
    [
      ["Угол наклона панелей α", fmt(results.geom.alphaDeg), "°"],
      ["Количество опорных рам", p.geometry.frameCount, "шт"],
      ["Шаг рам", fmt(p.geometry.framePitch), "мм"],
      ["Общая длина стола", fmt(results.geom.tableLength), "мм"],
      ["Горизонтальный разнос стоек", fmt(results.geom.postSpacing), "мм"],
      ["Высота верха задней / передней стойки", `${fmt(results.geom.rearTopHeight)} / ${fmt(results.geom.frontTopHeight)}`, "мм"],
      ["Высота нижней кромки панелей", fmt(results.geom.lowerEdgeHeight), "мм"],
      ["Длина балки / подпорки", `${fmt(results.geom.beamLength)} / ${fmt(results.geom.brace.length)}`, "мм"],
      ["Число линий прогонов", results.geom.purlins.length, "шт"],
      ["Панелей", `${results.geom.panelCount} (${results.geom.panelsPerRow} × ${results.geom.panelRows})`, "шт"],
      ["Габарит и масса панели", `${p.panel.length}×${p.panel.width}, ${p.panel.mass} кг`, ""],
      ["Сталь", `fy = ${p.material.fy} МПа, fu = ${p.material.fu} МПа, γc = ${p.material.gammaC}`, ""],
      ["Заглубление стойки", `${fmt(p.ground.embedDepth)} (${FOUNDATION_LABELS[p.ground.foundationType]})`, "мм"],
      ["Грунт", `φ = ${p.ground.phi}°, c = ${p.ground.c} кПа, γ = ${p.ground.gamma} кН/м³, R = ${p.ground.R} кПа`, ""],
      ["Глубина промерзания", fmt(p.ground.frostDepthM * 1000), "мм"],
    ],
    { 0: 70, 2: 14 }
  );

  heading(doc, cur, "2. Сечения элементов");
  table(
    doc,
    cur,
    ["Элемент", "Профиль", "A, см²", "Aeff, см²", "Ix, см⁴", "Wx, см³", "Weff, см³", "кг/м"],
    MEMBER_ROLES.map((role) => {
      const s = results.sections[role];
      return [
        MEMBER_ROLE_LABELS[role],
        p.sections[role].name,
        fmt(s.A / 100),
        fmt(s.effective.Aeff / 100),
        fmt(s.Iu / 1e4),
        fmt(s.Wu / 1000),
        fmt(Math.min(s.effective.WeffTop, s.effective.WeffBot) / 1000),
        fmt(s.massPerM),
      ];
    })
  );

  // ---------- Нагрузки ----------
  heading(doc, cur, "3. Нагрузки");
  table(
    doc,
    cur,
    ["Нагрузка", "Значение", "Ед.", "Примечание"],
    results.loadRows.map((r) => [r.name, r.value, r.unit, r.note]),
    { 0: 48, 1: 20, 2: 12 }
  );

  heading(doc, cur, "4. Формулы с подстановкой чисел");
  table(
    doc,
    cur,
    ["Обозначение", "Формула", "Подстановка", "Результат", "Пункт нормы"],
    results.formulas.map((f) => [f.symbol, f.formula, f.substitution, `${fmt(f.value)} ${f.unit}`, f.ref]),
    { 0: 18, 3: 22 }
  );

  // ---------- Сочетания ----------
  heading(doc, cur, "5. Сочетания нагрузок");
  table(
    doc,
    cur,
    ["Сочетание", "Тип", "Состав", "Пункт нормы"],
    results.combos.map((c) => [c.label, c.type, c.terms.map((t) => `${fmt(t.factor)}·${t.caseKey}`).join(" + "), c.ref]),
    { 0: 62 }
  );

  // ---------- Проверки ----------
  heading(doc, cur, "6. Проверки несущей способности");
  table(
    doc,
    cur,
    ["Элемент", "Проверка", "Ed", "Rd", "Ед.", "K", "Определяющее сочетание"],
    results.checks.map((c) => [
      c.member,
      c.check,
      fmt(c.Ed),
      fmt(c.Rd),
      c.unit,
      fmt(c.utilization),
      `${c.combo}${c.variant !== "—" ? ` (${c.variant})` : ""}`,
    ]),
    { 0: 26, 1: 40, 2: 14, 3: 14, 4: 10, 5: 12 }
  );

  heading(doc, cur, "7. Прогибы");
  const bestDefl = new Map<string, (typeof results.deflections)[number]>();
  for (const d of results.deflections) {
    const key = `${d.member}|${d.check}`;
    const prev = bestDefl.get(key);
    if (!prev || d.utilization > prev.utilization) bestDefl.set(key, d);
  }
  table(
    doc,
    cur,
    ["Элемент", "Проверка", "Факт, мм", "Предел, мм", "K"],
    [...bestDefl.values()].map((d) => [d.member, d.check, fmt(d.value), fmt(d.limit), fmt(d.utilization)]),
    { 0: 30, 2: 22, 3: 22, 4: 14 }
  );

  heading(doc, cur, "8. Болтовые узлы и метизы");
  table(
    doc,
    cur,
    ["Узел", "Проверка", "Ed, кН", "Rd, кН", "K"],
    results.joints.flatMap((j) => j.items.map((it) => [j.label, it.check, fmt(it.Ed), fmt(it.Rd), fmt(it.utilization)])),
    { 0: 40, 2: 18, 3: 18, 4: 14 }
  );
  table(
    doc,
    cur,
    ["Метизы", "Требуется", "По чертежу", "Использование, %"],
    results.fasteners.map((f) => [`М${f.d}`, f.required, f.drawing, fmt(f.utilization * 100)])
  );

  heading(doc, cur, "9. Стойка в грунте");
  table(
    doc,
    cur,
    ["Проверка", "Ed", "Rd", "Ед.", "K", "Метод"],
    results.foundationRear.rows.map((r) => [r.check, fmt(r.Ed), fmt(r.Rd), r.unit, fmt(r.utilization), r.ref]),
    { 0: 44, 5: 50 }
  );
  paragraph(
    doc,
    cur,
    `Потребное заглубление по расчёту: ${fmt(results.foundationRear.requiredDepth)} мм (задано ${fmt(
      p.ground.embedDepth
    )} мм). Запас на выдёргивание: ${
      isFinite(results.foundationRear.upliftSafety) ? fmt(results.foundationRear.upliftSafety) : "—"
    } при требуемом ${p.ground.upliftSafetyFactor}.`
  );

  heading(doc, cur, "10. Спецификация металла");
  table(
    doc,
    cur,
    ["Поз.", "Наименование", "Профиль", "Длина, мм", "Кол.", "Масса, кг"],
    results.bom.items.map((i) => [i.pos, i.name, i.profile, fmt(i.length), i.count, fmt(i.massTotal)]),
    { 0: 10, 1: 44, 2: 40 }
  );
  paragraph(
    doc,
    cur,
    `Итого металл ${fmt(results.bom.steelMassWithFasteners)} кг; панели ${fmt(results.bom.panelMass)} кг; всего ${fmt(
      results.bom.totalMass / 1000
    )} т. Расход металла ${fmt(results.bom.massPerKW)} кг/кВт, ${fmt(results.bom.massPerM2)} кг/м². Мощность стола ${fmt(
      results.bom.powerKW
    )} кВт.`
  );

  // ---------- Выводы ----------
  heading(doc, cur, "11. Выводы");
  paragraph(
    doc,
    cur,
    results.passes
      ? `Несущая способность конструкции обеспечена. Максимальный коэффициент использования K = ${fmt(
          results.maxUtilization
        )} (${results.governing?.member ?? ""}, ${results.governing?.check.toLowerCase() ?? ""}).`
      : `Несущая способность НЕ обеспечена. Максимальный коэффициент использования K = ${fmt(
          results.maxUtilization
        )} — определяет: ${results.governing?.member ?? ""}, ${results.governing?.check.toLowerCase() ?? ""}, сочетание ${
          results.governing?.combo ?? ""
        }.`
  );
  paragraph(doc, cur, results.thermal.note);
  if (results.diagnostics.length > 0) {
    paragraph(doc, cur, "Что могло быть принято иначе в исходном проекте:");
    for (const d of results.diagnostics) paragraph(doc, cur, `— ${d}`, 7.5);
  }

  const errors = results.warnings.filter((w) => w.severity !== "info");
  if (errors.length > 0) {
    heading(doc, cur, "12. Предупреждения");
    for (const w of errors) paragraph(doc, cur, `— ${w.scope}: ${w.message}`, 7.5);
  }

  heading(doc, cur, "Оговорка");
  paragraph(doc, cur, DISCLAIMER, 7.5);

  // ---------- Рамки и штампы на всех листах ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFrameAndStamp(doc, results, i, pageCount);
  }

  return doc.output("blob");
}
