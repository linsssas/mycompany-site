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
    title: "Кабельный журнал",
    badge: "Новое",
    text: "Форма по ГОСТ 21.613, автодополнение марок кабелей, автоматическая спецификация с запасом длины, экспорт в Excel (XLSX) и CSV.",
  },
  {
    href: "/tools/voltage-drop",
    title: "Потеря напряжения в кабеле",
    badge: "Новое",
    text: "Расчет потери напряжения для линий 220/380 В по мощности или току, медь и алюминий, таблица по всем сечениям и подбор минимального сечения под допустимую потерю.",
  },
  {
    href: "/calc",
    title: "Расчет опор СЭС",
    badge: null,
    text: "Предварительный расчет металлоконструкций опор солнечных электростанций: снеговые и ветровые нагрузки, проверки сечений, 3D-модель, чертежи, PDF-отчет.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-sm font-semibold tracking-tight">Инструменты проектировщика</span>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 text-center sm:pt-16">
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Онлайн-инструменты для проектировщиков и инженеров
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-zinc-600 dark:text-zinc-400">
            Рутинные инженерные задачи — быстрее и без Excel-шаблонов. Бесплатно, без регистрации,
            работает прямо в браузере, проекты сохраняются локально.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{tool.title}</h2>
                  {tool.badge ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {tool.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{tool.text}</p>
                <span className="mt-4 inline-block text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
                  Открыть →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-200 py-12 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">О проекте</h2>
              <p>
                Мы делаем узкие инструменты, которые заменяют самодельные Excel-шаблоны в повседневной работе
                проектировщика. Каждый инструмент решает одну задачу целиком: ввод, проверки, готовый файл на
                выходе.
              </p>
              <p>
                Расчетные инструменты предназначены для предварительной оценки: перед выпуском рабочей
                документации результаты должны быть проверены квалифицированным инженером по действующим нормам.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-8 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-sm text-zinc-500">
          <span>Инструменты проектировщика</span>
          <span>Бесплатно · Без регистрации · Данные хранятся в вашем браузере</span>
        </div>
      </footer>
    </div>
  );
}
