"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSolarStore } from "@/store/useSolarStore";
import Toolbar from "./Toolbar";
import InputPanel from "./InputPanel";
import SummaryBar from "./SummaryBar";
import FrameSvg from "./FrameSvg";
import PlanViews from "./PlanViews";
import Diagrams from "./Diagrams";
import Charts from "./Charts";
import ComparePanel from "./ComparePanel";
import {
  BomTable,
  ChecksTable,
  CombinationsTable,
  DeflectionsTable,
  FormulasTable,
  FoundationPanel,
  JointsTable,
  LoadsTable,
  ReactionsTable,
  WarningsPanel,
} from "./ResultsTables";
import { DISCLAIMER_TEXT } from "./disclaimer";

// three.js не работает при серверном пререндере статического экспорта
const Model3D = dynamic(() => import("./Model3D"), {
  ssr: false,
  loading: () => <div className="grid h-96 place-items-center text-xs text-zinc-500">Загрузка 3D-модели…</div>,
});

const TABS = [
  { key: "summary", label: "Сводка" },
  { key: "scheme", label: "Схема и чертежи" },
  { key: "diagrams", label: "Эпюры" },
  { key: "checks", label: "Проверки" },
  { key: "joints", label: "Узлы и фундамент" },
  { key: "bom", label: "Спецификация" },
  { key: "charts", label: "Графики" },
  { key: "model", label: "3D-модель" },
  { key: "combos", label: "Сочетания" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SolarApp() {
  const theme = useSolarStore((s) => s.theme);
  const setTheme = useSolarStore((s) => s.setTheme);
  const compare = useSolarStore((s) => s.compareProject);
  const [tab, setTab] = useState<TabKey>("summary");
  const [mobileView, setMobileView] = useState<"input" | "results">("input");

  useEffect(() => {
    const saved = localStorage.getItem("solar-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, [setTheme]);

  return (
    <div data-theme={theme} className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Toolbar />

      <div className="no-print flex gap-1 border-b border-zinc-200 bg-white px-3 py-1 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
        {(["input", "results"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={`border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wide ${
              mobileView === v
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-transparent text-zinc-600 dark:text-zinc-300"
            }`}
          >
            {v === "input" ? "Исходные данные" : "Результаты"}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-[1800px] gap-3 p-3 lg:grid-cols-[minmax(340px,410px)_1fr]">
        {/* Панель ввода */}
        <aside className={`${mobileView === "input" ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto lg:pr-1">
            <InputPanel />
          </div>
        </aside>

        {/* Результаты */}
        <main className={`${mobileView === "results" ? "block" : "hidden"} space-y-3 lg:block`}>
          <SummaryBar />

          <div className="no-print flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide transition-colors ${
                  tab === t.key
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {compare ? <ComparePanel /> : null}

          {tab === "summary" ? (
            <div className="space-y-3">
              <WarningsPanel />
              <LoadsTable />
              <FormulasTable />
            </div>
          ) : null}

          {tab === "scheme" ? (
            <div className="space-y-3">
              <FrameSvg />
              <PlanViews />
            </div>
          ) : null}

          {tab === "diagrams" ? <Diagrams /> : null}

          {tab === "checks" ? (
            <div className="space-y-3">
              <ChecksTable />
              <DeflectionsTable />
            </div>
          ) : null}

          {tab === "joints" ? (
            <div className="space-y-3">
              <JointsTable />
              <FoundationPanel />
              <ReactionsTable />
            </div>
          ) : null}

          {tab === "bom" ? <BomTable /> : null}
          {tab === "charts" ? <Charts /> : null}
          {tab === "model" ? <Model3D /> : null}
          {tab === "combos" ? <CombinationsTable /> : null}

          <footer className="rounded border border-zinc-300 bg-white px-3 py-2 text-[11px] leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {DISCLAIMER_TEXT}
          </footer>
        </main>
      </div>
    </div>
  );
}
