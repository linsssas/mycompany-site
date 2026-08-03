"use client";

import { useProjectStore } from "@/store/useProjectStore";
import Card from "../Card";
import LeadCTA from "../LeadCTA";
import UtilizationBadge from "./UtilizationBadge";
import { COMBO_LABELS, ComboKey } from "@/lib/calc/combinations";
import { ElementRole, FoundationType } from "@/lib/calc/types";

const ROLE_LABELS: Record<ElementRole, string> = {
  post: "Стойка",
  beam: "Балка",
  purlin: "Прогон",
  brace: "Подкос",
  diagonal: "Связь",
};

const FOUNDATION_LABELS: Record<FoundationType, string> = {
  pile: "Сваи",
  driven_post: "Забивные стойки",
  concrete_block: "Бетонные блоки",
  monolithic: "Монолитный фундамент",
};

function FormulasBlock({ formulas }: { formulas: string[] }) {
  return (
    <details className="mt-3 text-xs text-zinc-500">
      <summary className="cursor-pointer select-none text-zinc-600 dark:text-zinc-400">Используемые формулы</summary>
      <ul className="mt-2 space-y-1 font-mono">
        {formulas.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </details>
  );
}

export default function ResultsPanel() {
  const r = useProjectStore((s) => s.results);

  return (
    <div className="space-y-4">
      <Card title="Заключение">
        <div className="flex flex-wrap items-center gap-3">
          <UtilizationBadge ratio={r.maxUtilization} color={r.overallColor} />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {r.overallColor === "green" && "Конструкция удовлетворяет требованиям с запасом прочности."}
            {r.overallColor === "yellow" && "Конструкция работает с высоким коэффициентом использования — рекомендуется проверка/усиление отдельных элементов."}
            {r.overallColor === "red" && "Обнаружены элементы, не удовлетворяющие требованиям прочности/устойчивости — требуется усиление сечений."}
          </span>
        </div>
      </Card>

      <LeadCTA />

      <Card title="6. Собственный вес конструкции">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
              <th className="py-1">Элемент</th>
              <th className="py-1 text-right">Масса, кг</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(r.selfWeight.steelByRole) as ElementRole[]).map((role) => (
              <tr key={role} className="border-b border-zinc-100 dark:border-zinc-800/50">
                <td className="py-1">{ROLE_LABELS[role]}</td>
                <td className="py-1 text-right font-mono">{r.selfWeight.steelByRole[role].toFixed(1)}</td>
              </tr>
            ))}
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-1">Крепеж (расчетно)</td>
              <td className="py-1 text-right font-mono">{r.selfWeight.fastenersTotal.toFixed(1)}</td>
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-1">Панели</td>
              <td className="py-1 text-right font-mono">{r.selfWeight.panelsTotal.toFixed(1)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="py-1">Итого</td>
              <td className="py-1 text-right font-mono">
                {r.selfWeight.grandTotal.toFixed(1)} кг ({r.selfWeight.grandTotalKN.toFixed(2)} кН)
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="7. Снеговая нагрузка">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="S0" value={`${r.snow.s0.toFixed(2)} кПа`} />
          <Stat label="μ (коэфф. формы)" value={r.snow.mu.toFixed(2)} />
          <Stat label="Ce (снос)" value={r.snow.ce.toFixed(2)} />
          <Stat label="Ct (переход)" value={r.snow.ct.toFixed(2)} />
          <Stat label="γf" value={r.snow.gammaF.toFixed(2)} />
          <Stat label="Sg / Sd" value={`${r.snow.sg.toFixed(2)} / ${r.snow.sd.toFixed(2)} кПа`} />
          <Stat label="На прогон" value={`${r.snow.purlinLineLoad.toFixed(2)} кН/м`} />
          <Stat label="На балку" value={`${r.snow.beamLineLoad.toFixed(2)} кН/м`} />
          <Stat label="На стойку" value={`${r.snow.postForce.toFixed(2)} кН`} />
        </div>
        <FormulasBlock formulas={r.snow.formulas} />
      </Card>

      <Card title="8. Ветровая нагрузка">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="py-1">Направление</th>
                <th className="py-1 text-right">Давление, кПа</th>
                <th className="py-1 text-right">Отсос, кПа</th>
                <th className="py-1 text-right">Fh, кН</th>
                <th className="py-1 text-right">Fv, кН</th>
                <th className="py-1 text-right">M опрок., кН·м</th>
              </tr>
            </thead>
            <tbody>
              {r.wind.directions.map((d) => (
                <tr key={d.direction} className={`border-b border-zinc-100 dark:border-zinc-800/50 ${d.direction === r.wind.worst.direction ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                  <td className="py-1">
                    {d.label} {d.direction === r.wind.worst.direction && <span className="text-red-600">(опасное)</span>}
                  </td>
                  <td className="py-1 text-right font-mono">{d.pressure.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono">{d.suction.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono">{d.horizontalForce.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono">{d.verticalForce.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono">{d.overturningMoment.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FormulasBlock formulas={r.wind.formulas} />
      </Card>

      <Card title="9-10. Усилия и проверка элементов">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="py-1">Элемент</th>
                <th className="py-1">Сечение</th>
                <th className="py-1">Сталь</th>
                <th className="py-1 text-right">N, кН</th>
                <th className="py-1 text-right">M, кН·м</th>
                <th className="py-1 text-right">Прочность</th>
                <th className="py-1 text-right">Устойчивость</th>
                <th className="py-1 text-right">Гибкость λ</th>
                <th className="py-1">Местная уст.</th>
                <th className="py-1 text-right">Использование</th>
                <th className="py-1">Комбинация</th>
              </tr>
            </thead>
            <tbody>
              {r.checkedElements.map((el) => (
                <tr key={el.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
                  <td className="py-1">{el.label}</td>
                  <td className="py-1">{el.section.name}</td>
                  <td className="py-1">{el.material.name}</td>
                  <td className="py-1 text-right font-mono">{el.N.toFixed(1)}</td>
                  <td className="py-1 text-right font-mono">{el.M.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono">{(el.strengthUtilization * 100).toFixed(0)}%</td>
                  <td className="py-1 text-right font-mono">{(el.bucklingUtilization * 100).toFixed(0)}%</td>
                  <td className="py-1 text-right font-mono">{el.slenderness.toFixed(0)}</td>
                  <td className="py-1">{el.localOk ? "✅ ОК" : "⚠ превышение"}</td>
                  <td className="py-1 text-right">
                    <UtilizationBadge ratio={el.overallUtilization} color={el.color} />
                  </td>
                  <td className="py-1 text-xs text-zinc-500">{COMBO_LABELS[el.governingCombo as ComboKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          🟢 менее 70% · 🟡 70–90% · 🔴 более 90%. Прогиб (SLS) проверяется дополнительно для балок и прогонов (см. коэффициент использования — максимум из прочности, устойчивости и прогиба).
        </p>
      </Card>

      <Card title="13. Комбинации нагрузок (типовая стойка передняя)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="py-1">Комбинация</th>
                <th className="py-1 text-right">N, кН</th>
                <th className="py-1 text-right">M, кН·м</th>
                <th className="py-1 text-right">V, кН</th>
              </tr>
            </thead>
            <tbody>
              {r.combos
                .filter((c) => c.id === "post-front-typ")
                .flatMap((c) =>
                  (Object.keys(COMBO_LABELS) as ComboKey[]).map((k) => (
                    <tr key={k} className={`border-b border-zinc-100 dark:border-zinc-800/50 ${k === c.governing ? "bg-blue-50 font-semibold dark:bg-blue-950/20" : ""}`}>
                      <td className="py-1">
                        {COMBO_LABELS[k]} {k === c.governing && <span className="text-blue-600">← наиболее опасная</span>}
                      </td>
                      <td className="py-1 text-right font-mono">{c.combos[k].N.toFixed(2)}</td>
                      <td className="py-1 text-right font-mono">{c.combos[k].M.toFixed(2)}</td>
                      <td className="py-1 text-right font-mono">{c.combos[k].V.toFixed(2)}</td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="11. Проверка анкеров">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Передняя стойка", a: r.anchorFront },
            { label: "Задняя стойка", a: r.anchorRear },
          ].map(({ label, a }) => (
            <div key={label} className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold">{label}</h4>
                <UtilizationBadge ratio={a.combinedUtilization} color={a.combinedUtilization < 0.7 ? "green" : a.combinedUtilization <= 0.9 ? "yellow" : "red"} />
              </div>
              <div className="space-y-1">
                <Row label="Растяжение (вырыв) на болт" value={`${a.tensionPerBoltKN.toFixed(2)} кН`} />
                <Row label="Срез на болт" value={`${a.shearPerBoltKN.toFixed(2)} кН`} />
                <Row label="Использование (растяжение)" value={`${(a.tensionUtilization * 100).toFixed(0)}%`} />
                <Row label="Использование (срез)" value={`${(a.shearUtilization * 100).toFixed(0)}%`} />
                <Row label="Рекомендуемый диаметр" value={`M${a.recommendedDiameter}, класс ${a.boltGrade.label}`} />
                <Row label="Количество анкеров" value={`${a.boltCount} шт`} />
              </div>
            </div>
          ))}
        </div>
        <FormulasBlock formulas={r.anchorFront.formulas} />
      </Card>

      <Card title="12. Проверка фундамента">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Фундамент передней стойки", f: r.foundationFront },
            { label: "Фундамент задней стойки", f: r.foundationRear },
          ].map(({ label, f }) => (
            <div key={label} className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <h4 className="mb-2 font-semibold">{label}</h4>
              <div className="space-y-1">
                <Row label="Размер подошвы" value={`${f.widthM.toFixed(2)} × ${f.lengthM.toFixed(2)} м`} />
                <Row label="Глубина заложения" value={`${f.depthM.toFixed(2)} м`} />
                <Row label="Давление на грунт max/min" value={`${f.bearingPressureMax.toFixed(1)} / ${f.bearingPressureMin.toFixed(1)} кПа`} />
                <Row label="Несущая способность" value={f.bearingOk ? "✅ ОК" : "🔴 недостаточна"} />
                <Row label="Коэфф. устойчивости на опрокидывание" value={`${f.overturningFactor.toFixed(2)} ${f.overturningOk ? "✅" : "🔴"}`} />
                <Row label="Коэфф. устойчивости на сдвиг" value={`${f.slidingFactor.toFixed(2)} ${f.slidingOk ? "✅" : "🔴"}`} />
                <Row label="Рекомендуемый тип" value={FOUNDATION_LABELS[f.recommendedType]} />
              </div>
              <p className="mt-2 text-xs text-zinc-400">{f.recommendedTypeNote}</p>
            </div>
          ))}
        </div>
        <FormulasBlock formulas={r.foundationFront.formulas} />
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-2 dark:bg-zinc-800/50">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
