"use client";

import { useState } from "react";
import { useSolarStore } from "@/store/useSolarStore";
import { Card, Note, StatusBadge, Table, Td, Th } from "./ui/layout";
import { fmt } from "@/lib/solar/units";
import { statusOf } from "@/lib/solar/types";

export function WarningsPanel() {
  const results = useSolarStore((s) => s.results);
  if (results.warnings.length === 0 && results.diagnostics.length === 0) return null;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const sorted = [...results.warnings].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <Card title="Предупреждения и замечания">
      <div className="space-y-2">
        {sorted.map((w, i) => (
          <Note key={i} kind={w.severity === "info" ? "info" : w.severity}>
            <span className="font-semibold">{w.scope}: </span>
            {w.message}
          </Note>
        ))}
        {results.diagnostics.length > 0 ? (
          <div className="space-y-1 rounded border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/40">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Конструкция не проходит. Что могло быть принято иначе в исходном проекте:
            </p>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-blue-900 dark:text-blue-200">
              {results.diagnostics.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function LoadsTable() {
  const results = useSolarStore((s) => s.results);
  return (
    <Card title="Таблица нагрузок">
      <Table>
        <thead>
          <tr>
            <Th>Нагрузка</Th>
            <Th className="text-right">Значение</Th>
            <Th>Ед.</Th>
            <Th>Примечание</Th>
          </tr>
        </thead>
        <tbody>
          {results.loadRows.map((r, i) => (
            <tr key={i}>
              <Td>{r.name}</Td>
              <Td mono className="text-right font-semibold">
                {r.value}
              </Td>
              <Td mono>{r.unit}</Td>
              <Td className="text-zinc-500">{r.note}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-2 text-[11px] text-zinc-500">{results.thermal.note}</p>
    </Card>
  );
}

export function FormulasTable() {
  const results = useSolarStore((s) => s.results);
  return (
    <Card title="Формулы с подстановкой чисел">
      <Table>
        <thead>
          <tr>
            <Th>Обозначение</Th>
            <Th>Формула</Th>
            <Th>Подстановка</Th>
            <Th className="text-right">Результат</Th>
            <Th>Пункт нормы</Th>
          </tr>
        </thead>
        <tbody>
          {results.formulas.map((f, i) => (
            <tr key={i}>
              <Td mono className="font-semibold">
                {f.symbol}
              </Td>
              <Td mono>{f.formula}</Td>
              <Td mono className="text-zinc-500">
                {f.substitution}
              </Td>
              <Td mono className="text-right font-semibold">
                {fmt(f.value)} {f.unit}
              </Td>
              <Td className="text-zinc-500">{f.ref}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function ChecksTable() {
  const results = useSolarStore((s) => s.results);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const rows = onlyCritical ? results.checks.filter((c) => c.utilization >= 0.85) : results.checks;

  return (
    <Card
      title="Таблица проверок"
      right={
        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
          <input type="checkbox" checked={onlyCritical} onChange={(e) => setOnlyCritical(e.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />
          только K ≥ 0,85
        </label>
      }
    >
      <Table>
        <thead>
          <tr>
            <Th>Элемент</Th>
            <Th>Проверка</Th>
            <Th className="text-right">Ed</Th>
            <Th className="text-right">Rd</Th>
            <Th>Ед.</Th>
            <Th className="text-right">K</Th>
            <Th>Определяющее сочетание</Th>
            <Th>Пункт нормы</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <Td className="whitespace-nowrap font-medium">{c.member}</Td>
              <Td>
                {c.check}
                <div className="font-mono text-[10px] text-zinc-400">{c.formula}</div>
              </Td>
              <Td mono className="text-right">
                {fmt(c.Ed)}
              </Td>
              <Td mono className="text-right">
                {fmt(c.Rd)}
              </Td>
              <Td mono>{c.unit}</Td>
              <Td className="text-right">
                <StatusBadge status={c.status}>{fmt(c.utilization)}</StatusBadge>
              </Td>
              <Td className="text-zinc-500">
                {c.combo}
                {c.variant !== "—" ? <span className="block text-[10px]">{c.variant}</span> : null}
              </Td>
              <Td className="text-zinc-500">
                {c.ref}
                <div className="font-mono text-[10px] text-zinc-400">{c.substitution}</div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function DeflectionsTable() {
  const results = useSolarStore((s) => s.results);
  // Оставляем по одной (наихудшей) строке на каждую проверку
  const best = new Map<string, (typeof results.deflections)[number]>();
  for (const d of results.deflections) {
    const key = `${d.member}|${d.check}`;
    const prev = best.get(key);
    if (!prev || d.utilization > prev.utilization) best.set(key, d);
  }
  const rows = [...best.values()].sort((a, b) => b.utilization - a.utilization);

  return (
    <Card title="Прогибы и перемещения (SLS)">
      <Table>
        <thead>
          <tr>
            <Th>Элемент</Th>
            <Th>Проверка</Th>
            <Th className="text-right">Факт</Th>
            <Th className="text-right">Предел</Th>
            <Th className="text-right">K</Th>
            <Th>Сочетание</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={i}>
              <Td className="font-medium">{d.member}</Td>
              <Td>{d.check}</Td>
              <Td mono className="text-right">
                {fmt(d.value)} мм
              </Td>
              <Td mono className="text-right">
                {fmt(d.limit)} мм
              </Td>
              <Td className="text-right">
                <StatusBadge status={statusOf(d.utilization)}>{fmt(d.utilization)}</StatusBadge>
              </Td>
              <Td className="text-zinc-500">{d.combo}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function JointsTable() {
  const results = useSolarStore((s) => s.results);
  return (
    <>
      <Card title="Проверки болтовых узлов">
        <Note kind="warning">
          При толщине соединяемых элементов 1,5–2 мм определяющей, как правило, является проверка СМЯТИЯ ЛИСТА, а не среза
          болта.
        </Note>
        <div className="mt-2 space-y-3">
          {results.joints.map((j) => (
            <div key={j.key}>
              <div className="mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {j.label}
                <span className="ml-2 font-normal text-zinc-500">определяет: {j.resistances.governing}</span>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Проверка</Th>
                    <Th className="text-right">Ed</Th>
                    <Th className="text-right">Rd</Th>
                    <Th>Ед.</Th>
                    <Th className="text-right">K</Th>
                    <Th>Пункт нормы</Th>
                  </tr>
                </thead>
                <tbody>
                  {j.items.map((it) => (
                    <tr key={it.key}>
                      <Td className={it.key === "bearing" ? "font-bold" : ""}>{it.check}</Td>
                      <Td mono className="text-right">
                        {fmt(it.Ed)}
                      </Td>
                      <Td mono className="text-right">
                        {fmt(it.Rd)}
                      </Td>
                      <Td mono>{it.unit}</Td>
                      <Td className="text-right">
                        <StatusBadge status={statusOf(it.utilization)}>{fmt(it.utilization)}</StatusBadge>
                      </Td>
                      <Td className="text-zinc-500">{it.ref}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Ведомость метизов: требуется / имеется по чертежу">
        <Table>
          <thead>
            <tr>
              <Th>Болт</Th>
              <Th className="text-right">Требуется</Th>
              <Th className="text-right">По чертежу</Th>
              <Th className="text-right">Использование</Th>
              <Th>Примечание</Th>
            </tr>
          </thead>
          <tbody>
            {results.fasteners.map((f) => (
              <tr key={f.d}>
                <Td mono>М{f.d}</Td>
                <Td mono className="text-right">
                  {f.required}
                </Td>
                <Td mono className="text-right">
                  {f.drawing}
                </Td>
                <Td className="text-right">
                  <StatusBadge status={statusOf(f.utilization)}>{fmt(f.utilization * 100)} %</StatusBadge>
                </Td>
                <Td className="text-zinc-500">{f.note}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="mt-2">
          <Table>
            <tbody>
              <tr>
                <Td className="font-medium">{results.clampCheck.check}</Td>
                <Td mono className="text-right">
                  {fmt(results.clampCheck.Ed)} / {fmt(results.clampCheck.Rd)} кН
                </Td>
                <Td className="text-right">
                  <StatusBadge status={results.clampCheck.status}>{fmt(results.clampCheck.utilization)}</StatusBadge>
                </Td>
                <Td className="text-zinc-500">{results.clampCheck.substitution}</Td>
              </tr>
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}

export function FoundationPanel() {
  const results = useSolarStore((s) => s.results);
  const f = results.foundationRear;
  return (
    <Card title="Стойка в грунте">
      <Table>
        <thead>
          <tr>
            <Th>Проверка</Th>
            <Th className="text-right">Ed</Th>
            <Th className="text-right">Rd</Th>
            <Th>Ед.</Th>
            <Th className="text-right">K</Th>
            <Th>Метод</Th>
          </tr>
        </thead>
        <tbody>
          {[...results.foundationRear.rows, ...results.foundationFront.rows].map((r, i) => (
            <tr key={i}>
              <Td>
                {r.check}
                <span className="ml-1 text-[10px] text-zinc-400">{i < results.foundationRear.rows.length ? "(задняя)" : "(передняя)"}</span>
              </Td>
              <Td mono className="text-right">
                {fmt(r.Ed)}
              </Td>
              <Td mono className="text-right">
                {fmt(r.Rd)}
              </Td>
              <Td mono>{r.unit}</Td>
              <Td className="text-right">
                <StatusBadge status={r.status}>{fmt(r.utilization)}</StatusBadge>
              </Td>
              <Td className="text-zinc-500">{r.ref}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-800/50">
          <div className="mb-1 font-semibold text-zinc-800 dark:text-zinc-200">Потребное заглубление</div>
          <div className="font-mono text-lg text-zinc-900 dark:text-zinc-100">{fmt(f.requiredDepth)} мм</div>
          <div className="text-zinc-500">задано {fmt(results.project.ground.embedDepth)} мм</div>
        </div>
        <div className="rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-800/50">
          <div className="mb-1 font-semibold text-zinc-800 dark:text-zinc-200">Запас на выдёргивание</div>
          <div className="font-mono text-lg text-zinc-900 dark:text-zinc-100">
            {isFinite(f.upliftSafety) ? fmt(f.upliftSafety) : "—"}
          </div>
          <div className="text-zinc-500">требуется ≥ {results.project.ground.upliftSafetyFactor}</div>
        </div>
      </div>
      <details className="mt-2 text-[11px] text-zinc-500">
        <summary className="cursor-pointer">Промежуточные величины расчёта основания</summary>
        <ul className="mt-1 space-y-0.5 font-mono">
          {f.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export function BomTable() {
  const results = useSolarStore((s) => s.results);
  const cur = results.project.economics.currency;
  return (
    <Card title="Спецификация металла">
      <Table>
        <thead>
          <tr>
            <Th>Поз.</Th>
            <Th>Зона</Th>
            <Th>Наименование</Th>
            <Th>Профиль</Th>
            <Th className="text-right">Длина, мм</Th>
            <Th className="text-right">Кол.</Th>
            <Th className="text-right">кг/м</Th>
            <Th className="text-right">Масса, кг</Th>
            <Th>Покрытие</Th>
            <Th>Примечание</Th>
          </tr>
        </thead>
        <tbody>
          {results.bom.items.map((i) => (
            <tr key={i.pos}>
              <Td mono>{i.pos}</Td>
              <Td>{i.zone}</Td>
              <Td>{i.name}</Td>
              <Td mono>{i.profile}</Td>
              <Td mono className="text-right">
                {fmt(i.length)}
              </Td>
              <Td mono className="text-right">
                {i.count}
              </Td>
              <Td mono className="text-right">
                {fmt(i.massPerM)}
              </Td>
              <Td mono className="text-right font-semibold">
                {fmt(i.massTotal)}
              </Td>
              <Td>{i.coating}</Td>
              <Td className="text-zinc-500">{i.note}</Td>
            </tr>
          ))}
          <tr className="bg-zinc-50 dark:bg-zinc-800/50">
            <Td colSpan={7} className="text-right font-semibold">
              Итого металл (с учётом коэффициента на крепёж)
            </Td>
            <Td mono className="text-right font-bold">
              {fmt(results.bom.steelMassWithFasteners)}
            </Td>
            <Td colSpan={2} />
          </tr>
        </tbody>
      </Table>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
        <Metric label="Масса металла" value={`${fmt(results.bom.steelMassWithFasteners)} кг`} />
        <Metric label="Металл на 1 кВт" value={`${fmt(results.bom.massPerKW)} кг/кВт`} />
        <Metric label="Металл на 1 м²" value={`${fmt(results.bom.massPerM2)} кг/м²`} />
        <Metric label="Стоимость металла" value={`${fmt(results.bom.steelCost)} ${cur}`} />
        <Metric label="Мощность стола" value={`${fmt(results.bom.powerKW)} кВт`} />
        <Metric label="Стоимость на 1 кВт" value={`${fmt(results.bom.costPerKW)} ${cur}/кВт`} />
        <Metric label="Масса панелей" value={`${fmt(results.bom.panelMass)} кг`} />
        <Metric label="Общая масса" value={`${fmt(results.bom.totalMass / 1000)} т`} />
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-zinc-50 p-2 dark:bg-zinc-800/50">
      <div className="text-zinc-500">{label}</div>
      <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

export function ReactionsTable() {
  const results = useSolarStore((s) => s.results);
  return (
    <Card title="Реакции в основании стоек по сочетаниям">
      <Table>
        <thead>
          <tr>
            <Th>Сочетание</Th>
            <Th className="text-right">V задняя, кН</Th>
            <Th className="text-right">H задняя, кН</Th>
            <Th className="text-right">V передняя, кН</Th>
            <Th className="text-right">H передняя, кН</Th>
          </tr>
        </thead>
        <tbody>
          {results.reactions.slice(0, 25).map((r, i) => (
            <tr key={i}>
              <Td className="text-zinc-600 dark:text-zinc-400">{r.combo}</Td>
              <Td mono className="text-right">
                {fmt(r.rearV)}
              </Td>
              <Td mono className="text-right">
                {fmt(r.rearH)}
              </Td>
              <Td mono className="text-right">
                {fmt(r.frontV)}
              </Td>
              <Td mono className="text-right">
                {fmt(r.frontH)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-2 text-[11px] text-zinc-500">
        Положительная V — реакция грунта вверх (вдавливание), отрицательная — выдёргивание.
      </p>
    </Card>
  );
}

export function CombinationsTable() {
  const results = useSolarStore((s) => s.results);
  const governing = new Set(results.checks.map((c) => c.combo));
  return (
    <Card title={`Полная таблица сочетаний (${results.combos.length})`}>
      <Table>
        <thead>
          <tr>
            <Th>Сочетание</Th>
            <Th>Тип</Th>
            <Th>Состав</Th>
            <Th>Пункт нормы</Th>
          </tr>
        </thead>
        <tbody>
          {results.combos.map((c) => (
            <tr key={c.key} className={governing.has(c.label) ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
              <Td className="font-medium">{c.label}</Td>
              <Td mono>{c.type}</Td>
              <Td mono className="text-zinc-500">
                {c.terms.map((t) => `${fmt(t.factor)}·${t.caseKey}`).join(" + ")}
              </Td>
              <Td className="text-zinc-500">{c.ref}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-2 text-[11px] text-zinc-500">Жёлтым выделены сочетания, определяющие хотя бы одну проверку.</p>
    </Card>
  );
}
