import type { BillStatus } from "../lib/data";

// ---------- layout ----------
export const card =
  "mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(25,18,60,0.05)] sm:p-5";
export const h3 = "mb-3 text-[15px] font-semibold text-ink";
export const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.18em] text-gold";
export const pageTitle = "mb-4 text-2xl font-bold tracking-tight text-ink";
export const muted = "text-sm text-stone-500";

// ---------- forms ----------
export const inp =
  "w-full min-h-12 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base text-ink " +
  "placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";
export const label = "mb-1.5 mt-3 block text-sm font-medium text-stone-600";
export const grid2 = "grid grid-cols-1 gap-x-3 sm:grid-cols-2";
export const errBox =
  "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700";

// ---------- buttons ----------
const variants = {
  brand: "bg-brand text-white shadow-sm hover:bg-brand-dark active:scale-[.98]",
  ghost: "border border-brand/25 bg-white text-brand hover:bg-brand/5 active:scale-[.98]",
  green: "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 active:scale-[.98]",
  red: "bg-red-700 text-white hover:bg-red-800 active:scale-[.98]",
  wa: "bg-[#1fa855] text-white shadow-sm hover:bg-[#188a45] active:scale-[.98]",
};
const sizes = {
  md: "min-h-11 px-4 py-2.5 text-[15px] font-semibold",
  sm: "min-h-9 px-3 py-1.5 text-[13px] font-semibold",
};
export const btn = (
  v: keyof typeof variants = "brand",
  s: keyof typeof sizes = "md"
) =>
  `inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${sizes[s]} ${variants[v]}`;

// ---------- stats ----------
export const stats = "mb-4 grid grid-cols-2 gap-3 md:grid-cols-4";
export const stat =
  "rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(25,18,60,0.05)]";
export const statLabel = "block text-[11px] font-semibold uppercase tracking-wider text-stone-500";

// ---------- lists ----------
export const row =
  "flex items-center justify-between gap-3 border-b border-stone-100 py-3 last:border-0 active:bg-stone-50";
export const due = "font-bold tabular-nums text-red-700";
export const ok = "font-bold tabular-nums text-emerald-700";

// ---------- badges ----------
const pill = "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide";
export const badge: Record<"received" | "pending" | "returned" | "deposit", string> = {
  received: `${pill} bg-emerald-100 text-emerald-800`,
  pending: `${pill} bg-amber-100 text-amber-800`,
  returned: `${pill} bg-red-100 text-red-800`,
  deposit: `${pill} bg-brand text-white`,
};

export const billStatusUi: Record<BillStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: `${pill} bg-emerald-100 text-emerald-800` },
  partial: { label: "Partial", cls: `${pill} bg-amber-100 text-amber-800` },
  unpaid: { label: "Unpaid", cls: `${pill} bg-red-100 text-red-800` },
  cheque: { label: "Cheque pending", cls: `${pill} bg-sky-100 text-sky-800` },
};
