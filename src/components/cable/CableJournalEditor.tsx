"use client";

import { useState, useSyncExternalStore } from "react";
import { useCableJournalStore } from "@/store/useCableJournalStore";
import { summarizeCables } from "@/lib/cable/types";
import { exportJournalXlsx, exportJournalCsv } from "@/lib/cable/exportXlsx";
import { CABLE_BRANDS, CABLE_SECTIONS, LAYING_METHODS } from "@/lib/cable/reference";
import Card from "@/components/Card";

const CELL =
  "w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500";
const BTN =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
const BTN_PRIMARY =
  "rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";
const ICON_BTN =
  "rounded px-1.5 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

const subscribeNoop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

export default function CableJournalEditor() {
  const store = useCableJournalStore();
  // Состояние берется из localStorage, поэтому таблица рендерится только после гидратации
  const mounted = useSyncExternalStore(subscribeNoop, getTrue, getFalse);
  const [exporting, setExporting] = useState(false);

  if (!mounted) {
    return <p className="py-10 text-center text-sm text-zinc-500">Загрузка проекта…</p>;
  }

  const summary = summarizeCables(store.rows, store.reservePercent);
  const totalLength = store.rows.reduce((acc, r) => acc + (r.lengthM > 0 ? r.lengthM : 0), 0);

  const handleXlsx = async () => {
    setExporting(true);
    try {
      await exportJournalXlsx(store);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <datalist id="cable-brands">
        {CABLE_BRANDS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="cable-sections">
        {CABLE_SECTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="laying-methods">
        {LAYING_METHODS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            Название проекта
            <input
              className={CELL}
              value={store.projectName}
              onChange={(e) => store.setProjectName(e.target.value)}
            />
          </label>
          <label className="flex w-36 flex-col gap-1 text-xs font-medium text-zinc-500">
            Запас длины, %
            <input
              type="number"
              min={0}
              max={50}
              className={CELL}
              value={store.reservePercent}
              onChange={(e) => store.setReservePercent(Number(e.target.value))}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={BTN_PRIMARY} onClick={handleXlsx} disabled={exporting}>
              {exporting ? "Формируется…" : "Скачать Excel (XLSX)"}
            </button>
            <button className={BTN} onClick={() => exportJournalCsv(store)}>
              CSV
            </button>
            <button
              className={BTN}
              onClick={() => {
                if (confirm("Очистить журнал? Все строки будут удалены.")) store.resetProject();
              }}
            >
              Очистить
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Проект автоматически сохраняется в вашем браузере. Excel-файл содержит два листа: кабельный журнал и
          спецификацию кабелей.
        </p>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-zinc-500">
                <th className="w-10 px-1 pb-2">№</th>
                <th className="w-32 px-1 pb-2">Маркировка</th>
                <th className="px-1 pb-2">Начало (откуда)</th>
                <th className="px-1 pb-2">Конец (куда)</th>
                <th className="w-44 px-1 pb-2">Марка кабеля</th>
                <th className="w-28 px-1 pb-2">Жилы, сечение</th>
                <th className="w-20 px-1 pb-2">Длина, м</th>
                <th className="w-44 px-1 pb-2">Способ прокладки</th>
                <th className="w-36 px-1 pb-2">Примечание</th>
                <th className="w-24 pb-2" />
              </tr>
            </thead>
            <tbody>
              {store.rows.map((row, i) => (
                <tr key={row.id} className="align-top">
                  <td className="px-1 py-1 pt-2.5 text-xs text-zinc-500">{i + 1}</td>
                  <td className="px-1 py-1">
                    <input
                      className={CELL}
                      value={row.marking}
                      placeholder="гр.1"
                      onChange={(e) => store.updateRow(row.id, { marking: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={CELL}
                      value={row.from}
                      placeholder="ЩР-1"
                      onChange={(e) => store.updateRow(row.id, { from: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={CELL}
                      value={row.to}
                      placeholder="Розеточная группа пом. 101"
                      onChange={(e) => store.updateRow(row.id, { to: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={CELL}
                      list="cable-brands"
                      value={row.brand}
                      placeholder="ВВГнг(А)-LS"
                      onChange={(e) => store.updateRow(row.id, { brand: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={CELL}
                      list="cable-sections"
                      value={row.section}
                      placeholder="3×2,5"
                      onChange={(e) => store.updateRow(row.id, { section: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      min={0}
                      className={CELL}
                      value={row.lengthM || ""}
                      onChange={(e) => store.updateRow(row.id, { lengthM: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={CELL}
                      list="laying-methods"
                      value={row.layingMethod}
                      onChange={(e) => store.updateRow(row.id, { layingMethod: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={CELL}
                      value={row.note}
                      onChange={(e) => store.updateRow(row.id, { note: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1 pt-2">
                    <div className="flex gap-0.5">
                      <button className={ICON_BTN} title="Вверх" disabled={i === 0} onClick={() => store.moveRow(row.id, -1)}>
                        ↑
                      </button>
                      <button
                        className={ICON_BTN}
                        title="Вниз"
                        disabled={i === store.rows.length - 1}
                        onClick={() => store.moveRow(row.id, 1)}
                      >
                        ↓
                      </button>
                      <button className={ICON_BTN} title="Дублировать" onClick={() => store.duplicateRow(row.id)}>
                        ⧉
                      </button>
                      <button className={ICON_BTN} title="Удалить" onClick={() => store.removeRow(row.id)}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className={`${BTN} mt-3`} onClick={store.addRow}>
          + Добавить строку
        </button>
      </Card>

      <Card title={`Спецификация кабелей (запас ${store.reservePercent}%)`}>
        {summary.length === 0 ? (
          <p className="text-sm text-zinc-500">Заполните марку и сечение кабеля в журнале — спецификация соберется автоматически.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-zinc-500">
                  <th className="pb-2 pr-3">Марка кабеля</th>
                  <th className="pb-2 pr-3">Жилы, сечение</th>
                  <th className="pb-2 pr-3">Линий, шт</th>
                  <th className="pb-2 pr-3">Длина, м</th>
                  <th className="pb-2">С запасом, м</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item) => (
                  <tr key={`${item.brand}|${item.section}`} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-3">{item.brand || "—"}</td>
                    <td className="py-1.5 pr-3">{item.section || "—"}</td>
                    <td className="py-1.5 pr-3">{item.count}</td>
                    <td className="py-1.5 pr-3">{item.totalLengthM}</td>
                    <td className="py-1.5 font-medium">{item.totalWithReserveM}</td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700">
                  <td className="pt-2" colSpan={3}>
                    Всего по журналу
                  </td>
                  <td className="pt-2">{totalLength}</td>
                  <td className="pt-2" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
