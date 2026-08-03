import type { Metadata } from "next";
import Link from "next/link";
import CableJournalEditor from "@/components/cable/CableJournalEditor";

export const metadata: Metadata = {
  title: "Кабельный журнал онлайн — форма по ГОСТ 21.613, экспорт в Excel",
  description:
    "Бесплатный онлайн-редактор кабельного журнала для проектировщиков: форма по ГОСТ 21.613, автоматическая спецификация кабелей с запасом длины, экспорт в Excel (XLSX) и CSV. Без регистрации.",
};

export default function CableJournalPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          ← Все инструменты
        </Link>
        <Link href="/tools/voltage-drop" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Потеря напряжения →
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-10">
        <h1 className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Кабельный журнал онлайн
        </h1>
        <p className="mb-6 max-w-3xl text-sm text-zinc-500">
          Заполните кабельный журнал по форме ГОСТ 21.613 прямо в браузере: автодополнение марок кабелей и
          сечений, автоматическая спецификация с запасом длины, экспорт в Excel (XLSX) и CSV. Проект
          сохраняется локально в вашем браузере — без регистрации.
        </p>

        <CableJournalEditor />

        <section className="mt-10 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Что такое кабельный журнал</h2>
          <p>
            Кабельный журнал — таблица в составе рабочей документации электротехнических разделов (ЭОМ, ЭС, СС),
            в которой для каждой кабельной линии указываются маркировка, начало и конец трассы, марка кабеля,
            число и сечение жил, длина и способ прокладки. Форма журнала установлена ГОСТ 21.613 (силовое
            электрооборудование) и применяется также для слаботочных систем.
          </p>
          <p>
            Этот инструмент ускоряет рутинную часть: ведите журнал онлайн, а спецификация кабелей для заказной
            ведомости собирается автоматически — суммарные длины по каждой марке и сечению с настраиваемым
            запасом. Готовый файл Excel можно вставить в проект или передать сметчику.
          </p>
        </section>
      </main>
    </div>
  );
}
