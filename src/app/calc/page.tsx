import type { Metadata } from "next";
import Link from "next/link";
import Toolbar from "@/components/Toolbar";
import Tabs from "@/components/Tabs";
import GeometryForm from "@/components/forms/GeometryForm";
import PanelForm from "@/components/forms/PanelForm";
import ProfilesForm from "@/components/forms/ProfilesForm";
import LocationForm from "@/components/forms/LocationForm";
import SettingsForm from "@/components/forms/SettingsForm";
import ResultsPanel from "@/components/results/ResultsPanel";
import Model3D from "@/components/viewer/Model3D";
import Drawings2D from "@/components/Drawings2D";

export const metadata: Metadata = {
  title: "Калькулятор",
  description:
    "Расчет снеговых, ветровых и постоянных нагрузок на металлоконструкции опор СЭС: проверки прочности, 3D-модель, чертежи, PDF-отчет.",
};

export default function CalcPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <Link href="/" className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-900 dark:text-zinc-50">
            ← Все инструменты
          </Link>
          <span className="font-mono text-[11px] text-zinc-400">03 / Упрощённый расчёт</span>
        </div>
      </div>
      <Toolbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Инженерный калькулятор металлоконструкций опор СЭС
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          Снеговые, ветровые и постоянные нагрузки на опоры солнечных электростанций произвольной конфигурации.
        </p>

        <Tabs
          tabs={[
            {
              key: "input",
              label: "Исходные данные",
              content: (
                <div className="space-y-4">
                  <GeometryForm />
                  <PanelForm />
                  <ProfilesForm />
                  <LocationForm />
                  <SettingsForm />
                </div>
              ),
            },
            { key: "results", label: "Результаты расчета", content: <ResultsPanel /> },
            { key: "model3d", label: "3D модель", content: <Model3D /> },
            { key: "drawings", label: "Чертежи и спецификации", content: <Drawings2D /> },
          ]}
        />
      </main>
    </div>
  );
}
