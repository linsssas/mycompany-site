"use client";

import { useEffect, useState } from "react";
import InvoicePreview from "@/components/invoice/InvoicePreview";
import { InvoiceData, LineItem, emptyInvoice } from "@/lib/invoice/types";
import { isValidLicense, LICENSE_STORAGE_KEY } from "@/lib/invoice/license";

const DATA_STORAGE_KEY = "invomat.invoice";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelCls = "mb-1 block text-xs font-semibold text-zinc-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export default function InvoiceApp() {
  const [data, setData] = useState<InvoiceData>(emptyInvoice);
  const [license, setLicense] = useState("");
  const [licenseInput, setLicenseInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Гидратация из localStorage возможна только после маунта (SSG-пререндер не
  // имеет доступа к браузеру), поэтому setState в эффекте здесь неизбежен.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DATA_STORAGE_KEY);
      if (saved) setData({ ...emptyInvoice(), ...JSON.parse(saved) });
      const savedLicense = localStorage.getItem(LICENSE_STORAGE_KEY) ?? "";
      if (isValidLicense(savedLicense)) setLicense(savedLicense);
    } catch {
      // повреждённые данные игнорируем
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded]);

  const pro = isValidLicense(license);

  const patch = (p: Partial<InvoiceData>) => setData((d) => ({ ...d, ...p }));

  const patchItem = (id: string, p: Partial<LineItem>) =>
    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, ...p } : it)),
    }));

  const addItem = () =>
    setData((d) => ({
      ...d,
      items: [...d.items, { id: String(Date.now()), description: "", qty: 1, rate: 0 }],
    }));

  const removeItem = (id: string) =>
    setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));

  const applyLicense = () => {
    const key = licenseInput.trim().toUpperCase();
    if (isValidLicense(key)) {
      localStorage.setItem(LICENSE_STORAGE_KEY, key);
      setLicense(key);
      setLicenseInput("");
    } else {
      alert("Ключ не распознан. Проверьте формат: IVM-XXXX-XXXX.");
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      {/* Форма */}
      <div className="space-y-5 print:hidden">
        <div className="flex gap-2">
          {(["en", "ru"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => patch({ lang })}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                data.lang === lang
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {lang === "en" ? "Инвойс на английском" : "Инвойс на русском"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Номер инвойса">
            <input className={inputCls} value={data.number} onChange={(e) => patch({ number: e.target.value })} />
          </Field>
          <Field label="Валюта (код)">
            <input className={inputCls} value={data.currency} onChange={(e) => patch({ currency: e.target.value.toUpperCase() })} placeholder="USD" />
          </Field>
          <Field label="Дата выставления">
            <input type="date" className={inputCls} value={data.issueDate} onChange={(e) => patch({ issueDate: e.target.value })} />
          </Field>
          <Field label="Оплатить до">
            <input type="date" className={inputCls} value={data.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
          </Field>
        </div>

        <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-bold text-zinc-700 dark:text-zinc-200">Вы (исполнитель)</legend>
          <div className="space-y-3">
            <Field label="Имя / название">
              <input className={inputCls} value={data.sellerName} onChange={(e) => patch({ sellerName: e.target.value })} placeholder="Ivan Petrov" />
            </Field>
            <Field label="Адрес, ИИН/ИНН (каждая строка — с новой строки)">
              <textarea className={inputCls} rows={2} value={data.sellerDetails} onChange={(e) => patch({ sellerDetails: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputCls} value={data.sellerEmail} onChange={(e) => patch({ sellerEmail: e.target.value })} />
            </Field>
            <Field label="Платёжные реквизиты (банк, IBAN, SWIFT…)">
              <textarea className={inputCls} rows={3} value={data.bankDetails} onChange={(e) => patch({ bankDetails: e.target.value })} placeholder={"Bank: Kaspi Bank\nIBAN: KZ00...\nSWIFT: CASPKZKA"} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-bold text-zinc-700 dark:text-zinc-200">Заказчик</legend>
          <div className="space-y-3">
            <Field label="Имя / компания">
              <input className={inputCls} value={data.clientName} onChange={(e) => patch({ clientName: e.target.value })} placeholder="Acme Inc." />
            </Field>
            <Field label="Адрес и детали">
              <textarea className={inputCls} rows={2} value={data.clientDetails} onChange={(e) => patch({ clientDetails: e.target.value })} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-sm font-bold text-zinc-700 dark:text-zinc-200">Позиции</legend>
          <div className="space-y-3">
            {data.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_64px_96px_28px] items-end gap-2">
                <Field label="Описание">
                  <input className={inputCls} value={item.description} onChange={(e) => patchItem(item.id, { description: e.target.value })} placeholder="Web development, June" />
                </Field>
                <Field label="Кол-во">
                  <input type="number" min="0" step="any" className={inputCls} value={item.qty} onChange={(e) => patchItem(item.id, { qty: Number(e.target.value) })} />
                </Field>
                <Field label="Цена">
                  <input type="number" min="0" step="any" className={inputCls} value={item.rate} onChange={(e) => patchItem(item.id, { rate: Number(e.target.value) })} />
                </Field>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={data.items.length === 1}
                  className="mb-1 rounded-md px-1.5 py-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Удалить позицию"
                >
                  ✕
                </button>
              </div>
            ))}
            <button onClick={addItem} className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200">
              + Добавить позицию
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Скидка, %">
                <input type="number" min="0" max="100" step="any" className={inputCls} value={data.discountPercent} onChange={(e) => patch({ discountPercent: Number(e.target.value) })} />
              </Field>
              <Field label="Налог, %">
                <input type="number" min="0" max="100" step="any" className={inputCls} value={data.taxPercent} onChange={(e) => patch({ taxPercent: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Примечания (условия оплаты и т.п.)">
              <textarea className={inputCls} rows={2} value={data.notes} onChange={(e) => patch({ notes: e.target.value })} />
            </Field>
          </div>
        </fieldset>

        <button
          onClick={() => window.print()}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500"
        >
          Скачать PDF / Печать
        </button>
        <p className="text-center text-xs text-zinc-400">
          В диалоге печати выберите «Сохранить как PDF». Данные хранятся только в
          вашем браузере.
        </p>

        {!pro && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">
              Invomat Pro — 4 990 ₸ (~$10) разово
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
              Убирает строку «Создано в Invomat» из PDF. Навсегда, на этом
              устройстве и любых других.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className={inputCls}
                placeholder="IVM-XXXX-XXXX"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
              />
              <button onClick={applyLicense} className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500">
                Активировать
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Нет ключа? Напишите на почту из подвала страницы — вышлем счёт и ключ.
            </p>
          </div>
        )}
        {pro && (
          <p className="text-center text-sm font-semibold text-emerald-600">
            ✓ Pro активирован — брендинг в PDF отключён
          </p>
        )}
      </div>

      {/* Превью */}
      <div className="min-w-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 print:hidden">
          Предпросмотр
        </p>
        <InvoicePreview data={data} branded={!pro} />
      </div>
    </div>
  );
}
