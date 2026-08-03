import type { Metadata } from "next";
import InvoiceApp from "@/components/invoice/InvoiceApp";
import "./invoice-print.css";

export const metadata: Metadata = {
  title: "Invomat — бесплатный генератор инвойсов для фрилансеров (RU/EN)",
  description:
    "Создайте профессиональный инвойс на английском или русском за 2 минуты: мультивалютность, IBAN/SWIFT-реквизиты, налоги и скидки, скачивание в PDF. Бесплатно, без регистрации.",
};

const faq = [
  {
    q: "Что такое инвойс и зачем он фрилансеру?",
    a: "Инвойс — это счёт на оплату, который исполнитель выставляет заказчику. Зарубежные клиенты (США, ЕС, Upwork с прямыми контрактами) ожидают инвойс на английском с вашими банковскими реквизитами — без него бухгалтерия заказчика просто не проведёт платёж. Банкам при валютном контроле инвойс тоже часто нужен как подтверждающий документ.",
  },
  {
    q: "Что указать в инвойсе для иностранного заказчика?",
    a: "Минимум: ваше имя и адрес, данные заказчика, номер и дату инвойса, срок оплаты, описание услуг с суммами, валюту и платёжные реквизиты — IBAN, SWIFT/BIC и название банка. Invomat подставит все подписи полей на английском автоматически.",
  },
  {
    q: "Это действительно бесплатно?",
    a: "Да. Генератор полностью бесплатен, без регистрации и ограничений по количеству инвойсов. В бесплатной версии внизу PDF стоит небольшая строка «Создано в Invomat» — разовая покупка Pro убирает её навсегда.",
  },
  {
    q: "Куда сохраняются мои данные?",
    a: "Только в ваш браузер (localStorage). Мы не получаем и не храним ваши данные — сайт статический, без сервера и базы данных. Очистите данные браузера — и они исчезнут, поэтому важные инвойсы сохраняйте в PDF.",
  },
  {
    q: "Как скачать PDF?",
    a: "Нажмите «Скачать PDF / Печать» и в диалоге печати выберите «Сохранить как PDF» — так инвойс сохранится с идеальной вёрсткой и любыми шрифтами, включая кириллицу.",
  },
];

export default function InvoicePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/95 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/95 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
              <rect x="1" y="1" width="30" height="30" rx="7" className="fill-emerald-600" />
              <path d="M9 8h14v2.5H9zM9 13h14v2.5H9zM9 18h9v2.5H9z" fill="#fff" />
              <path d="M20.5 19.5l3 3 5-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(-3 1.5) scale(0.9)" />
            </svg>
            Invo<span className="text-emerald-600">mat</span>
          </span>
          <span className="text-sm text-zinc-400">Генератор инвойсов для фрилансеров</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 max-w-3xl print:hidden">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Инвойс для зарубежного заказчика — за 2 минуты
          </h1>
          <p className="mt-3 text-lg text-zinc-500">
            Профессиональный инвойс на английском или русском: мультивалютность,
            IBAN/SWIFT, налоги и скидки, PDF. Бесплатно и без регистрации —
            данные не покидают ваш браузер.
          </p>
        </div>

        <InvoiceApp />

        <section className="mt-16 max-w-3xl print:hidden">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Частые вопросы</h2>
          <dl className="mt-6 space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <dt className="font-semibold text-zinc-900 dark:text-zinc-100">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-zinc-500">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800 print:hidden">
        Вопросы и покупка Pro:{" "}
        <a className="text-emerald-600 hover:underline" href="mailto:linar.caser@gmail.com?subject=Invomat%20Pro">
          linar.caser@gmail.com
        </a>
        <span className="mx-2">·</span>© {new Date().getFullYear()} Invomat.
        Не является налоговой или юридической консультацией.
      </footer>
    </div>
  );
}
