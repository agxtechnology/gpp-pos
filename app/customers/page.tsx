"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadAll, balances, type AllData } from "../../lib/data";
import { money } from "../../lib/shop";
import Loading from "../../components/Loading";
import Empty from "../../components/Empty";
import { card, inp, muted, pageTitle, due, ok } from "../../components/ui";

export default function Customers() {
  const [d, setD] = useState<AllData | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { loadAll().then(setD); }, []);

  if (!d) return <Loading />;
  const bal = balances(d.customers, d.bills, d.payments);
  const list = d.customers.filter((c) =>
    `${c.name} ${c.phone ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <>
      <h1 className={pageTitle}>Customers</h1>
      <input className={`${inp} mb-4`} placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className={card}>
        {list.length === 0 && <Empty icon="👥" title="No customers found" hint="Customers are added automatically when you create a bill." />}
        {list.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 border-b border-stone-100 py-3 last:border-0 active:bg-stone-50">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-base font-bold text-brand">
              {c.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate">{c.name}</b>
              <div className={muted}>{c.phone || "No phone"}</div>
            </div>
            <div className={bal[c.id].balance > 0.004 ? due : ok}>{money(bal[c.id].balance)}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
