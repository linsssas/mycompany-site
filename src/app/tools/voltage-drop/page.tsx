import type { Metadata } from "next";
import Link from "next/link";
import VoltageDropCalculator from "@/components/electrical/VoltageDropCalculator";

export const metadata: Metadata = {
  title: "Расчет потери напряжения в кабеле онлайн — подбор сечения по ΔU",
  description:
    "Онлайн-расчет потери напряжения в кабельной линии 220/380 В: по мощности или току, медь и алюминий, таблица по всем сечениям стандартного ряда и подбор минимального сечения. Бесплатно, без регистрации.",
};

export default function VoltageDropPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          ← Все инструменты
        </Link>
        <Link href="/tools/cable-journal" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Кабельный журнал →
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-10">
        <h1 className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Расчет потери напряжения в кабельной линии
        </h1>
        <p className="mb-6 max-w-3xl text-sm text-zinc-500">
          Потеря напряжения для однофазной (220 В) и трехфазной (380 В) линии по мощности или току нагрузки,
          для медных и алюминиевых жил. Таблица по всем сечениям стандартного ряда и подбор минимального
          сечения под допустимую потерю.
        </p>

        <VoltageDropCalculator />

        <section className="mt-10 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Методика расчета</h2>
          <p>
            Потеря напряжения считается по активному сопротивлению жил: ΔU = 2·I·ρ·L·cosφ/S для однофазной
            линии и ΔU = √3·I·ρ·L·cosφ/S для трехфазной, где ρ — удельное сопротивление материала жилы при
            20 °C (медь 0,0175, алюминий 0,028 Ом·мм²/м), L — длина линии в одну сторону, S — сечение жилы.
            Реактивное сопротивление не учитывается — для кабельных линий сечением до 95 мм² его вклад
            незначителен.
          </p>
          <p>
            Обычно допускается потеря до 5% от номинального напряжения до наиболее удаленного
            электроприемника. Выбранное по потере напряжения сечение необходимо дополнительно проверить по
            допустимому длительному току и согласованию с защитным аппаратом по ПУЭ — этот инструмент
            выполняет предварительный расчет и не заменяет проверку квалифицированным инженером.
          </p>
        </section>
      </main>
    </div>
  );
}
