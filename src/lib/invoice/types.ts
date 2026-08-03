export type InvoiceLang = "ru" | "en";

export type LineItem = {
  id: string;
  description: string;
  qty: number;
  rate: number;
};

export type InvoiceData = {
  lang: InvoiceLang;
  number: string;
  issueDate: string; // yyyy-mm-dd
  dueDate: string;
  currency: string; // ISO-код: USD, EUR, KZT, RUB…
  sellerName: string;
  sellerDetails: string; // адрес, ИИН/БИН/ИНН — многострочно
  sellerEmail: string;
  bankDetails: string; // банк, IBAN, SWIFT — многострочно
  clientName: string;
  clientDetails: string;
  items: LineItem[];
  taxPercent: number;
  discountPercent: number;
  notes: string;
};

export type InvoiceTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export function calcTotals(data: InvoiceData): InvoiceTotals {
  const subtotal = data.items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0,
  );
  const discount = subtotal * ((Number(data.discountPercent) || 0) / 100);
  const tax = (subtotal - discount) * ((Number(data.taxPercent) || 0) / 100);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}

export function formatMoney(value: number, currency: string, lang: InvoiceLang): string {
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export const INVOICE_LABELS: Record<
  InvoiceLang,
  {
    invoice: string;
    from: string;
    billTo: string;
    number: string;
    issueDate: string;
    dueDate: string;
    description: string;
    qty: string;
    rate: string;
    amount: string;
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    bank: string;
    notes: string;
  }
> = {
  ru: {
    invoice: "Инвойс",
    from: "Исполнитель",
    billTo: "Заказчик",
    number: "Инвойс №",
    issueDate: "Дата выставления",
    dueDate: "Оплатить до",
    description: "Описание",
    qty: "Кол-во",
    rate: "Цена",
    amount: "Сумма",
    subtotal: "Промежуточный итог",
    discount: "Скидка",
    tax: "Налог",
    total: "Итого к оплате",
    bank: "Платёжные реквизиты",
    notes: "Примечания",
  },
  en: {
    invoice: "Invoice",
    from: "From",
    billTo: "Bill To",
    number: "Invoice #",
    issueDate: "Date issued",
    dueDate: "Due date",
    description: "Description",
    qty: "Qty",
    rate: "Rate",
    amount: "Amount",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    total: "Total due",
    bank: "Payment details",
    notes: "Notes",
  },
};

export function emptyInvoice(): InvoiceData {
  const today = new Date();
  const due = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    lang: "en",
    number: `INV-${today.getFullYear()}-001`,
    issueDate: iso(today),
    dueDate: iso(due),
    currency: "USD",
    sellerName: "",
    sellerDetails: "",
    sellerEmail: "",
    bankDetails: "",
    clientName: "",
    clientDetails: "",
    items: [{ id: "1", description: "", qty: 1, rate: 0 }],
    taxPercent: 0,
    discountPercent: 0,
    notes: "",
  };
}
