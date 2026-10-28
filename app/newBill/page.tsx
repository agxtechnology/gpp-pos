"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { money, invoiceNoBase, nextInvoiceNo } from "../../lib/shop";
import { isValidPhone, num, round2 } from "../../lib/num";
import { customerBalance } from "../../lib/data";
import { localDate, useToday } from "../../lib/useToday";
import type { Customer, Payment } from "../../lib/types";
import { NumInput, PhoneInput, Seg } from "../../components/Fields";
import { btn, card, h3, inp, label, grid2, muted, pageTitle, errBox } from "../../components/ui";

type Line = { name: string; qty: string; price: string };
type PayMethod = "later" | Payment["method"];

const blank = (): Line => ({ name: "", qty: "1", price: "" });
const lineAmt = (i: Line) => round2(num(i.qty) * num(i.price));
const errMsg = (e: unknown) => (e as { message?: string })?.message ?? String(e);

export default function NewBill() {
  const router = useRouter();
  const today = useToday(); // "" during prerender, real date in the browser

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cust, setCust] = useState<{ id: number | null; name: string; phone: string; address: string }>({
    id: null, name: "", phone: "", address: "",
  });
  const [items, setItems] = useState<Line[]>([blank()]);
  const [dateInput, setDateInput] = useState<string | null>(null);
  const date = dateInput ?? today;
  const [notes, setNotes] = useState("");
  const [pay, setPay] = useState<{ amount: string; method: PayMethod; cheque_no: string; cheque_date: string }>({
    amount: "", method: "later", cheque_no: "", cheque_date: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase
      .from("customers")
      .select("*")
      .order("name")
      .then(({ data }) => setCustomers((data ?? []) as Customer[]));
  }, []);

  const total = useMemo(() => round2(items.reduce((s, i) => s + lineAmt(i), 0)), [items]);

  // old balance of the selected customer (added to this invoice)
  const [prev, setPrev] = useState<{ id: number; value: number } | null>(null);
  useEffect(() => {
    if (!cust.id) return;
    const id = cust.id;
    customerBalance(id).then((value) => setPrev({ id, value }));
  }, [cust.id]);
  const previous = cust.id && prev?.id === cust.id ? prev.value : 0;
  const payable = round2(total + previous);

  const q = cust.name.trim().toLowerCase();
  const matches =
    cust.id === null && q
      ? customers.filter((c) => c.name.toLowerCase().includes(q) && c.name.toLowerCase() !== q).slice(0, 5)
      : [];

  const pick = (c: Customer) =>
    setCust({ id: c.id, name: c.name, phone: c.phone ?? "", address: c.address ?? "" });
  const onName = (v: string) =>
    setCust((s) => (s.id ? { id: null, name: v, phone: "", address: "" } : { ...s, name: v }));
  const setItem = (idx: number, k: keyof Line, v: string) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr("");

    // ---------- business rules ----------
    const name = cust.name.trim();
    if (name.length < 2) return setErr("Enter the customer name.");
    if (cust.phone && !isValidPhone(cust.phone)) return setErr("Enter a valid phone number (9–12 digits).");

    const used = items.map((it, i) => ({ it, i })).filter(({ it }) => it.name.trim() || it.price);
    if (!used.length) return setErr("Add at least one item.");

    const rows: { item_name: string; qty: number; price: number }[] = [];
    for (const { it, i } of used) {
      const qty = num(it.qty);
      const price = num(it.price);
      if (it.name.trim().length < 2) return setErr(`Item ${i + 1}: enter the item name.`);
      if (qty <= 0) return setErr(`Item ${i + 1}: quantity must be more than 0.`);
      if (qty > 99999) return setErr(`Item ${i + 1}: quantity is too large.`);
      if (price <= 0) return setErr(`Item ${i + 1}: enter the price.`);
      rows.push({ item_name: it.name.trim(), qty, price });
    }
    const billTotal = round2(rows.reduce((s, r) => s + round2(r.qty * r.price), 0));
    if (billTotal > 9_999_999_999) return setErr("Bill total is too large.");

    const payAmt = round2(num(pay.amount));
    if (pay.method !== "later") {
      if (payAmt <= 0) return setErr("Enter the amount paid, or choose “Pay later”.");
      if (payAmt > billTotal + previous + 0.004)
        return setErr(`Payment is more than the total due (${money(billTotal + previous)}).`);
      if (pay.method === "cheque") {
        if (!pay.cheque_no.trim()) return setErr("Enter the cheque number.");
        if (!pay.cheque_date) return setErr("Enter the cheque date.");
      }
    }

    // ---------- save ----------
    setBusy(true);
    let billId: number | null = null;
    try {
      let cid = cust.id;
      if (!cid) {
        const dup = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (dup && confirm(`A customer named “${dup.name}” already exists.\nUse the existing customer?`)) cid = dup.id;
      }
      const phone = cust.phone.trim();
      const address = cust.address.trim();
      let previousNow = 0; // what this customer owed BEFORE this bill
      if (cid) {
        previousNow = await customerBalance(cid);
        const patch = { ...(phone && { phone }), ...(address && { address }) };
        if (Object.keys(patch).length) {
          const { error } = await supabase.from("customers").update(patch).eq("id", cid);
          if (error) throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({ name, phone: phone || null, address: address || null })
          .select()
          .single();
        if (error) throw error;
        cid = (data as Customer).id;
      }

      if (pay.method !== "later" && payAmt > billTotal + previousNow + 0.004)
        throw new Error(`Payment is more than the total due (${money(billTotal + previousNow)}).`);

      const billDate = date || localDate();
      const base = invoiceNoBase(billDate, name);
      const { data: same } = await supabase.from("bills").select("invoice_no").like("invoice_no", `${base}%`);
      const invoice_no = nextInvoiceNo(base, (same ?? []).map((r: { invoice_no: string | null }) => r.invoice_no ?? ""));

      const { data: bill, error: be } = await supabase
        .from("bills")
        .insert({ customer_id: cid, bill_date: billDate, total: billTotal, notes: notes.trim() || null, invoice_no, previous_balance: previousNow })
        .select()
        .single();
      if (be) throw be;
      billId = (bill as { id: number }).id;

      const { error: ie } = await supabase
        .from("bill_items")
        .insert(rows.map((r) => ({ ...r, bill_id: billId })));
      if (ie) throw ie;

      if (pay.method !== "later") {
        const { error: pe } = await supabase.from("payments").insert({
          customer_id: cid,
          bill_id: billId,
          amount: payAmt,
          method: pay.method,
          cheque_no: pay.method === "cheque" ? pay.cheque_no.trim() : null,
          cheque_date: pay.method === "cheque" ? pay.cheque_date : null,
          status: pay.method === "cheque" ? "pending" : "received",
        });
        if (pe) throw pe;
      }
      router.push(`/bill/${billId}`);
    } catch (error) {
      if (billId) await supabase.from("bills").delete().eq("id", billId); // don't leave half-saved bills
      setErr(errMsg(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <h1 className={pageTitle}>New Bill</h1>

      {/* 1 · customer */}
      <section className={card}>
        <h3 className={h3}>1 · Customer</h3>
        <div className={grid2}>
          <div>
            <label className={`${label} !mt-0`}>Name</label>
            <input className={inp} value={cust.name} onChange={(e) => onName(e.target.value)} placeholder="Customer name" autoComplete="off" />
          </div>
          <div>
            <label className={`${label} sm:!mt-0`}>Phone</label>
            <PhoneInput placeholder="07X XXX XXXX" value={cust.phone} onChange={(v) => setCust({ ...cust, phone: v })} />
          </div>
        </div>

        {cust.id ? (
          <p className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-800">
            ✓ Existing customer selected
            <button type="button" className="font-semibold underline" onClick={() => setCust({ id: null, name: "", phone: "", address: "" })}>
              Clear
            </button>
          </p>
        ) : (
          matches.length > 0 && (
            <div className="mt-3">
              <p className={muted}>Existing customers — tap to use:</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {matches.map((c) => (
                  <button key={c.id} type="button" onClick={() => pick(c)} className="rounded-full border border-brand/30 bg-brand/5 px-3.5 py-1.5 text-sm font-semibold text-brand">
                    {c.name}
                    {c.phone ? <span className="font-normal text-stone-500"> · {c.phone}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        <label className={label}>Address</label>
        <input className={inp} value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} placeholder="Customer address (optional)" />

        {cust.id && previous > 0.004 && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800">
            Previous Balance <b>{money(previous)}</b> will be added to this invoice.
          </p>
        )}
      </section>

      {/* 2 · items */}
      <section className={card}>
        <h3 className={h3}>2 · Items</h3>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-stone-400">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" className="text-sm font-semibold text-red-700" onClick={() => setItems((a) => a.filter((_, i) => i !== idx))}>
                    Remove
                  </button>
                )}
              </div>
              <input className={inp} placeholder="Item name (e.g. Glass 12x15)" value={it.name} onChange={(e) => setItem(idx, "name", e.target.value)} />
              <div className="mt-2 grid grid-cols-[1fr_1.4fr] gap-2">
                <div>
                  <span className="mb-1 block text-xs font-medium text-stone-500">Qty</span>
                  <NumInput placeholder="1" value={it.qty} onChange={(v) => setItem(idx, "qty", v)} />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-stone-500">Price (Rs.)</span>
                  <NumInput placeholder="0.00" value={it.price} onChange={(v) => setItem(idx, "price", v)} />
                </div>
              </div>
              <p className="mt-2 text-right text-sm text-stone-500">
                Amount: <b className="text-base text-stone-900">{money(lineAmt(it))}</b>
              </p>
            </div>
          ))}
        </div>
        <button type="button" className={`${btn("ghost")} mt-3 w-full border-dashed`} onClick={() => setItems((a) => [...a, blank()])}>
          + Add item
        </button>
      </section>

      {/* 3 · payment */}
      <section className={card}>
        <h3 className={h3}>3 · Payment now</h3>
        <Seg<PayMethod>
          value={pay.method}
          onChange={(v) => setPay({ ...pay, method: v })}
          cols="grid-cols-2 sm:grid-cols-4"
          options={[
            { value: "later", label: "Pay later" },
            { value: "cash", label: "Cash" },
            { value: "cheque", label: "Cheque" },
            { value: "bank", label: "Bank" },
          ]}
        />
        {pay.method === "later" && <p className={`${muted} mt-2`}>The full bill amount is added to the customer’s balance.</p>}

        {pay.method !== "later" && (
          <>
            <label className={label}>Amount Paid (Rs.)</label>
            <NumInput placeholder="0.00" value={pay.amount} onChange={(v) => setPay({ ...pay, amount: v })} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <button type="button" className="text-sm font-semibold text-brand" onClick={() => setPay({ ...pay, amount: total.toFixed(2) })}>
                Current Bill: {money(total)}
              </button>
              {previous > 0.004 && (
                <button type="button" className="text-sm font-semibold text-brand" onClick={() => setPay({ ...pay, amount: payable.toFixed(2) })}>
                  Bill + old balance: {money(payable)}
                </button>
              )}
            </div>
            {num(pay.amount) > 0 && num(pay.amount) < payable && (
              <p className={`${muted} mt-1`}>Balance left after this payment: {money(payable - num(pay.amount))}</p>
            )}
          </>
        )}

        {pay.method === "cheque" && (
          <div className={grid2}>
            <div>
              <label className={label}>Cheque number</label>
              <input className={inp} inputMode="numeric" value={pay.cheque_no} onChange={(e) => setPay({ ...pay, cheque_no: e.target.value.replace(/[^\dA-Za-z-]/g, "").slice(0, 20) })} />
            </div>
            <div>
              <label className={label}>Cheque date</label>
              <input className={inp} type="date" value={pay.cheque_date} onChange={(e) => setPay({ ...pay, cheque_date: e.target.value })} />
            </div>
            <p className={`${muted} sm:col-span-2`}>A cheque stays <b>pending</b> until you mark it Cleared.</p>
          </div>
        )}

        <div className={`${grid2} mt-1`}>
          <div>
            <label className={label}>Bill date</label>
            <input className={inp} type="date" value={date} onChange={(e) => setDateInput(e.target.value)} />
          </div>
          <div>
            <label className={label}>Notes (optional)</label>
            <input className={inp} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </section>

      {/* sticky total + save */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 -mx-1 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        {err && <p className={`${errBox} mb-2`}>{err}</p>}
        <div className="flex items-center gap-3">
          <div className="leading-tight">
            <span className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              {previous > 0.004 ? "Total Due" : "Total"}
            </span>
            <b className="text-xl text-brand">{money(payable)}</b>
            {previous > 0.004 && (
              <span className="block text-[11px] text-stone-500">Bill {money(total)} + old {money(previous)}</span>
            )}
          </div>
          <button className={`${btn()} ml-auto !min-h-12 flex-1 text-base sm:max-w-xs`} disabled={busy}>
            {busy ? "Saving…" : "Save & create e-bill"}
          </button>
        </div>
      </div>
    </form>
  );
}