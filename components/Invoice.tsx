import type { ReactNode } from "react";
import { SHOP, brandName, websiteLabel, fmt, money, billNo } from "../lib/shop";
import { billStatus, sum } from "../lib/data";
import type { Bill, BillItem, Customer, Payment } from "../lib/types";
import { billStatusUi, eyebrow } from "./ui";

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[3.4rem_1fr] gap-2 text-sm">
      <dt className="pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{label}</dt>
      <dd className="min-w-0 break-words text-stone-700">{children}</dd>
    </div>
  );
}

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
        {/* header: logo + invoice title */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between print:flex-row print:items-end print:justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SHOP.logo} alt={brandName} className="w-52 sm:w-64 print:w-64" />
          <div className="sm:text-right print:text-right">
            <h2 className="text-3xl font-light tracking-[0.32em] text-brand sm:text-4xl">INVOICE</h2>
          </div>
        </header>

        <div className="h-px bg-gradient-to-r from-gold via-gold/40 to-transparent" />

        {/* invoice details strip */}
        <section className="grid grid-cols-1 divide-y divide-stone-200 overflow-hidden rounded-xl bg-stone-50 ring-1 ring-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 print:grid-cols-3 print:divide-x print:divide-y-0">
          <div className="px-4 py-3">
            <p className={eyebrow}>Invoice no</p>
            <p className="mt-1 break-all text-sm font-bold tabular-nums text-ink">{billNo(bill)}</p>
          </div>
          <div className="px-4 py-3">
            <p className={eyebrow}>Invoice date</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-ink">{bill.bill_date}</p>
          </div>
          <div className="px-4 py-3">
            <p className={eyebrow}>Status</p>
            <span className={`${status.cls} mt-1 inline-block`}>{status.label}</span>
          </div>
        </section>

        {/* billed to / from */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-xl border-l-[3px] border-gold bg-white p-4 ring-1 ring-stone-200">
            <p className={eyebrow}>Billed to</p>
            <p className="mt-2 text-base font-bold leading-snug text-ink">{customer.name}</p>
            <dl className="mt-2 space-y-1">
              {customer.phone && <Line label="Tel">{customer.phone}</Line>}
              {customer.address && <Line label="Address">{customer.address}</Line>}
            </dl>
          </div>
          <div className="rounded-xl border-l-[3px] border-brand bg-white p-4 ring-1 ring-stone-200">
            <p className={eyebrow}>From</p>
            <p className="mt-2 text-base font-bold leading-snug text-ink">{brandName}</p>
            <dl className="mt-2 space-y-1">
              <Line label="Address">{SHOP.address}</Line>
              <Line label="Tel">{SHOP.phone}</Line>
            </dl>
          </div>
        </section>

        {/* items */}
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
                <tr key={i.id} className={`border-b border-stone-200 print:break-inside-avoid ${n % 2 ? "bg-stone-50/70" : ""}`}>
                  <td className={`${td} font-medium text-ink`}>{i.item_name}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{fmt(i.price)}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{Number(i.qty)}</td>
                  <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums text-ink`}>{fmt(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-right text-[11px] text-stone-400">Amounts in Sri Lankan Rupees (Rs.)</p>
        </section>

        {/* payment details + totals */}
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
            <div><span className="text-stone-500">Total</span><b className="text-ink">{money(bill.total)}</b></div>
            <div><span className="text-stone-500">Paid</span><b className="text-ink">{money(received)}</b></div>
            {pending > 0 && <div><span className="text-stone-500">Cheque pending</span><b className="text-ink">{money(pending)}</b></div>}
            <div className="!mt-2 !items-center !rounded-lg !bg-brand !px-4 !py-3 text-white">
              <span className="text-xs font-semibold uppercase tracking-wider">Balance due</span>
              <b className="text-base">{money(balance)}</b>
            </div>
            {showOutstanding && (
              <div className="!text-xs text-stone-500"><span>Total outstanding (all bills)</span><b>{money(outstanding)}</b></div>
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
