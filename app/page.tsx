"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loadAll, balances, paidByBill, billStatus, sum, type AllData } from "../lib/data";
import { money, billNo } from "../lib/shop";
import { PaymentList } from "../components/Payments";
import Loading from "../components/Loading";
import Empty from "../components/Empty";
import { card, h3, muted, stat, statLabel, row, due, billStatusUi } from "../components/ui";

export default function Dashboard() {
  const [d, setD] = useState<AllData | null>(null);
  const load = useCallback(async () => setD(await loadAll()), []);
  useEffect(() => { loadAll().then(setD); }, []);

  if (!d) return <Loading />;

  const bal = balances(d.customers, d.bills, d.payments);
  const cmap = Object.fromEntries(d.customers.map((c) => [c.id, c]));
  const per = paidByBill(d.payments);

  const revenue = sum(d.bills, (b) => b.total);
  const received = sum(d.payments.filter((p) => p.status === "received"), (p) => p.amount);
  const pendingCheques = d.payments
    .filter((p) => p.status === "pending")
    .sort((a, b) => (a.cheque_date ?? "").localeCompare(b.cheque_date ?? ""));
  const owing = d.customers
    .map((c) => ({ ...c, ...bal[c.id] }))
    .filter((c) => c.balance > 0.004)
    .sort((a, b) => b.balance - a.balance);
  const totalDebt = sum(owing, (c) => c.balance);

  return (
    <>
      {/* hero */}
      <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Total to receive</p>
        <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">{money(totalDebt)}</p>
        <p className="mt-1 text-sm text-white/70">
          {owing.length === 0 ? "All customers are settled" : `from ${owing.length} customer${owing.length > 1 ? "s" : ""}`}
        </p>
        <div className="mt-4 h-px bg-gold/60" />
        <Link href="/newBill" className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-[15px] font-bold text-brand transition active:scale-[.98] sm:w-auto">
          + Create new bill
        </Link>
      </section>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className={stat}>
          <small className={statLabel}>Revenue</small>
          <b className="mt-0.5 block text-[15px] tabular-nums text-ink sm:text-lg">{money(revenue)}</b>
        </div>
        <div className={stat}>
          <small className={statLabel}>Received</small>
          <b className="mt-0.5 block text-[15px] tabular-nums text-emerald-700 sm:text-lg">{money(received)}</b>
        </div>
        <div className={stat}>
          <small className={statLabel}>Cheques</small>
          <b className="mt-0.5 block text-[15px] tabular-nums text-ink sm:text-lg">
            {money(sum(pendingCheques, (p) => p.amount))}
          </b>
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Customers who owe</h3>
        {owing.length === 0 && <Empty icon="🎉" title="Nobody owes anything" hint="Great — all bills are settled." />}
        {owing.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className={row}>
            <div className="min-w-0">
              <b className="block truncate text-ink">{c.name}</b>
              <div className={muted}>
                {c.phone}
                {c.pending > 0 ? ` · cheque pending ${money(c.pending)}` : ""}
              </div>
            </div>
            <div className={due}>{money(c.balance)}</div>
          </Link>
        ))}
      </div>

      <div className={card}>
        <h3 className={h3}>Pending cheques</h3>
        {pendingCheques.length === 0 ? (
          <Empty icon="🧾" title="No pending cheques" />
        ) : (
          <PaymentList payments={pendingCheques} customers={cmap} onChange={load} />
        )}
      </div>

      <div className={card}>
        <h3 className={h3}>Recent bills</h3>
        {d.bills.length === 0 && <Empty icon="🖼️" title="No bills yet" hint="Create your first bill to get started." />}
        {d.bills.slice(0, 8).map((b) => {
          const p = per[b.id] ?? { received: 0, pending: 0 };
          const st = billStatusUi[billStatus(Number(b.total), p.received, p.pending)];
          return (
            <Link key={b.id} href={`/bill/${b.id}`} className={row}>
              <div className="min-w-0">
                <b className="block truncate text-ink">{cmap[b.customer_id]?.name}</b>
                <div className={muted}>
                  {billNo(b)} · {b.bill_date}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums text-ink">{money(b.total)}</div>
                <span className={st.cls}>{st.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
