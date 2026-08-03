import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CalculationResults } from "@/lib/calc/runCalculation";
import { GeometryInput, PanelInput, ProjectSettings, LocationInput, ElementRole } from "@/lib/calc/types";
import { COMBO_LABELS, ComboKey } from "@/lib/calc/combinations";

const ROLE_LABELS: Record<ElementRole, string> = {
  post: "Стойка",
  beam: "Балка",
  purlin: "Прогон",
  brace: "Подкос",
  diagonal: "Связь",
};

interface ReportInput {
  projectName: string;
  geometry: GeometryInput;
  panel: PanelInput;
  location: LocationInput;
  settings: ProjectSettings;
  results: CalculationResults;
}

function cursorY(doc: jsPDF): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? 20;
}

export function generatePdfReport(input: ReportInput): void {
  const { projectName, geometry, panel, location, settings, results } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 14;
  let y = 16;

  doc.setFontSize(16);
  doc.text("Отчет по расчету металлоконструкций опор СЭС", marginX, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Проект: ${projectName}`, marginX, y);
  y += 5;
  doc.text(`Дата: ${new Date().toLocaleDateString("ru-RU")}`, marginX, y);
  y += 5;
  doc.text(`Местоположение: ${location.country}, ${location.region}, ${location.city}`, marginX, y);
  y += 5;
  doc.text(`Нормативная база: ${settings.norm} · Категория ответственности: ${settings.responsibilityCategory} · Срок службы: ${settings.serviceLife} лет`, marginX, y);
  y += 3;

  autoTable(doc, {
    startY: y + 3,
    head: [["Исходные данные геометрии", "Значение, мм/°/шт"]],
    body: [
      ["Общая длина", geometry.totalLength],
      ["Общая ширина", geometry.totalWidth],
      ["Общая высота", geometry.totalHeight],
      ["Высота передней стойки", geometry.frontPostHeight],
      ["Высота задней стойки", geometry.rearPostHeight],
      ["Угол наклона панелей", geometry.tiltAngle],
      ["Количество пролетов", geometry.spanCount],
      ["Шаг между стойками", geometry.postPitch],
      ["Количество стоек", geometry.postCount],
      ["Количество рядов панелей", geometry.panelRowCount],
      ["Панелей в ряду", geometry.panelsPerRow],
    ].map((r) => r.map(String)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Солнечные панели", "Значение"]],
    body: [
      ["Размер (Д×Ш×Т), мм", `${panel.length} × ${panel.width} × ${panel.thickness}`],
      ["Вес панели, кг", panel.weight],
      ["Ориентация", panel.orientation === "portrait" ? "Портрет" : "Альбом"],
      ["Общая площадь, м²", results.panelsDerived.totalAreaM2.toFixed(2)],
      ["Общий вес, кг", results.panelsDerived.totalWeightKg.toFixed(1)],
      ["Центр тяжести (X,Y,Z), мм", `${results.panelsDerived.centerOfGravity.x.toFixed(0)}, ${results.panelsDerived.centerOfGravity.y.toFixed(0)}, ${results.panelsDerived.centerOfGravity.z.toFixed(0)}`],
    ].map((r) => r.map(String)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Принятые нормативы района строительства", "Значение"]],
    body: [
      ["Снеговой район", results.climate.snowRegion],
      ["Ветровой район", results.climate.windRegion],
      ["S0, кПа", results.climate.s0.toFixed(2)],
      ["W0, кПа", results.climate.w0.toFixed(2)],
      ["Категория местности", results.climate.terrainCategory],
    ].map((r) => r.map(String)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Снеговая нагрузка", "Значение"]],
    body: [
      ["μ — коэффициент формы", results.snow.mu.toFixed(2)],
      ["Ce — коэффициент сноса", results.snow.ce.toFixed(2)],
      ["γf", results.snow.gammaF.toFixed(2)],
      ["Sg — нормативная, кПа", results.snow.sg.toFixed(2)],
      ["Sd — расчетная, кПа", results.snow.sd.toFixed(2)],
      ["Нагрузка на прогон, кН/м", results.snow.purlinLineLoad.toFixed(2)],
      ["Нагрузка на балку, кН/м", results.snow.beamLineLoad.toFixed(2)],
      ["Нагрузка на стойку, кН", results.snow.postForce.toFixed(2)],
      ...results.snow.formulas.map((f) => ["Формула", f]),
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Ветровая нагрузка", "Давление, кПа", "Отсос, кПа", "Fh, кН", "Fv, кН", "M опрок., кН·м"]],
    body: results.wind.directions.map((d) => [
      d.label + (d.direction === results.wind.worst.direction ? " (опасное)" : ""),
      d.pressure.toFixed(2),
      d.suction.toFixed(2),
      d.horizontalForce.toFixed(2),
      d.verticalForce.toFixed(2),
      d.overturningMoment.toFixed(2),
    ]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Собственный вес", "Масса, кг"]],
    body: [
      ...(Object.keys(results.selfWeight.steelByRole) as ElementRole[]).map((r) => [ROLE_LABELS[r], results.selfWeight.steelByRole[r].toFixed(1)]),
      ["Крепеж", results.selfWeight.fastenersTotal.toFixed(1)],
      ["Панели", results.selfWeight.panelsTotal.toFixed(1)],
      ["ИТОГО", results.selfWeight.grandTotal.toFixed(1)],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Комбинации нагрузок (стойка передняя)", "N, кН", "M, кН·м", "V, кН"]],
    body: (() => {
      const c = results.combos.find((x) => x.id === "post-front-typ")!;
      return (Object.keys(COMBO_LABELS) as ComboKey[]).map((k) => [
        COMBO_LABELS[k] + (k === c.governing ? " ← наиболее опасная" : ""),
        c.combos[k].N.toFixed(2),
        c.combos[k].M.toFixed(2),
        c.combos[k].V.toFixed(2),
      ]);
    })(),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Элемент", "Сечение", "N, кН", "M, кН·м", "Прочность", "Устойчивость", "Использование"]],
    body: results.checkedElements.map((el) => [
      el.label,
      el.section.name,
      el.N.toFixed(1),
      el.M.toFixed(2),
      `${(el.strengthUtilization * 100).toFixed(0)}%`,
      `${(el.bucklingUtilization * 100).toFixed(0)}%`,
      `${(el.overallUtilization * 100).toFixed(0)}% (${el.color === "green" ? "ОК" : el.color === "yellow" ? "внимание" : "не проходит"})`,
    ]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Анкеры", "Растяжение/болт, кН", "Срез/болт, кН", "Рек. диаметр", "Использование"]],
    body: [
      ["Передняя стойка", results.anchorFront.tensionPerBoltKN.toFixed(2), results.anchorFront.shearPerBoltKN.toFixed(2), `M${results.anchorFront.recommendedDiameter}`, `${(results.anchorFront.combinedUtilization * 100).toFixed(0)}%`],
      ["Задняя стойка", results.anchorRear.tensionPerBoltKN.toFixed(2), results.anchorRear.shearPerBoltKN.toFixed(2), `M${results.anchorRear.recommendedDiameter}`, `${(results.anchorRear.combinedUtilization * 100).toFixed(0)}%`],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  autoTable(doc, {
    startY: cursorY(doc) + 6,
    head: [["Фундамент", "Размер, м", "Глубина, м", "σmax, кПа", "k опрок.", "k сдвиг", "Тип"]],
    body: [
      ["Передняя стойка", `${results.foundationFront.widthM.toFixed(2)}×${results.foundationFront.lengthM.toFixed(2)}`, results.foundationFront.depthM.toFixed(2), results.foundationFront.bearingPressureMax.toFixed(1), results.foundationFront.overturningFactor.toFixed(2), results.foundationFront.slidingFactor.toFixed(2), results.foundationFront.recommendedType],
      ["Задняя стойка", `${results.foundationRear.widthM.toFixed(2)}×${results.foundationRear.lengthM.toFixed(2)}`, results.foundationRear.depthM.toFixed(2), results.foundationRear.bearingPressureMax.toFixed(1), results.foundationRear.overturningFactor.toFixed(2), results.foundationRear.slidingFactor.toFixed(2), results.foundationRear.recommendedType],
    ],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  const finalY = cursorY(doc) + 10;
  doc.setFontSize(11);
  doc.text("Заключение", marginX, finalY);
  doc.setFontSize(9);
  const conclusion =
    results.overallColor === "green"
      ? "Принятые сечения элементов конструкции удовлетворяют требованиям прочности, устойчивости и деформативности при рассмотренных сочетаниях нагрузок (максимальный коэффициент использования < 70%)."
      : results.overallColor === "yellow"
      ? "Конструкция в целом удовлетворяет требованиям, однако отдельные элементы имеют высокий коэффициент использования (70–90%) — рекомендуется дополнительная проверка на стадии рабочего проектирования."
      : "Обнаружены элементы с коэффициентом использования более 90% — требуется усиление сечений или изменение конструктивной схемы перед выпуском рабочей документации.";
  const lines = doc.splitTextToSize(conclusion, 180);
  doc.text(lines, marginX, finalY + 6);

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    doc.splitTextToSize(
      "Расчет выполнен по упрощенной инженерной методике (грузовые площади, аналог СП РК/СНиП 2.01.07-85*, EN1993) для целей предварительного подбора сечений. Значения климатических районов приведены справочно. Перед выпуском рабочей документации требуется верификация квалифицированным инженером-конструктором.",
      180
    ),
    marginX,
    finalY + 6 + lines.length * 4 + 4
  );

  doc.save(`${projectName.replace(/[^a-zA-Zа-яА-Я0-9]+/g, "_")}_report.pdf`);
}
