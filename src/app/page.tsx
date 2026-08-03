import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Расчет металлоконструкций опор СЭС онлайн",
  description:
    "Предварительный инженерный расчет опор солнечных электростанций: снеговые и ветровые нагрузки, проверки прочности и устойчивости, 3D-модель, чертежи и PDF-отчет. Бесплатно, без регистрации.",
};

const FEATURES = [
  {
    title: "Нагрузки по методике норм",
    text: "Снеговая и ветровая нагрузки (6 направлений ветра, включая отсос), собственный вес, комбинации G, G+S, G+W, G+S+W с автоматическим выбором наиболее опасной.",
  },
  {
    title: "Проверки элементов",
    text: "Усилия N/M/V в стойках, балках, прогонах и подкосах; проверки прочности, общей и местной устойчивости с цветовой индикацией использования сечения.",
  },
  {
    title: "Параметрическая геометрия",
    text: "Произвольная конфигурация стола: пролеты, высоты, свесы, раскладка панелей. Любое изменение параметра мгновенно пересчитывает всю модель.",
  },
  {
    title: "База профилей и панелей",
    text: "Трубы, швеллеры, уголки, двутавры, стали S235–S355 / С245–С345, библиотека солнечных панелей — или ручной ввод собственных сечений.",
  },
  {
    title: "Климатические районы",
    text: "Снеговые и ветровые районы по областям и городам Казахстана с возможностью ввода координат или ручного задания нагрузок.",
  },
  {
    title: "3D, чертежи и отчет",
    text: "Интерактивная 3D-модель, параметрические 2D-чертежи со спецификацией металла и PDF-отчет по расчету. Проект сохраняется в JSON.",
  },
];

const STEPS = [
  {
    title: "Задайте конструкцию",
    text: "Геометрия стола, панели, профили и площадка строительства — все в одной форме, с разумными значениями по умолчанию.",
  },
  {
    title: "Получите проверки",
    text: "Расчет выполняется автоматически при каждом изменении: нагрузки, усилия, проверки сечений, анкеров и фундамента.",
  },
  {
    title: "Скачайте результат",
    text: "PDF-отчет с исходными данными и результатами, чертежи со спецификацией металла для быстрой оценки материалоемкости.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-sm font-semibold tracking-tight">
          Калькулятор опор СЭС
        </span>
        <Link
          href="/calc"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Открыть калькулятор
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 text-center sm:pt-20">
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Предварительный расчет металлоконструкций опор СЭС — за минуты, а не дни
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-zinc-600 dark:text-zinc-400">
            Снеговые и ветровые нагрузки, проверки прочности и устойчивости, 3D-модель,
            чертежи и PDF-отчет для опорных конструкций солнечных электростанций.
            Бесплатно, без регистрации, прямо в браузере.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/calc"
              className="rounded-lg bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Начать расчет
            </Link>
            <a
              href="#limitations"
              className="rounded-lg border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Область применения
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Для проектных организаций, EPC-подрядчиков и производителей металлоконструкций.
          </p>
        </section>

        <section className="border-t border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Что умеет калькулятор</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {f.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Как это работает</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-400">0{i + 1}</span>
                  <h3 className="mt-1 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="limitations"
          className="border-t border-zinc-200 bg-amber-50/60 py-16 dark:border-zinc-800 dark:bg-amber-950/10"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Область применения и ограничения</h2>
            <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p>
                Это инструмент <strong>предварительного</strong> расчета: он использует грузовые
                площади и простые статические схемы, а не конечно-элементный анализ. Он предназначен
                для быстрой оценки сечений, материалоемкости и стоимости на стадии ТЭО и
                коммерческих предложений.
              </p>
              <p>
                Значения климатических районов и аэродинамических коэффициентов приведены
                справочно для демонстрации методики. Перед выпуском рабочей документации результаты
                должны быть проверены квалифицированным инженером-конструктором по действующим
                нормам (СП РК, Еврокод EN 1991/1993, ASCE 7).
              </p>
              <p>
                В планах развития: экспорт DWG/STEP/IFC, расширенная геотехника и параллельная
                поддержка нескольких нормативных баз.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Попробуйте на своем проекте
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
              Расчет типового стола занимает несколько минут. Проект можно сохранить в файл
              и вернуться к нему позже.
            </p>
            <Link
              href="/calc"
              className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Открыть калькулятор
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-8 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-sm text-zinc-500">
          <span>Калькулятор металлоконструкций опор СЭС</span>
          <span>Результаты требуют проверки квалифицированным инженером.</span>
        </div>
      </footer>
    </div>
  );
}
