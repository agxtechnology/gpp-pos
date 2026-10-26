"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { SHOP, money, billNo, waLink } from "../../../lib/shop";
import { paidByBill, billStatus, sum } from "../../../lib/data";
import type { Bill, Customer, Payment } from "../../../lib/types";
import { PaymentForm, PaymentList } from "../../../components/Payments";
import Loading from "../../../components/Loading";
import CustomerEdit from "../../../components/CustomerEdit";
import Empty from "../../../components/Empty";
import {
  btn, card, h3, muted, stats, stat, statLabel, row, due, ok, billStatusUi,
} from "../../../components/ui";

type State = { c: Customer | null; bills: Bill[]; pays: Payment[] };

// useParams() must live under <Suspense> in Next 16 (Cache Components)
export default function CustomerPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomerView />
    </Suspense>
  );
}

async function fetchCustomer(id: string): Promise<State> {
  const [c, b, p] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("bills").select("*").eq("customer_id", id).order("id", { ascending: false }),
    supabase.from("payments").select("*").eq("customer_id", id).order("id", { ascending: false }),
  ]);
  return {
    c: (c.data as Customer | null) ?? null,
    bills: (b.data ?? []) as Bill[],
    pays: (p.data ?? []) as Payment[],
  };
}

function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<State | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => setD(await fetchCustomer(id)), [id]);
  useEffect(() => { fetchCustomer(id).then(setD); }, [id]);

  if (!d) return <Loading />;
  if (!d.c) return <p className="p-6 text-center">Customer not found.</p>;

  const billed = sum(d.bills, (b) => b.total);
  const paid = sum(d.pays.filter((p) => p.status === "received"), (p) => p.amount);
  const pending = sum(d.pays.filter((p) => p.status === "pending"), (p) => p.amount);
  const balance = billed - paid;
  const per = paidByBill(d.pays);

  const remind =
    balance > 0.004
      ? waLink(
          d.c.phone,
          `Dear ${d.c.name}, this is a friendly reminder from ${SHOP.name}. Your outstanding balance is ${money(balance)}. Thank you!`
        )
      : null;

  return (
    <>
      <div className={card}>
        {editing ? (
          <>
            <h3 className={h3}>Edit customer</h3>
            <CustomerEdit
              customer={d.c}
              onCancel={() => setEditing(false)}
              onSaved={() => { setEditing(false); load(); }}
            />
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-bold text-white ring-4 ring-gold/20">
              {d.c.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-extrabold">{d.c.name}</h1>
              {d.c.phone && <a href={`tel:${d.c.phone}`} className="block text-sm font-semibold text-brand">{d.c.phone}</a>}
              {d.c.address && <p className={muted}>{d.c.address}</p>}
            </div>
            <button className={btn("ghost", "sm")} onClick={() => setEditing(true)}>Edit</button>
          </div>
        )}
      </div>

      <div className={stats}>
        <div className={stat}><small className={statLabel}>Total billed</small><b className="text-xl">{money(billed)}</b></div>
        <div className={stat}><small className={statLabel}>Received</small><b className={`text-xl ${ok}`}>{money(paid)}</b></div>
        <div className={stat}><small className={statLabel}>Cheque pending</small><b className="text-xl">{money(pending)}</b></div>
        <div className={`${stat} border-red-200 bg-red-50/60`}><small className={statLabel}>Balance due</small><b className={`text-xl ${due}`}>{money(balance)}</b></div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/newBill" className={`${btn()} flex-1 sm:flex-none`}>+ New bill</Link>
        {remind && <a href={remind} target="_blank" rel="noreferrer" className={`${btn("wa")} flex-1 sm:flex-none`}>WhatsApp reminder</a>}
      </div>

      <div className={card}>
        <h3 className={h3}>Add payment (against total balance)</h3>
        <PaymentForm customerId={d.c.id} maxAmount={Math.max(0, balance - pending)} onSaved={load} />
      </div>

      <div className={card}>
        <h3 className={h3}>Payments</h3>
        <PaymentList payments={d.pays} onChange={load} />
      </div>

      <div className={card}>
        <h3 className={h3}>Bills</h3>
        {d.bills.length === 0 && <Empty icon="🖼️" title="No bills yet" />}
        {d.bills.map((b) => {
          const p = per[b.id] ?? { received: 0, pending: 0 };
          const st = billStatusUi[billStatus(Number(b.total), p.received, p.pending)];
          return (
            <Link key={b.id} href={`/bill/${b.id}`} className={row}>
              <div>
                <b>{billNo(b)}</b>
                <div className={muted}>{b.bill_date}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{money(b.total)}</div>
                <span className={st.cls}>{st.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
