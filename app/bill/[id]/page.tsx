"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { SHOP, brandName, money, billNo, waLink } from "../../../lib/shop";
import { billStatus, sum } from "../../../lib/data";
import { buildInvoicePdf, loadLogo } from "../../../lib/invoicePdf";
import type { Bill, BillItem, Customer, Payment } from "../../../lib/types";
import A4Preview from "../../../components/A4Preview";
import CustomerEdit from "../../../components/CustomerEdit";
import Invoice from "../../../components/Invoice";
import Loading from "../../../components/Loading";
import { PaymentForm, PaymentList } from "../../../components/Payments";
import { btn, card, eyebrow, h3, muted, billStatusUi } from "../../../components/ui";

type BillFull = Bill & { customers: Customer; bill_items: BillItem[] };
type State = { b: BillFull; bills: Pick<Bill, "total">[]; pays: Payment[] };
type Msg = { type: "ok" | "err"; text: string } | null;

// useParams() must live under <Suspense> in Next 16 (Cache Components)
export default function BillPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BillView />
    </Suspense>
  );
}

async function fetchBill(id: string): Promise<State | null> {
  const { data } = await supabase
    .from("bills")
    .select("*, customers(*), bill_items(*)")
    .eq("id", id)
    .single();
  if (!data) return null;
  const b = data as BillFull;
  const [bills, pays] = await Promise.all([
    supabase.from("bills").select("total").eq("customer_id", b.customer_id),
    supabase.from("payments").select("*").eq("customer_id", b.customer_id).order("id"),
  ]);
  return {
    b,
    bills: (bills.data ?? []) as Pick<Bill, "total">[],
    pays: (pays.data ?? []) as Payment[],
  };
}

/** Save a file to the phone / computer (goes to the Downloads folder). */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

