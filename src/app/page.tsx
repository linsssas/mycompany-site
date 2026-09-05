import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Онлайн-инструменты для проектировщиков и инженеров",
  description:
    "Бесплатные инженерные онлайн-инструменты: кабельный журнал по ГОСТ с экспортом в Excel, расчет металлоконструкций опор СЭС. Без регистрации, прямо в браузере.",
};

const TOOLS = [
  {
    href: "/tools/cable-journal",
    index: "01",
    title: "Кабельный журнал",
    badge: "Новое",
    text: "Форма по ГОСТ 21.613, автодополнение марок кабелей, автоматическая спецификация с запасом длины, экспорт в Excel (XLSX) и CSV.",
  },
  {
    href: "/tools/solar-support",
    index: "02",
    title: "Опора солнечных панелей: снег и ветер",
    badge: "Новое",
    text: "Параметрический расчет опоры солнечных панелей по СП РК EN 1991-1-3 / 1991-1-4: снеговые и ветровые схемы, МКЭ плоской рамы, проверки тонкостенных профилей по EN 1993-1-3, болтовые узлы, стойка в грунте, спецификация, экспорт в PDF и Excel.",
  },
  {
    href: "/calc",
    index: "03",
    title: "Расчет опор СЭС (упрощенный)",
    badge: null,
    text: "Быстрая предварительная оценка металлоконструкций опор СЭС по грузовым площадям: нагрузки, проверки сечений, 3D-модель, чертежи, PDF-отчет.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest">
            <span className="text-zinc-400">◧</span>
            Инструменты проектировщика
          </span>
          <span className="font-mono text-[11px] text-zinc-400">РФ / РК · ГОСТ · СП · EN</span>
        </div>
      </header>

      <main>
        <section className="bg-blueprint-grid border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-zinc-500">
              Инженерные онлайн-инструменты
            </p>
            <h1 className="mt-3 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Онлайн-инструменты для проектировщиков и инженеров
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg text-zinc-600 dark:text-zinc-400">
              Рутинные инженерные задачи — быстрее и без Excel-шаблонов. Бесплатно, без регистрации,
              работает прямо в браузере, проекты сохраняются локально.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-6 flex items-baseline justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Перечень инструментов
            </h2>
            <span className="font-mono text-xs text-zinc-400">{TOOLS.length} шт.</span>
          </div>
          <div className="grid gap-px overflow-hidden border border-zinc-200 bg-zinc-200 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-800">
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group relative flex flex-col bg-white p-6 transition-colors hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
                  TOOLS.length % 2 === 1 && i === TOOLS.length - 1 ? "sm:col-span-2" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-zinc-400">{tool.index}</span>
                  {tool.badge ? (
                    <span className="border border-emerald-700/30 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {tool.badge}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-bold">{tool.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{tool.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-mono text-xs font-medium uppercase tracking-wide text-zinc-900 group-hover:gap-2 dark:text-zinc-100">
                  Открыть →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-200 py-12 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-3xl space-y-3">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">О проекте</h2>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Мы делаем узкие инструменты, которые заменяют самодельные Excel-шаблоны в повседневной работе
                проектировщика. Каждый инструмент решает одну задачу целиком: ввод, проверки, готовый файл на
                выходе.
              </p>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Расчетные инструменты предназначены для предварительной оценки: перед выпуском рабочей
                документации результаты должны быть проверены квалифицированным инженером по действующим нормам.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 font-mono text-xs text-zinc-500">
          <span>Инструменты проектировщика</span>
          <span>Бесплатно / Без регистрации / Данные хранятся в вашем браузере</span>
        </div>
      </footer>
    </div>
  );
}
