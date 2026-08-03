"use client";

import { useState } from "react";
import Card from "@/components/Card";
import {
  Conductor,
  System,
  allSections,
  currentFromPower,
  recommendSection,
} from "@/lib/electrical/voltageDrop";

const CELL =
  "w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500";
const LABEL = "flex flex-col gap-1 text-xs font-medium text-zinc-500";

type LoadMode = "power" | "current";

export default function VoltageDropCalculator() {
  const [system, setSystem] = useState<System>("single");
  const [loadMode, setLoadMode] = useState<LoadMode>("power");
  const [powerKw, setPowerKw] = useState(3.5);
  const [currentA, setCurrentA] = useState(16);
  const [cosPhi, setCosPhi] = useState(0.95);
  const [lengthM, setLengthM] = useState(25);
  const [conductor, setConductor] = useState<Conductor>("copper");
  const [maxDropPercent, setMaxDropPercent] = useState(5);

  const voltage = system === "single" ? 220 : 380;
  const current =
    loadMode === "power" ? currentFromPower(powerKw, system, voltage, cosPhi) : currentA;

  const input = { system, voltage, current, cosPhi, lengthM, conductor };
  const recommended = recommendSection(input, maxDropPercent);
  const rows = allSections(input);

  return (
    <div className="space-y-4">
      <Card title="Исходные данные">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={LABEL}>
            Сеть
            <select className={CELL} value={system} onChange={(e) => setSystem(e.target.value as System)}>
              <option value="single">Однофазная 220 В</option>
              <option value="three">Трехфазная 380 В</option>
            </select>
          </label>
          <label className={LABEL}>
            Материал жилы
            <select className={CELL} value={conductor} onChange={(e) => setConductor(e.target.value as Conductor)}>
              <option value="copper">Медь</option>
              <option value="aluminum">Алюминий</option>
            </select>
          </label>
          <label className={LABEL}>
            Нагрузка задана
            <select className={CELL} value={loadMode} onChange={(e) => setLoadMode(e.target.value as LoadMode)}>
              <option value="power">Мощностью, кВт</option>
              <option value="current">Током, А</option>
            </select>
          </label>
          {loadMode === "power" ? (
            <label className={LABEL}>
              Мощность, кВт
              <input
                type="number"
                min={0}
                step={0.1}
                className={CELL}
                value={powerKw}
                onChange={(e) => setPowerKw(Number(e.target.value))}
              />
            </label>
          ) : (
            <label className={LABEL}>
              Ток, А
              <input
                type="number"
                min={0}
                step={0.5}
                className={CELL}
                value={currentA}
                onChange={(e) => setCurrentA(Number(e.target.value))}
              />
            </label>
          )}
          <label className={LABEL}>
            cos φ
            <input
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              className={CELL}
              value={cosPhi}
              onChange={(e) => setCosPhi(Math.min(1, Math.max(0.1, Number(e.target.value))))}
            />
          </label>
          <label className={LABEL}>
            Длина линии, м
            <input
              type="number"
              min={0}
              className={CELL}
              value={lengthM}
              onChange={(e) => setLengthM(Number(e.target.value))}
            />
          </label>
          <label className={LABEL}>
            Допустимая потеря, %
            <input
              type="number"
              min={0.5}
              max={15}
              step={0.5}
              className={CELL}
              value={maxDropPercent}
              onChange={(e) => setMaxDropPercent(Number(e.target.value))}
            />
          </label>
          <div className={LABEL}>
            Расчетный ток
            <div className="rounded border border-transparent px-2 py-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {current > 0 ? `${current.toFixed(1)} А` : "—"}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Результат">
        {current <= 0 || lengthM <= 0 ? (
          <p className="text-sm text-zinc-500">Задайте нагрузку и длину линии.</p>
        ) : recommended ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Минимальное сечение по потере напряжения:{" "}
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {recommended.sectionMm2} мм²
            </span>{" "}
            — потеря {recommended.dropV.toFixed(1)} В ({recommended.dropPercent.toFixed(2)}%) при допустимых{" "}
            {maxDropPercent}%.
          </p>
        ) : (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Ни одно сечение стандартного ряда (до 240 мм²) не укладывается в допустимую потерю — уменьшите
            длину линии, ток или снизьте требование.
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Проверка только по потере напряжения (активное сопротивление, жилы при 20 °C). Итоговое сечение
          должно быть также проверено по допустимому длительному току и защитному аппарату по ПУЭ.
        </p>
      </Card>

      {current > 0 && lengthM > 0 ? (
        <Card title="Потеря напряжения по сечениям">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-zinc-500">
                  <th className="pb-2 pr-3">Сечение, мм²</th>
                  <th className="pb-2 pr-3">Потеря, В</th>
                  <th className="pb-2 pr-3">Потеря, %</th>
                  <th className="pb-2">Оценка</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ok = r.dropPercent <= maxDropPercent;
                  const isRecommended = recommended?.sectionMm2 === r.sectionMm2;
                  return (
                    <tr
                      key={r.sectionMm2}
                      className={`border-t border-zinc-100 dark:border-zinc-800 ${isRecommended ? "font-semibold" : ""}`}
                    >
                      <td className="py-1.5 pr-3">{r.sectionMm2}</td>
                      <td className="py-1.5 pr-3">{r.dropV.toFixed(1)}</td>
                      <td className="py-1.5 pr-3">{r.dropPercent.toFixed(2)}</td>
                      <td className={`py-1.5 ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {isRecommended ? "✓ рекомендуемое" : ok ? "проходит" : "не проходит"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
