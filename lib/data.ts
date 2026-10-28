import { supabase } from "./supabase";
import type { Balance, Bill, Customer, Payment } from "./types";
import { round2 } from "./num";

export type AllData = {
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
};

export const sum = <T,>(arr: T[], f: (x: T) => number | string) =>
  arr.reduce((s, x) => s + Number(f(x)), 0);

export async function loadAll(): Promise<AllData> {
  const [c, b, p] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("bills").select("*").order("id", { ascending: false }),
    supabase.from("payments").select("*").order("id", { ascending: false }),
  ]);
  return {
    customers: (c.data ?? []) as Customer[],
    bills: (b.data ?? []) as Bill[],
    payments: (p.data ?? []) as Payment[],
  };
}

/**
 * balance = all bills − payments that are actually RECEIVED.
 * Pending cheques are not counted as paid until marked "Cleared".
 */
export function balances(customers: Customer[], bills: Bill[], payments: Payment[]) {
  const out: Record<number, Balance> = {};
  customers.forEach((c) => (out[c.id] = { billed: 0, paid: 0, pending: 0, balance: 0 }));
  bills.forEach((b) => {
    const o = out[b.customer_id];
    if (o) o.billed += Number(b.total);
  });
  payments.forEach((p) => {
    const o = out[p.customer_id];
    if (!o) return;
    if (p.status === "received") o.paid += Number(p.amount);
    if (p.status === "pending") o.pending += Number(p.amount);
  });
  Object.values(out).forEach((o) => (o.balance = o.billed - o.paid));
  return out;
}

export type BillStatus = "paid" | "partial" | "unpaid" | "cheque";

export function billStatus(total: number, received: number, pending: number): BillStatus {
  const EPS = 0.004;
  if (total - received <= EPS) return "paid";
  if (pending > 0 && received + pending >= total - EPS) return "cheque";
  if (received > 0 || pending > 0) return "partial";
  return "unpaid";
}

/** received / pending totals per bill id */
export function paidByBill(payments: Payment[]) {
  const out: Record<number, { received: number; pending: number }> = {};
  payments.forEach((p) => {
    if (p.bill_id == null) return;
    const o = (out[p.bill_id] ??= { received: 0, pending: 0 });
    if (p.status === "received") o.received += Number(p.amount);
    if (p.status === "pending") o.pending += Number(p.amount);
  });
  return out;
}

export async function customerBalance(customerId: number): Promise<number> {
  const [b, p] = await Promise.all([
    supabase.from("bills").select("total").eq("customer_id", customerId),
    supabase.from("payments").select("amount,status").eq("customer_id", customerId),
  ]);
  const billed = sum((b.data ?? []) as { total: number }[], (x) => x.total);
  const paid = sum(
    ((p.data ?? []) as { amount: number; status: string }[]).filter((x) => x.status === "received"),
    (x) => x.amount
  );
  return Math.max(0, round2(billed - paid));
}