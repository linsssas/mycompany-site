"use client";

import { useState } from "react";
import { useSolarStore } from "@/store/useSolarStore";
import { Card, Note, Table, Td, Th } from "./ui/layout";
import LineChart, { ChartPoint } from "./LineChart";
import { fmt } from "@/lib/solar/units";

/** Графики-развёртки. Считаются по требованию: одна развёртка — это ~40 полных расчётов. */
export default function Charts() {
  const charts = useSolarStore((s) => s.charts);
  const pending = useSolarStore((s) => s.chartsPending);
  const request = useSolarStore((s) => s.requestCharts);
  const project = useSolarStore((s) => s.project);
  const results = useSolarStore((s) => s.results);

  if (!charts) {
    return (
      <Card title="Графики">
        <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
          Графики строятся перебором параметра с полным пересчётом конструкции в каждой точке (около 40 расчётов), поэтому
          считаются по запросу.
        </p>
        <button
          onClick={request}
          disabled={pending}
          className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-white hover:bg-zinc-700 disabled:opacity-60 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Считаю…" : "Построить графики"}
        </button>
      </Card>
    );
  }

  const limitSnow = charts.limitSnowKPa;
  const limitWind = charts.limitWindMs;
  const currentSk = results.snow.sk;
  const currentVb = results.wind.vb;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Коэффициент использования и угол наклона"
          subtitle="Пересчёт с фиксированной высотой передней стойки и разносом"
          points={charts.utilizationVsAngle}
          xLabel="α, °"
          yLabel="K"
          threshold={{ value: 1, label: "K = 1" }}
          marker={{ value: results.geom.alphaDeg, label: "текущий" }}
        />
        <ChartCard
          title="Коэффициент использования и снеговая нагрузка"
          subtitle={
            isFinite(limitSnow)
              ? `Предельная снеговая нагрузка: ${fmt(limitSnow)} кПа на грунт`
              : "Определяет не снег: конструкция не проходит и при нулевом снеге"
          }
          points={charts.utilizationVsSnow}
          xLabel="sk, кПа"
          yLabel="K"
          threshold={{ value: 1, label: "K = 1" }}
          marker={{ value: currentSk, label: "текущая" }}
          highlight={isFinite(limitSnow) ? `${fmt(limitSnow)} кПа` : undefined}
        />
        <ChartCard
          title="Коэффициент использования и скорость ветра"
          subtitle={
            isFinite(limitWind)
              ? `Предельная скорость ветра: ${fmt(limitWind)} м/с`
              : "Определяет не ветер: конструкция не проходит и без ветра"
          }
          points={charts.utilizationVsWind}
          xLabel="vb, м/с"
          yLabel="K"
          threshold={{ value: 1, label: "K = 1" }}
          marker={{ value: currentVb, label: "текущая" }}
          highlight={isFinite(limitWind) ? `${fmt(limitWind)} м/с` : undefined}
        />
        <ChartCard
          title="Расход металла и угол наклона"
          subtitle="Для экономического сравнения вариантов"
          points={charts.massVsAngle}
          xLabel="α, °"
          yLabel="кг/кВт"
          marker={{ value: results.geom.alphaDeg, label: "текущий" }}
        />
        <ChartCard
          title="Горизонтальная несущая способность и глубина заглубления"
          subtitle="Коэффициент использования по методу Бромса"
          points={charts.depthChart.map((d) => ({ x: d.depthMm, y: Math.min(d.lateralUtil, 5) }))}
          xLabel="заглубление, мм"
          yLabel="K"
          threshold={{ value: 1, label: "K = 1" }}
          marker={{ value: project.ground.embedDepth, label: "задано" }}
        />
        <ChartCard
          title="Запас на выдёргивание и глубина заглубления"
          subtitle={`Требуется ≥ ${project.ground.upliftSafetyFactor}`}
          points={charts.depthChart.map((d) => ({ x: d.depthMm, y: Math.min(d.upliftSafety, 10) }))}
          xLabel="заглубление, мм"
          yLabel="запас"
          threshold={{ value: project.ground.upliftSafetyFactor, label: `запас ${project.ground.upliftSafetyFactor}` }}
          marker={{ value: project.ground.embedDepth, label: "задано" }}
        />
      </div>
      <Card title="Потребное заглубление в зависимости от типа грунта">
        <p className="mb-2 text-[11px] text-zinc-500">
          При текущих усилиях в основании. Остальные характеристики грунта подставляются из справочной таблицы.
        </p>
        <Table>
          <thead>
            <tr>
              <Th>Тип грунта</Th>
              <Th className="text-right">Потребное заглубление, мм</Th>
              <Th className="text-right">Относительно заданного</Th>
            </tr>
          </thead>
          <tbody>
            {results.foundationRear.soilChart.map((r) => {
              const ratio = r.requiredDepthMm / Math.max(project.ground.embedDepth, 1);
              return (
                <tr key={r.soil}>
                  <Td>{r.soil}</Td>
                  <Td mono className="text-right">
                    {fmt(r.requiredDepthMm)}
                  </Td>
                  <Td mono className="text-right">
                    <span className={ratio > 1 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
                      {fmt(ratio)}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Note>
        Каждая точка графика — полный пересчёт конструкции с изменением одного параметра; остальные исходные данные
        остаются неизменными.
      </Note>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  points,
  xLabel,
  yLabel,
  threshold,
  marker,
  highlight,
}: {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  xLabel: string;
  yLabel: string;
  threshold?: { value: number; label: string };
  marker?: { value: number; label: string };
  highlight?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card
      title={title}
      right={
        <button onClick={() => setShowTable((v) => !v)} className="text-[11px] text-zinc-500 underline-offset-2 hover:underline">
          {showTable ? "график" : "таблица"}
        </button>
      }
    >
      {subtitle ? <p className="mb-1 text-[11px] text-zinc-500">{subtitle}</p> : null}
      {highlight ? (
        <p className="mb-2 font-mono text-lg font-semibold text-zinc-900 dark:text-zinc-100">{highlight}</p>
      ) : null}
      {showTable ? (
        <Table>
          <thead>
            <tr>
              <Th>{xLabel}</Th>
              <Th className="text-right">{yLabel}</Th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}>
                <Td mono>{fmt(p.x)}</Td>
                <Td mono className="text-right">
                  {fmt(p.y)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <LineChart points={points} xLabel={xLabel} yLabel={yLabel} threshold={threshold} marker={marker} />
      )}
    </Card>
  );
}
