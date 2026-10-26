import type { ReactNode } from "react";
import { SHOP, brandName, websiteLabel, fmt, money, billNo } from "../lib/shop";
import { billStatus, sum } from "../lib/data";
import type { Bill, BillItem, Customer, Payment } from "../lib/types";
import { billStatusUi, eyebrow } from "./ui";

/**
 * A4 invoice. Fluid on phones, exact A4 (210 × 297 mm) when printed / saved as PDF.
 * `pays` = payments linked to THIS bill. `outstanding` = customer's total balance (all bills).
 */
export default function Invoice({
  bill,
  customer,
  items,
  pays,
  outstanding,
}: {
  bill: Bill;
  customer: Customer;
  items: BillItem[];
  pays: Payment[];
  outstanding: number;
}) {
  const received = sum(pays.filter((p) => p.status === "received"), (p) => p.amount);
  const pending = sum(pays.filter((p) => p.status === "pending"), (p) => p.amount);
  const balance = Number(bill.total) - received;
  const status = billStatusUi[billStatus(Number(bill.total), received, pending)];
  const showOutstanding = Math.abs(outstanding - balance) > 0.004;

  const th = "px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] sm:px-4";
  const td = "px-2 py-3 align-top text-[13px] sm:px-4 sm:text-sm";

  return (
    <article className="mx-auto flex w-full max-w-[210mm] flex-col overflow-hidden rounded-2xl bg-white text-stone-700 shadow-lg ring-1 ring-stone-200 md:min-h-[297mm] print:min-h-[296mm] print:w-[210mm] print:max-w-none print:rounded-none print:shadow-none print:ring-0">
      <div className="h-1.5 bg-brand" />

      <div className="flex flex-1 flex-col gap-8 p-5 sm:p-10 print:p-[14mm]">
        {/* ────────── Professional invoice header ────────── */}
        <header className="border-b border-stone-300 pb-5 print:pb-4">
          {/* Logo + INVOICE title — Logo is bigger (h-14 / h-20) */}
          <div className="flex items-center justify-between gap-4 pb-8 sm:pb-10 print:pb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SHOP.logo}
              alt={brandName}
              className="h-14 w-auto max-w-[55%] object-contain sm:h-20 print:h-20"
            />
            <h2 className="shrink-0 text-2xl font-light tracking-[0.16em] text-brand sm:text-4xl print:text-4xl">
              INVOICE
            </h2>
          </div>

          {/* Three info columns — ALWAYS 3 columns (no wrap to separate rows) */}
          <section className="grid grid-cols-3 gap-3 pt-6 sm:gap-6 sm:pt-6 print:gap-6 print:pt-6">
            {/* Bill To */}
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 sm:mb-3 sm:text-xs">
                Bill To
              </p>
              <p className="break-words text-xs font-bold leading-5 text-stone-900 sm:text-sm">
                {customer.name}
              </p>
              {customer.address && (
                <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-stone-600 sm:text-sm">
                  Address: {customer.address}
                </p>
              )}
              {customer.phone && (
                <p className="mt-1 break-words text-xs text-stone-600 sm:text-sm">
                  Tel: {customer.phone}
                </p>
              )}
            </div>

            {/* From */}
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 sm:mb-3 sm:text-xs">
                From
              </p>
              <p className="break-words text-xs font-bold leading-5 text-stone-900 sm:text-sm">
                {brandName}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-stone-600 sm:text-sm">
                Address: {SHOP.address}
              </p>
              <p className="mt-1 break-words text-xs text-stone-600 sm:text-sm">
                Tel: {SHOP.phone}
              </p>
            </div>

            {/* Invoice Details — Invoice No font smaller to keep in one row */}
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 sm:mb-3 sm:text-xs">
                Invoice Details
              </p>
              
              <div className="flex items-baseline gap-1 text-xs leading-5 text-stone-600 sm:text-sm sm:leading-6">
                <span className="shrink-0">Invoice No :</span>
                {/* Smaller font applied here so the long ID doesn't push the column */}
                <span className="whitespace-nowrap text-[10px] font-bold text-stone-900 sm:text-[11px]">
                  {billNo(bill)}
                </span>
              </div>
              
              <div className="flex items-baseline gap-1 text-xs leading-5 text-stone-600 sm:text-sm sm:leading-6">
                <span className="shrink-0">Invoice Date :</span>
                <span className="whitespace-nowrap font-semibold tabular-nums text-stone-800">
                  {bill.bill_date}
                </span>
              </div>
              
              <div className="flex items-baseline gap-1 text-xs leading-5 text-stone-600 sm:text-sm sm:leading-6">
                <span className="shrink-0">Status :</span>
                <span className={status.cls}>{status.label}</span>
              </div>
            </div>
          </section>
        </header>

        {/* ────────── Items ────────── */}
        <section>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-brand text-white">
                <th className={`${th} rounded-tl-lg text-left`}>Description</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} rounded-tr-lg text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, n) => (
                <tr
                  key={i.id}
                  className={`border-b border-stone-200 print:break-inside-avoid ${
                    n % 2 ? "bg-stone-50/70" : ""
                  }`}
                >
                  <td className={`${td} font-medium text-ink`}>{i.item_name}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{fmt(i.price)}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{Number(i.qty)}</td>
                  <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums text-ink`}>
                    {fmt(i.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ────────── Payment details + totals ────────── */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_17rem] print:grid-cols-[1fr_17rem] print:break-inside-avoid">
          <div>
            <p className={eyebrow}>Payment details</p>
            {pays.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No payment received yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 text-sm">
                {pays.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-1.5">
                    <span className="capitalize">
                      {p.method}
                      {p.cheque_no ? ` #${p.cheque_no}` : ""}
                      {p.cheque_date ? ` (${p.cheque_date})` : ""}
                      <span className="text-stone-400"> · {p.status}</span>
                    </span>
                    <b className="whitespace-nowrap tabular-nums text-ink">{fmt(p.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
            {bill.notes && <p className="mt-3 text-xs text-stone-500">Note: {bill.notes}</p>}
          </div>

          <div className="text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&>div]:py-1.5 [&>div>b]:tabular-nums">
            <div>
              <span className="text-stone-500">Total</span>
              <b className="text-ink">{money(bill.total)}</b>
            </div>
            <div>
              <span className="text-stone-500">Paid</span>
              <b className="text-ink">{money(received)}</b>
            </div>
            {pending > 0 && (
              <div>
                <span className="text-stone-500">Cheque pending</span>
                <b className="text-ink">{money(pending)}</b>
              </div>
            )}
            <div className="!mt-2 !items-center !rounded-lg !bg-brand !px-4 !py-3 text-white">
              <span className="text-xs font-semibold uppercase tracking-wider">Balance due</span>
              <b className="text-base">{money(balance)}</b>
            </div>
            {showOutstanding && (
              <div className="!text-xs text-stone-500">
                <span>Total outstanding (all bills)</span>
                <b>{money(outstanding)}</b>
              </div>
            )}
          </div>
        </section>

        <p className="mt-auto pt-4 text-center text-sm font-medium tracking-wide text-gold">
          Thank you for your business
        </p>
      </div>

      <footer className="border-t-2 border-gold bg-brand px-4 py-3 text-center text-[11px] font-medium tracking-wide text-white/90">
        {brandName} · {SHOP.address} · Tel {SHOP.phone} · {websiteLabel}
      </footer>
    </article>
  );
}