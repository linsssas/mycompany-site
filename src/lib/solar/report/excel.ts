// Экспорт результатов расчёта в Excel (.xlsx).
// Листы: Исходные данные, Нагрузки, Сочетания, Проверки, Спецификация.

import ExcelJS from "exceljs";
import { SolarResults } from "../run";
import { fmt } from "../units";
import { FOUNDATION_LABELS, MEMBER_ROLES, MEMBER_ROLE_LABELS } from "../types";
import { region, soil } from "../presets";

const HEADER_FILL = "FF1E293B";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 28;
}

function autoWidth(sheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

export async function buildWorkbook(results: SolarResults): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Калькулятор опор солнечных панелей";
  wb.created = new Date();

  const p = results.project;

  // ---------------- Исходные данные ----------------
  const s1 = wb.addWorksheet("Исходные данные");
  styleHeader(s1.addRow(["Параметр", "Значение", "Ед."]));
  const add = (a: string, b: string | number, c = "") => s1.addRow([a, b, c]);
  add("Проект", p.meta.name);
  add("Объект", p.meta.object);
  add("Исполнитель", p.meta.author);
  add("Дата", new Date().toLocaleDateString("ru-RU"));
  s1.addRow([]);
  add("Угол наклона панелей", Number(results.geom.alphaDeg.toFixed(2)), "°");
  add("Количество рам", p.geometry.frameCount, "шт");
  add("Шаг рам", p.geometry.framePitch, "мм");
  add("Общая длина стола", Math.round(results.geom.tableLength), "мм");
  add("Разнос осей стоек", Math.round(results.geom.postSpacing), "мм");
  add("Высота верха задней стойки", Math.round(results.geom.rearTopHeight), "мм");
  add("Высота верха передней стойки", Math.round(results.geom.frontTopHeight), "мм");
  add("Высота нижней кромки панелей", Math.round(results.geom.lowerEdgeHeight), "мм");
  add("Длина балки", Math.round(results.geom.beamLength), "мм");
  add("Длина подпорки", Math.round(results.geom.brace.length), "мм");
  add("Число линий прогонов", results.geom.purlins.length, "шт");
  add("Панелей", results.geom.panelCount, "шт");
  add("Габарит панели", `${p.panel.length} × ${p.panel.width}`, "мм");
  add("Масса панели", p.panel.mass, "кг");
  add("Мощность панели", p.panel.powerW, "Вт");
  s1.addRow([]);
  add("Предел текучести fy", p.material.fy, "МПа");
  add("Предел прочности fu", p.material.fu, "МПа");
  add("γc / γM0 / γM1 / γM2", `${p.material.gammaC} / ${p.material.gammaM0} / ${p.material.gammaM1} / ${p.material.gammaM2}`);
  s1.addRow([]);
  for (const role of MEMBER_ROLES) {
    const d = p.sections[role];
    add(MEMBER_ROLE_LABELS[role], `${d.name} (${d.shape} ${d.h}×${d.b}×${d.c}, t=${d.t})`);
  }
  s1.addRow([]);
  add("Норма расчёта", p.climate.norm);
  add("Регион", `${region(p.climate.regionKey).city} (${region(p.climate.regionKey).region})`);
  add("Снеговая нагрузка на грунт sk", Number(results.snow.sk.toFixed(3)), "кПа");
  add("Базовая скорость ветра vb", Number(results.wind.vb.toFixed(2)), "м/с");
  add("Категория местности", p.climate.terrain);
  add("Высота над уровнем моря", p.climate.altitude, "м");
  add("Ce / Ct", `${p.climate.Ce} / ${p.climate.Ct}`);
  s1.addRow([]);
  add("Тип фундамента", FOUNDATION_LABELS[p.ground.foundationType]);
  add("Заглубление", p.ground.embedDepth, "мм");
  add("Грунт", soil(p.ground.soilKey).name);
  add("φ / c / γ / R", `${p.ground.phi}° / ${p.ground.c} кПа / ${p.ground.gamma} кН/м³ / ${p.ground.R} кПа`);
  add("Глубина промерзания", p.ground.frostDepthM, "м");
  autoWidth(s1, [42, 34, 10]);

  // ---------------- Нагрузки ----------------
  const s2 = wb.addWorksheet("Нагрузки");
  styleHeader(s2.addRow(["Нагрузка", "Значение", "Ед.", "Примечание"]));
  for (const r of results.loadRows) s2.addRow([r.name, r.value, r.unit, r.note]);
  s2.addRow([]);
  styleHeader(s2.addRow(["Обозначение", "Формула", "Подстановка", "Результат", "Ед.", "Пункт нормы"]));
  for (const f of results.formulas) {
    s2.addRow([f.symbol, f.formula, f.substitution, Number(f.value.toFixed(4)), f.unit, f.ref]);
  }
  autoWidth(s2, [34, 34, 40, 14, 8, 46]);

  // ---------------- Сочетания ----------------
  const s3 = wb.addWorksheet("Сочетания");
  styleHeader(s3.addRow(["Сочетание", "Тип", "Ведущее воздействие", "Состав", "Пункт нормы"]));
  for (const c of results.combos) {
    s3.addRow([c.label, c.type, c.leading, c.terms.map((t) => `${fmt(t.factor)}·${t.caseKey}`).join(" + "), c.ref]);
  }
  autoWidth(s3, [52, 14, 18, 40, 46]);

  // ---------------- Проверки ----------------
  const s4 = wb.addWorksheet("Проверки");
  styleHeader(s4.addRow(["Элемент", "Проверка", "Ed", "Rd", "Ед.", "K", "Статус", "Определяющее сочетание", "Пункт нормы"]));
  for (const c of results.checks) {
    const row = s4.addRow([
      c.member,
      c.check,
      Number(c.Ed.toFixed(3)),
      Number(c.Rd.toFixed(3)),
      c.unit,
      Number(c.utilization.toFixed(3)),
      c.status === "green" ? "ОК" : c.status === "yellow" ? "близко к пределу" : "НЕ ПРОХОДИТ",
      `${c.combo}${c.variant !== "—" ? ` (${c.variant})` : ""}`,
      c.ref,
    ]);
    const fill =
      c.status === "green" ? "FFDCFCE7" : c.status === "yellow" ? "FFFEF9C3" : "FFFEE2E2";
    row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  }
  s4.addRow([]);
  styleHeader(s4.addRow(["Прогибы", "Проверка", "Факт, мм", "Предел, мм", "K", "Сочетание"]));
  const bestDefl = new Map<string, (typeof results.deflections)[number]>();
  for (const d of results.deflections) {
    const key = `${d.member}|${d.check}`;
    const prev = bestDefl.get(key);
    if (!prev || d.utilization > prev.utilization) bestDefl.set(key, d);
  }
  for (const d of bestDefl.values()) {
    s4.addRow([d.member, d.check, Number(d.value.toFixed(2)), Number(d.limit.toFixed(2)), Number(d.utilization.toFixed(3)), d.combo]);
  }
  s4.addRow([]);
  styleHeader(s4.addRow(["Узел", "Проверка", "Ed, кН", "Rd, кН", "K", "Пункт нормы"]));
  for (const j of results.joints) {
    for (const it of j.items) {
      s4.addRow([j.label, it.check, Number(it.Ed.toFixed(3)), Number(it.Rd.toFixed(3)), Number(it.utilization.toFixed(3)), it.ref]);
    }
  }
  autoWidth(s4, [26, 40, 12, 12, 8, 10, 18, 52, 50]);

  // ---------------- Спецификация ----------------
  const s5 = wb.addWorksheet("Спецификация");
  styleHeader(s5.addRow(["Поз.", "Зона", "Наименование", "Профиль", "Длина, мм", "Кол.", "кг/м", "Масса, кг", "Покрытие", "Примечание"]));
  for (const i of results.bom.items) {
    s5.addRow([i.pos, i.zone, i.name, i.profile, Math.round(i.length), i.count, Number(i.massPerM.toFixed(3)), Number(i.massTotal.toFixed(1)), i.coating, i.note]);
  }
  const total = s5.addRow(["", "", "ИТОГО металл", "", "", "", "", Number(results.bom.steelMassWithFasteners.toFixed(1)), "", ""]);
  total.font = { bold: true };
  s5.addRow([]);
  s5.addRow(["Металл на 1 кВт", Number(results.bom.massPerKW.toFixed(2)), "кг/кВт"]);
  s5.addRow(["Металл на 1 м²", Number(results.bom.massPerM2.toFixed(2)), "кг/м²"]);
  s5.addRow(["Стоимость металла", Number(results.bom.steelCost.toFixed(0)), p.economics.currency]);
  s5.addRow(["Мощность стола", Number(results.bom.powerKW.toFixed(2)), "кВт"]);
  s5.addRow([]);
  styleHeader(s5.addRow(["Метизы", "Требуется", "По чертежу", "Использование, %"]));
  for (const f of results.fasteners) {
    s5.addRow([`М${f.d}`, f.required, f.drawing, Number((f.utilization * 100).toFixed(1))]);
  }
  autoWidth(s5, [8, 14, 34, 26, 12, 8, 10, 12, 12, 30]);

  // ---------------- Усилия ----------------
  const s6 = wb.addWorksheet("Реакции");
  styleHeader(s6.addRow(["Сочетание", "V задняя, кН", "H задняя, кН", "V передняя, кН", "H передняя, кН"]));
  for (const r of results.reactions) {
    s6.addRow([r.combo, Number(r.rearV.toFixed(2)), Number(r.rearH.toFixed(2)), Number(r.frontV.toFixed(2)), Number(r.frontH.toFixed(2))]);
  }
  autoWidth(s6, [56, 16, 16, 16, 16]);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
