"use client";

import { useRef } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { generatePdfReport } from "@/lib/report/pdfReport";

export default function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const exportProjectJson = useProjectStore((s) => s.exportProjectJson);
  const importProjectJson = useProjectStore((s) => s.importProjectJson);
  const resetProject = useProjectStore((s) => s.resetProject);
  const geometry = useProjectStore((s) => s.geometry);
  const panel = useProjectStore((s) => s.panel);
  const location = useProjectStore((s) => s.location);
  const settings = useProjectStore((s) => s.settings);
  const results = useProjectStore((s) => s.results);

  const handleSave = () => {
    const json = exportProjectJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/[^a-zA-Zа-яА-Я0-9]+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importProjectJson(String(reader.result));
      } catch {
        alert("Не удалось загрузить файл проекта — проверьте формат JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePdf = () => {
    generatePdfReport({ projectName, geometry, panel, location, settings, results });
  };

  const secondaryBtn =
    "border border-zinc-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
  const primaryBtn =
    "border border-zinc-900 bg-zinc-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-zinc-700 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <input
        className="min-w-[180px] flex-1 border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm font-medium text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <button onClick={handleSave} className={secondaryBtn}>
        Сохранить проект
      </button>
      <button onClick={handleLoadClick} className={secondaryBtn}>
        Загрузить проект
      </button>
      <input type="file" accept="application/json" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      <button onClick={resetProject} className={secondaryBtn}>
        Сбросить
      </button>
      <button onClick={handlePdf} className={primaryBtn}>
        Рассчитать → PDF-отчёт
      </button>
    </div>
  );
}