function BillView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<State | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<"" | "wa" | "save" | "share">("");
  const [msg, setMsg] = useState<Msg>(null);
  const [editing, setEditing] = useState(false);

  const apply = useCallback((r: State | null) => (r ? setD(r) : setMissing(true)), []);
  const load = useCallback(async () => apply(await fetchBill(id)), [id, apply]);
  useEffect(() => { fetchBill(id).then(apply); }, [id, apply]);

  if (missing) return <p className="p-6 text-center">Bill not found.</p>;
  if (!d) return <Loading />;

  const { b, bills, pays } = d;
  const c = b.customers;
  const no = billNo(b);
  const items = [...b.bill_items].sort((x, y) => x.id - y.id);
  const billPays = pays.filter((p) => p.bill_id === b.id);
  const received = sum(billPays.filter((p) => p.status === "received"), (p) => p.amount);
  const pending = sum(billPays.filter((p) => p.status === "pending"), (p) => p.amount);
  const billBalance = Number(b.total) - received;
  const outstanding =
    sum(bills, (x) => x.total) - sum(pays.filter((p) => p.status === "received"), (p) => p.amount);
  const status = billStatusUi[billStatus(Number(b.total), received, pending)];

  // ---------- PDF (created on this device – nothing is uploaded) ----------
  async function makePdf() {
    const logo = await loadLogo(SHOP.logo).catch(() => null);
    const r = await buildInvoicePdf({ bill: b, customer: c, items, pays: billPays, outstanding, logo });
    return r;
  }
  const lossyNote = (lossy: boolean) =>
    lossy ? " Some characters (e.g. Sinhala/Tamil) can’t be drawn in the PDF – use Print for those." : "";

  async function savePdf() {
    setBusy("save"); setMsg(null);
    try {
      const { blob, fileName, lossy } = await makePdf();
      saveBlob(blob, fileName);
      setMsg({ type: "ok", text: `Saved “${fileName}” to your Downloads folder.${lossyNote(lossy)}` });
    } catch {
      setMsg({ type: "err", text: "Could not create the PDF. Please try again." });
    }
    setBusy("");
  }

  /** Saves the PDF to the phone, then opens THIS customer's WhatsApp chat. */
  async function sendWhatsApp() {
    setBusy("wa"); setMsg(null);
    try {
      const { blob, fileName, lossy } = await makePdf();
      saveBlob(blob, fileName);
      const text =
        `Hello ${c.name}, thank you for shopping at ${brandName}.\n` +
        `Your invoice ${no} (PDF) is attached.\n` +
        `Total: ${money(b.total)} · Balance due: ${money(billBalance)}`;
      const link = waLink(c.phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`;
      await new Promise((r) => setTimeout(r, 500)); // let the download start first
      const w = window.open(link, "_blank");
      if (!w) window.location.assign(link);
      setMsg({
        type: "ok",
        text: `PDF saved to Downloads. In the WhatsApp chat tap  📎  →  Document  →  “${fileName}”.${lossyNote(lossy)}`,
      });
    } catch {
      setMsg({ type: "err", text: "Could not create the PDF. Please try again." });
    }
    setBusy("");
  }

  /** Share sheet with the real PDF attached (choose WhatsApp, then the contact). */
  async function sharePdf() {
    setBusy("share"); setMsg(null);
    try {
      const { blob, fileName, lossy } = await makePdf();
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${no}`, text: `Invoice ${no} – ${brandName}` });
      } else {
        saveBlob(blob, fileName);
        setMsg({ type: "ok", text: `Sharing files isn’t supported here, so “${fileName}” was saved to Downloads.${lossyNote(lossy)}` });
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        setMsg({ type: "err", text: "Could not share the PDF. Try “Save PDF” instead." });
      }
    }
    setBusy("");
  }

  function printPdf() {
    const old = document.title;
    document.title = no; // becomes the PDF file name when you choose “Save as PDF”
    window.print();
    document.title = old;
  }

  async function del() {
    if (billPays.length > 0) {
      return alert("This bill has payments. Delete its payments first, then delete the bill.");
    }
    if (!confirm("Delete this bill?")) return;
    const { error } = await supabase.from("bills").delete().eq("id", b.id);
    if (error) return alert(error.message);
    router.push("/");
  }

  const invoice = <Invoice bill={b} customer={c} items={items} pays={billPays} outstanding={outstanding} />;

  return (
    <div className="mx-auto w-full max-w-[210mm] print:max-w-none">
      <div className="print:hidden">
        {/* summary */}
        <section className={`${card} !mb-3`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={eyebrow}>Invoice</p>
              <h1 className="mt-0.5 break-all text-lg font-bold leading-snug text-ink">{no}</h1>
              <p className="mt-0.5 truncate text-sm text-stone-600">{c.name}</p>
              <p className={muted}>{b.bill_date}</p>
            </div>
            <span className={`${status.cls} shrink-0`}>{status.label}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-stone-200 rounded-xl bg-stone-50 py-2.5 text-center ring-1 ring-stone-200">
            <div className="px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Total</p>
              <p className="mt-0.5 text-[13px] font-bold tabular-nums text-ink sm:text-sm">{money(b.total)}</p>
            </div>
            <div className="px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Paid</p>
              <p className="mt-0.5 text-[13px] font-bold tabular-nums text-emerald-700 sm:text-sm">{money(received)}</p>
            </div>
            <div className="px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Balance</p>
              <p className={`mt-0.5 text-[13px] font-bold tabular-nums sm:text-sm ${billBalance > 0.004 ? "text-red-700" : "text-emerald-700"}`}>
                {money(billBalance)}
              </p>
            </div>
          </div>
        </section>

        {/* actions */}
        <section className="mb-3 space-y-2">
          <button className={`${btn("wa")} w-full !min-h-12 text-base`} onClick={sendWhatsApp} disabled={!!busy}>
            {busy === "wa" ? "Preparing PDF…" : "Send on WhatsApp"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button className={btn("ghost")} onClick={savePdf} disabled={!!busy}>{busy === "save" ? "Saving…" : "Save PDF"}</button>
            <button className={btn("ghost")} onClick={sharePdf} disabled={!!busy}>{busy === "share" ? "…" : "Share PDF"}</button>
            <button className={btn("ghost")} onClick={printPdf} disabled={!!busy}>Print</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className={btn("ghost", "sm")} onClick={() => setEditing((v) => !v)}>{editing ? "Close edit" : "Edit customer"}</button>
            <Link className={btn("ghost", "sm")} href={`/customers/${c.id}`}>Customer</Link>
            <button className={`${btn("ghost", "sm")} !text-red-700`} onClick={del}>Delete bill</button>
          </div>
          {msg && (
            <p
              role="status"
              className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                msg.type === "ok" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {msg.text}
            </p>
          )}
        </section>

        {editing && (
          <section className={card}>
            <h3 className={h3}>Edit customer</h3>
            <CustomerEdit
              customer={c}
              onCancel={() => setEditing(false)}
              onSaved={() => { setEditing(false); setMsg({ type: "ok", text: "Customer details updated." }); load(); }}
            />
          </section>
        )}

        {/* preview (screen only) */}
        <div className="mb-4">
          <A4Preview>{invoice}</A4Preview>
        </div>

        {/* payments */}
        <section className={card}>
          <h3 className={h3}>Payments for this bill</h3>
          <PaymentList payments={billPays} onChange={load} />
          <h3 className={`${h3} mt-5`}>Add payment</h3>
          <PaymentForm
            customerId={c.id}
            billId={b.id}
            maxAmount={Math.max(0, billBalance - pending)}
            onSaved={load}
          />
        </section>
      </div>

      {/* print / Save-as-PDF output – unchanged A4 layout, only visible when printing */}
      <div className="hidden print:block">{invoice}</div>
    </div>
  );
}
