"use client";
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { money } from "../lib/shop";
import { num, round2 } from "../lib/num";
import { useToday } from "../lib/useToday";
import type { Customer, Payment } from "../lib/types";
import { NumInput, Seg } from "./Fields";
import { btn, inp, label, muted, badge, errBox } from "./ui";

type Method = Payment["method"];

const EMPTY = { amount: "", method: "cash" as Method, cheque_no: "", cheque_date: "", note: "" };

/**
 * maxAmount = the most that can still be collected (balance − pending cheques).
 * Stops over-payments, and cheques must have a number + date.
 */
export function PaymentForm({
  customerId,
  billId = null,
  maxAmount,
  onSaved,
}: {
  customerId: number;
  billId?: number | null;
  maxAmount?: number;
  onSaved?: () => void;
}) {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  if (maxAmount !== undefined && maxAmount <= 0.004) {
    return <p className={muted}>Nothing left to collect right now.</p>;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const amt = round2(num(f.amount));
    if (amt <= 0) return setErr("Enter an amount greater than 0.");
    if (maxAmount !== undefined && amt > round2(maxAmount) + 0.004)
      return setErr(`Amount is more than the balance due (${money(maxAmount)}).`);
    if (f.method === "cheque") {
      if (!f.cheque_no.trim()) return setErr("Enter the cheque number.");
      if (!f.cheque_date) return setErr("Enter the cheque date.");
    }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      customer_id: customerId,
      bill_id: billId,
      amount: amt,
      method: f.method,
      cheque_no: f.method === "cheque" ? f.cheque_no.trim() : null,
      cheque_date: f.method === "cheque" ? f.cheque_date : null,
      note: f.note.trim() || null,
      status: f.method === "cheque" ? "pending" : "received",
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setF(EMPTY);
    onSaved?.();
  }

  return (
    <form onSubmit={save}>
      <label className={label}>Payment method</label>
      <Seg<Method>
        value={f.method}
        onChange={(v) => set("method", v)}
        options={[
          { value: "cash", label: "Cash" },
          { value: "cheque", label: "Cheque" },
          { value: "bank", label: "Bank" },
        ]}
      />

      <label className={label}>Amount (Rs.)</label>
      <NumInput placeholder="0.00" value={f.amount} onChange={(v) => set("amount", v)} />
      {maxAmount !== undefined && (
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-brand"
          onClick={() => set("amount", round2(maxAmount).toFixed(2))}
        >
          Full balance: {money(maxAmount)}
        </button>
      )}

      {f.method === "cheque" && (
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <div>
            <label className={label}>Cheque number</label>
            <input
              className={inp}
              inputMode="numeric"
              value={f.cheque_no}
              onChange={(e) => set("cheque_no", e.target.value.replace(/[^\dA-Za-z-]/g, "").slice(0, 20))}
            />
          </div>
          <div>
            <label className={label}>Cheque date</label>
            <input className={inp} type="date" value={f.cheque_date} onChange={(e) => set("cheque_date", e.target.value)} />
          </div>
        </div>
      )}

      <label className={label}>Note (optional)</label>
      <input className={inp} value={f.note} onChange={(e) => set("note", e.target.value)} />

      {err && <p className={`${errBox} mt-3`}>{err}</p>}
      <button className={`${btn("green")} mt-4 w-full sm:w-auto`} disabled={busy}>
        {busy ? "Saving…" : "Add payment"}
      </button>
    </form>
  );
}

export function PaymentList({
  payments,
  customers,
  onChange,
}: {
  payments: Payment[];
  customers?: Record<number, Customer>;
  onChange?: () => void;
}) {
  const today = useToday();

  async function setStatus(id: number, status: Payment["status"]) {
    const { error } = await supabase.from("payments").update({ status }).eq("id", id);
    if (error) return alert(error.message);
    onChange?.();
  }
  async function del(id: number) {
    if (!confirm("Delete this payment?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) return alert(error.message);
    onChange?.();
  }

  if (!payments.length) return <p className={muted}>No payments yet.</p>;

  return (
    <div>
      {payments.map((p) => {
        const depositNow = p.status === "pending" && !!p.cheque_date && !!today && p.cheque_date <= today;
        return (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 py-3 last:border-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <b className="text-base">{money(p.amount)}</b>
                <span className={badge[p.status]}>{p.status}</span>
                {depositNow && <span className={badge.deposit}>Deposit now</span>}
              </div>
              <div className={`${muted} mt-0.5`}>
                <span className="capitalize">{p.method}</span>
                {p.cheque_no ? ` #${p.cheque_no}` : ""}
                {p.cheque_date ? ` · cheque date ${p.cheque_date}` : ""}
                {" · "}
                {String(p.paid_at).slice(0, 10)}
                {customers?.[p.customer_id] ? ` · ${customers[p.customer_id].name}` : ""}
                {p.note ? ` · ${p.note}` : ""}
              </div>
            </div>
            <div className="flex gap-1.5 print:hidden">
              {p.status === "pending" && (
                <>
                  <button className={btn("green", "sm")} onClick={() => setStatus(p.id, "received")}>Cleared</button>
                  <button className={btn("red", "sm")} onClick={() => setStatus(p.id, "returned")}>Returned</button>
                </>
              )}
              <button className={btn("ghost", "sm")} aria-label="Delete payment" onClick={() => del(p.id)}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}