"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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

function SlideToDelete({
  onConfirm,
  disabled = false,
}: {
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startProgress = useRef(0);
  const progressRef = useRef(0);
  const draggingRef = useRef(false);

  const [progress, setProgress] = useState(0);
  const [maxTravel, setMaxTravel] = useState(280);

  function updateProgress(value: number) {
    const next = Math.max(0, Math.min(100, value));
    progressRef.current = next;
    setProgress(next);
  }

  useEffect(() => {
    const measure = () => {
      if (railRef.current) {
        setMaxTravel(Math.max(0, railRef.current.clientWidth - 56));
      }
    };

    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || maxTravel <= 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    startX.current = event.clientX;
    startProgress.current = progressRef.current;
    draggingRef.current = true;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current || disabled) return;

    const distance = event.clientX - startX.current;
    const change = (distance / maxTravel) * 100;

    updateProgress(startProgress.current + change);
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    if (progressRef.current >= 95) {
      updateProgress(100);
      onConfirm();
    } else {
      // Reset if the user did not slide far enough.
      updateProgress(0);
    }
  }

  function handlePointerCancel() {
    draggingRef.current = false;
    updateProgress(0);
  }

  const confirmed = progress >= 100;

  return (
    <div className="w-full space-y-2">
      <div
        ref={railRef}
        className={`relative h-14 overflow-hidden rounded-full border transition-colors ${
          confirmed ? "border-red-300 bg-red-50" : "border-stone-300 bg-stone-100"
        } ${disabled ? "opacity-50" : ""}`}
      >
        {/* Centered instruction */}
        <span
          className={`pointer-events-none absolute inset-0 grid place-items-center px-14 text-center text-xs font-bold uppercase tracking-[0.12em] transition-opacity ${
            confirmed ? "text-red-700" : "text-stone-500"
          }`}
        >
          {confirmed ? "Confirmed" : progress > 10 ? "Keep sliding..." : "Slide to delete"}
        </span>

        {/* Draggable handle */}
        <button
          type="button"
          disabled={disabled}
          aria-label="Slide to confirm bill deletion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className={`absolute top-1 grid h-12 w-12 place-items-center rounded-full border shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
            draggingRef.current ? "cursor-grabbing" : "cursor-grab"
          } ${confirmed ? "border-red-600 bg-red-600 text-white" : "border-white bg-white text-red-700"}`}
          style={{
            left: `${4 + (progress / 100) * maxTravel}px`,
            touchAction: "none",
            transition: draggingRef.current ? "none" : "left 180ms ease",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {confirmed ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-stone-500">
        Irreversible action · Slide the handle fully to delete
      </p>
    </div>
  );
}

function BillView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<State | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<"" | "wa" | "save" | "share">("");
  const [msg, setMsg] = useState<Msg>(null);
  const [editing, setEditing] = useState(false);
  const [slideKey, setSlideKey] = useState(0); // bump to reset the slide handle after a failed delete

  const apply = useCallback((r: State | null) => (r ? setD(r) : setMissing(true)), []);
  const load = useCallback(async () => apply(await fetchBill(id)), [id, apply]);
  useEffect(() => {
    fetchBill(id).then(apply);
  }, [id, apply]);

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
    // old balance (saved on the bill when it was created) + thiCurrent Bill's balance
  const previous = Number(b.previous_balance ?? 0);
  const payable = billBalance + previous;
  const customerPending = sum(pays.filter((p) => p.status === "pending"), (p) => p.amount);
  const maxPay = Math.max(0, Math.min(payable - pending, outstanding - customerPending));

  // ---------- PDF (created on this device – nothing is uploaded) ----------
  async function makePdf() {
    const logo = await loadLogo(SHOP.logo).catch(() => null);
    const r = await buildInvoicePdf({ bill: b, customer: c, items, pays: billPays, outstanding, logo });
    return r;
  }
  const lossyNote = (lossy: boolean) =>
    lossy ? " Some characters (e.g. Sinhala/Tamil) can’t be drawn in the PDF – use Print for those." : "";

  async function savePdf() {
    setBusy("save");
    setMsg(null);
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
    setBusy("wa");
    setMsg(null);
    try {
      const { blob, fileName, lossy } = await makePdf();
      saveBlob(blob, fileName);
      const text =
        `Hello ${c.name}, thank you for shopping at ${brandName}.\n` +
        `Your invoice ${no} (PDF) is attached.\n` +
        `Current Bill: ${money(b.total)}` +
        (previous > 0.004 ? ` · Previous Balance: ${money(previous)}` : "") +
        `\nTotal Due: ${money(payable)}`;
      const link = waLink(c.phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`;
      await new Promise((r) => setTimeout(r, 500)); // let the download start first
      const w = window.open(link, "_blank");
      if (!w) window.location.assign(link);
      setMsg({
        type: "ok",
        text: `Saved “${fileName}” to your Downloads folder.${lossyNote(lossy)}\n\nNow opening WhatsApp…`,
      });
    } catch {
      setMsg({ type: "err", text: "Could not create the PDF. Please try again." });
    }
    setBusy("");
  }

  /** Share sheet with the real PDF attached (choose WhatsApp, then the contact). */
  async function sharePdf() {
    setBusy("share");
    setMsg(null);
    try {
      const { blob, fileName, lossy } = await makePdf();
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${no}`, text: `Invoice ${no} – ${brandName}` });
      } else {
        saveBlob(blob, fileName);
        setMsg({
          type: "ok",
          text: `Sharing files isn’t supported here, so “${fileName}” was saved to Downloads.${lossyNote(lossy)}`,
        });
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

  /**
   * Deletes this bill AND its payments.
   * 1. Remove every payment that belongs to this bill (payments.bill_id = b.id).
   * 2. Remove the bill.
   * 3. Navigate back to the home page.
   * If anything fails, the slider is reset so the user can retry.
   */
  async function del() {
    // 1. Delete the bill's payments first.
    if (billPays.length > 0) {
      const { error: payErr } = await supabase
        .from("payments")
        .delete()
        .eq("bill_id", b.id);
      if (payErr) {
        setMsg({ type: "err", text: `Could not delete payments: ${payErr.message}` });
        setSlideKey((k) => k + 1);
        return;
      }
    }

    // 2. Delete the bill.
    const { error } = await supabase.from("bills").delete().eq("id", b.id);
    if (error) {
      setMsg({ type: "err", text: error.message });
      setSlideKey((k) => k + 1);
      return;
    }

    // 3. Navigate away (the page is gone).
    router.push("/");
  }

  const invoice = (
    <Invoice bill={b} customer={c} items={items} pays={billPays} outstanding={outstanding} />
  );

  return (
    <div className="mx-auto w-full max-w-[210mm] print:max-w-none">
      <div className="print:hidden">
        {editing && (
          <section className={card}>
            <h3 className={h3}>Edit customer</h3>
            <CustomerEdit
              customer={c}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                setMsg({ type: "ok", text: "Customer details updated." });
                load();
              }}
            />
          </section>
        )}

        {/* preview (screen only) */}
        <div className="mb-4">
          <A4Preview>{invoice}</A4Preview>
        </div>

        {/* payments */}
        <section className={card}>
          <h3 className={h3}>Payments for Current Bill</h3>
          <PaymentList payments={billPays} onChange={load} />
          <h3 className={`${h3} mt-5`}>Add payment</h3>
          <PaymentForm
            customerId={c.id}
            billId={b.id}
            maxAmount={maxPay}
            onSaved={load}
          />
        </section>

        <section className="mb-3 space-y-2">
          <button
            className={`${btn("wa")} w-full !min-h-12 text-base`}
            onClick={sendWhatsApp}
            disabled={!!busy}
          >
            {busy === "wa" ? "Preparing PDF…" : "Send on WhatsApp"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button className={btn("ghost")} onClick={savePdf} disabled={!!busy}>
              {busy === "save" ? "Saving…" : "Save PDF"}
            </button>
            <button className={btn("ghost")} onClick={sharePdf} disabled={!!busy}>
              {busy === "share" ? "…" : "Share PDF"}
            </button>
            <Link className={btn("ghost", "sm")} href={`/customers/${c.id}`}>
              Customer
            </Link>
          </div>

          {/* Slide-to-delete (replaces the old Delete button) */}
          <div className="pt-2">
            <SlideToDelete
              key={slideKey}
              onConfirm={() => {
                void del();
              }}
              disabled={!!busy}
            />
          </div>

          {msg && (
            <p
              role="status"
              className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                msg.type === "ok"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {msg.text}
            </p>
          )}
        </section>
      </div>

      {/* print / Save-as-PDF output – unchanged A4 layout, only visible when printing */}
      <div className="hidden print:block">{invoice}</div>
    </div>
  );
}