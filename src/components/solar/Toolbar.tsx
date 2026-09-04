"use client";

import { useRef, useState } from "react";
import { useSolarStore } from "@/store/useSolarStore";
import { PRESETS } from "@/lib/solar/presets";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Элемент должен находиться в документе, иначе часть браузеров игнорирует
  // атрибут download и сохраняет файл под именем «download»
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const btn =
  "rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default function Toolbar() {
  const project = useSolarStore((s) => s.project);
  const results = useSolarStore((s) => s.results);
  const exportJson = useSolarStore((s) => s.exportJson);
  const importJson = useSolarStore((s) => s.importJson);
  const loadPreset = useSolarStore((s) => s.loadPreset);
  const reset = useSolarStore((s) => s.reset);
  const theme = useSolarStore((s) => s.theme);
  const setTheme = useSolarStore((s) => s.setTheme);
  const compare = useSolarStore((s) => s.compareProject);
  const enableCompare = useSolarStore((s) => s.enableCompare);

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const slug = project.meta.name.replace(/[^\wа-яА-ЯёЁ\- ]/g, "").slice(0, 60) || "проект";

  const onExcel = async () => {
    setBusy("excel");
    try {
      const { buildWorkbook } = await import("@/lib/solar/report/excel");
      download(await buildWorkbook(results), `${slug}.xlsx`);
    } finally {
      setBusy(null);
    }
  };

  const onPdf = async () => {
    setBusy("pdf");
    try {
      const { buildPdf } = await import("@/lib/solar/report/pdf");
      download(buildPdf(results), `${slug}.pdf`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <select
        value={project.meta.presetKey}
        onChange={(e) => loadPreset(e.target.value)}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        aria-label="Пресет"
      >
        {PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      <button className={btn} onClick={() => download(new Blob([exportJson()], { type: "application/json" }), `${slug}.json`)}>
        Сохранить проект
      </button>
      <button className={btn} onClick={() => fileRef.current?.click()}>
        Загрузить
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            importJson(await file.text());
          } catch {
            alert("Не удалось прочитать файл проекта");
          }
          e.target.value = "";
        }}
      />

      <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />

      <button className={btn} onClick={onPdf} disabled={busy !== null}>
        {busy === "pdf" ? "Формирую…" : "PDF-отчёт"}
      </button>
      <button className={btn} onClick={onExcel} disabled={busy !== null}>
        {busy === "excel" ? "Формирую…" : "Excel"}
      </button>
      <button className={btn} onClick={() => window.print()}>
        Печать
      </button>

      <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />

      <button className={btn} onClick={() => enableCompare(compare === null)}>
        {compare === null ? "Сравнить варианты" : "Выключить сравнение"}
      </button>
      <button className={btn} onClick={reset}>
        Сбросить
      </button>

      <button
        className={`${btn} ml-auto`}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
      </button>
    </div>
  );
}
