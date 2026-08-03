"use client";

import {
  InvoiceData,
  INVOICE_LABELS,
  calcTotals,
  formatMoney,
} from "@/lib/invoice/types";

function MultiLine({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </>
  );
}

export default function InvoicePreview({
  data,
  branded,
}: {
  data: InvoiceData;
  branded: boolean;
}) {
  const L = INVOICE_LABELS[data.lang];
  const totals = calcTotals(data);
  const fmt = (v: number) => formatMoney(v, data.currency, data.lang);
  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(data.lang === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div
      id="invoice-print"
      className="mx-auto w-full max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-zinc-900 shadow-sm ring-1 ring-zinc-200 print:max-w-none print:p-0 print:shadow-none print:ring-0"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-2xl font-extrabold tracking-tight">{L.invoice}</p>
          <p className="mt-1 font-semibold">{data.number || "—"}</p>
        </div>
        <div className="text-right text-zinc-600">
          <p>
            <span className="font-semibold text-zinc-900">{L.issueDate}: </span>
            {fmtDate(data.issueDate)}
          </p>
          <p>
            <span className="font-semibold text-zinc-900">{L.dueDate}: </span>
            {fmtDate(data.dueDate)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{L.from}</p>
          <p className="mt-1 font-semibold">{data.sellerName || "—"}</p>
          <p className="text-zinc-600">
            <MultiLine text={data.sellerDetails} />
            {data.sellerEmail && <span className="block">{data.sellerEmail}</span>}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{L.billTo}</p>
          <p className="mt-1 font-semibold">{data.clientName || "—"}</p>
          <p className="text-zinc-600">
            <MultiLine text={data.clientDetails} />
          </p>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-zinc-900 text-left text-xs font-bold uppercase tracking-wide">
            <th className="py-2 pr-2">{L.description}</th>
            <th className="w-16 py-2 pr-2 text-right">{L.qty}</th>
            <th className="w-28 py-2 pr-2 text-right">{L.rate}</th>
            <th className="w-32 py-2 text-right">{L.amount}</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.id} className="border-b border-zinc-200 align-top">
              <td className="py-2 pr-2">{item.description || "—"}</td>
              <td className="py-2 pr-2 text-right">{item.qty}</td>
              <td className="py-2 pr-2 text-right">{fmt(Number(item.rate) || 0)}</td>
              <td className="py-2 text-right">{fmt((Number(item.qty) || 0) * (Number(item.rate) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64 space-y-1">
        <div className="flex justify-between text-zinc-600">
          <span>{L.subtotal}</span>
          <span>{fmt(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-zinc-600">
            <span>
              {L.discount} ({data.discountPercent}%)
            </span>
            <span>−{fmt(totals.discount)}</span>
          </div>
        )}
        {totals.tax > 0 && (
          <div className="flex justify-between text-zinc-600">
            <span>
              {L.tax} ({data.taxPercent}%)
            </span>
            <span>{fmt(totals.tax)}</span>
          </div>
        )}
        <div className="flex justify-between border-t-2 border-zinc-900 pt-2 text-base font-extrabold">
          <span>{L.total}</span>
          <span>{fmt(totals.total)}</span>
        </div>
      </div>

      {data.bankDetails && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{L.bank}</p>
          <p className="mt-1 text-zinc-600">
            <MultiLine text={data.bankDetails} />
          </p>
        </div>
      )}

      {data.notes && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{L.notes}</p>
          <p className="mt-1 text-zinc-600">
            <MultiLine text={data.notes} />
          </p>
        </div>
      )}

      {branded && (
        <p className="mt-10 border-t border-zinc-200 pt-3 text-center text-[10px] text-zinc-400">
          {data.lang === "ru" ? "Создано в Invomat — бесплатный генератор инвойсов" : "Created with Invomat — free invoice generator"}
        </p>
      )}
    </div>
  );
}
